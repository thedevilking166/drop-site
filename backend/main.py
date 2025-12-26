from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from pymongo import MongoClient
from jose import jwt, JWTError
import requests
from datetime import datetime, timedelta
import bcrypt
import os
from dotenv import load_dotenv
from bson import ObjectId
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger("extract_url_task")
logger.setLevel(logging.INFO)
# Optional: add file handler to save logs to a file
file_handler = logging.FileHandler("extract_url_task.log")
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ENV
MONGODB_URI = os.getenv("MONGODB_URI")
JWT_SECRET = os.getenv("JWT_SECRET")

ALLOWED_COLLECTIONS = {"new-posts", "new-p-posts", "old-posts", "new-s-posts", "new-o-posts"}

security = HTTPBearer()

client = MongoClient(MONGODB_URI)
db = client["drop-db"]

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str

class URLResponse(BaseModel):
    items: list
    total: int
    page: int
    limit: int
    pages: int

async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=["HS256"]
        )
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def update_last_login(admin_id: ObjectId):
    db.admins.update_one(
        {"_id": admin_id},
        {"$set": {"last_login_at": datetime.utcnow()}}
    )

def extract_url_task(url_id: int, collection: str):
    try:
        obj_id = ObjectId(url_id)
    except Exception as e:
        logger.error(f"Invalid URL ID {url_id}: {e}")
        return

    doc = db[collection].find_one({"_id": obj_id})
    if not doc:
        logger.warning(f"Document not found for ID {url_id} in collection {collection}")
        return

    if not doc.get("post_url"):
        logger.warning(f"No post_url found for document {url_id}")
        db[collection].update_one({"_id": obj_id}, {"$set": {"stage": "error"}})
        return

    logger.info(f"Starting extraction for URL ID {url_id}: {doc['post_url']}")
    try:
        res = requests.get(doc["post_url"], timeout=10)
        res.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Request failed for URL ID {url_id}: {e}")
        db[collection].update_one({"_id": obj_id}, {"$set": {"stage": "error"}})
        return

    soup = BeautifulSoup(res.text, "html.parser")
    main = soup.find("div", class_="cPost_contentWrap")

    if not main:
        logger.warning(f"Main content div not found for URL ID {url_id}")
        db[collection].update_one({"_id": obj_id}, {"$set": {"stage": "error"}})
        return

    links = [a["href"] for a in main.find_all("a", href=True)]
    images = [img.get("data-src") or img.get("src") for img in main.find_all("img", class_="ipsImage") if img.get("data-src") or img.get("src")]

    db[collection].update_one(
        {"_id": obj_id},
        {
            "$set": {
                "extracted_links": links,
                "extracted_images": images,
                "stage": "extracted",
                "extracted_at": datetime.utcnow(),
            }
        }
    )
    logger.info(f"Extraction completed for URL ID {url_id}: {len(links)} links, {len(images)} images")

@app.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, background_tasks: BackgroundTasks):
    admin = db.admins.find_one({"email": data.email})

    if not admin or not bcrypt.checkpw(
        data.password.encode(),
        admin["password_hash"].encode()
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not admin.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account disabled")

    token = jwt.encode(
        {
            "adminId": str(admin["_id"]),
            "email": admin["email"],
            "role": admin["role"],
            "exp": datetime.utcnow() + timedelta(days=1),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    background_tasks.add_task(update_last_login, admin["_id"])

    return {"token": token}


@app.get("/urls", response_model=URLResponse)
async def get_urls(
    collection: str = Query("new-posts"),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Invalid collection")

    query = {}
    if status and status != "all":
        query["stage"] = status

    skip = (page - 1) * limit

    cursor = (
        db[collection]
        .find(query)
        .skip(skip)
        .limit(limit)
        .sort("id", -1)
    )

    items = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        items.append(doc)

    total = db[collection].count_documents(query)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@app.delete("/urls/{url_id}")
async def delete_url(url_id: str, collection: str = Query("new-posts")):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Invalid collection")

    result = db[collection].delete_one({"_id": ObjectId(url_id)})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")

    return {"success": True}

@app.post("/urls/extract")
async def reprocess_url(
    url_id: str,
    background_tasks: BackgroundTasks,
    collection: str = Query("new-posts"),
):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Invalid collection")
    
    try:
        obj_id = ObjectId(url_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL ID")

    doc = db[collection].find_one({"_id": obj_id})
    if not doc:
        raise HTTPException(status_code=404, detail="URL not found")
    
    if doc.get("stage") in {"extracting", "extracted", "complete"}:
        return {"success": True, "message": "Already extracting or processed"}

    db[collection].update_one(
        {"_id": obj_id},
        {"$set": {"stage": "extracting"}}
    )

    background_tasks.add_task(extract_url_task, obj_id, collection)

    return {"success": True, "message": "Extraction started"}

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)