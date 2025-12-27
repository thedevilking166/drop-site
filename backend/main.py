from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from pymongo import MongoClient
from jose import jwt, JWTError
from datetime import datetime, timedelta
import bcrypt
import os
from dotenv import load_dotenv
from bson import ObjectId

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

class UpdateStageRequest(BaseModel):
    stage: str

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
    stage: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Invalid collection")

    query = {}
    if stage and stage != "all":
        query["stage"] = stage

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

@app.put("/urls/{url_id}")
async def update_url_stage(
    url_id: str,
    payload: UpdateStageRequest,
    collection: str = Query("new-posts")
):
    if collection not in ALLOWED_COLLECTIONS:
        raise HTTPException(status_code=400, detail="Invalid collection")

    if not ObjectId.is_valid(url_id):
        raise HTTPException(status_code=400, detail="Invalid URL ID")

    result = db[collection].update_one(
        {"_id": ObjectId(url_id)},
        {"$set": {"stage": payload.stage}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="URL not found")

    return {
        "success": True,
        "id": url_id,
        "stage": payload.stage
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)