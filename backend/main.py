from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, Literal
import asyncpg
import bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection pool
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET = os.getenv("JWT_SECRET")
ALLOWED_TABLES = {"new-posts", "new-p-posts"}

security = HTTPBearer()

# Global connection pool
db_pool = None


@app.on_event("startup")
async def startup():
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, ssl="require")


@app.on_event("shutdown")
async def shutdown():
    await db_pool.close()


# Pydantic models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    admin: dict


class URLResponse(BaseModel):
    items: list
    total: int
    page: int
    limit: int
    pages: int


# Helper functions
async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token for protected routes"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:  # Changed from jwt.ExpiredSignatureError
        raise HTTPException(status_code=401, detail="Invalid or expired token")


# Background task example
async def update_last_login(admin_id: int):
    """Background task to update last login time"""
    async with db_pool.acquire() as conn:
        await conn.execute(
            "UPDATE admins SET last_login_at = now() WHERE id = $1",
            admin_id
        )


# Routes
@app.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, background_tasks: BackgroundTasks):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, email, password_hash, role, is_active
                FROM admins
                WHERE email = $1
                LIMIT 1
                """,
                data.email
            )

        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        if not row["is_active"]:
            raise HTTPException(status_code=403, detail="Account disabled")

        # Verify password
        password_valid = bcrypt.checkpw(
            data.password.encode('utf-8'),
            row["password_hash"].encode('utf-8')
        )
        
        if not password_valid:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Create JWT token
        token = jwt.encode(
            {
                "adminId": str(row["id"]),
                "email": row["email"],
                "role": row["role"],
                "exp": datetime.utcnow() + timedelta(days=1)
            },
            JWT_SECRET,
            algorithm="HS256"
        )

        # Update last login in background
        background_tasks.add_task(update_last_login, row["id"])

        return {
            "token": token,
            "admin": {
                "id": row["id"],
                "email": row["email"],
                "role": row["role"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"LOGIN ERROR: {e}")
        raise HTTPException(status_code=500, detail="Login failed")


@app.get("/urls", response_model=URLResponse)
async def get_urls(
    collection: str = Query("new-posts"),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    if collection not in ALLOWED_TABLES:
        raise HTTPException(status_code=400, detail="Invalid collection")

    offset = (page - 1) * limit
    
    where_clause = ""
    params = []
    
    if status and status != "all":
        where_clause = "WHERE status = $1"
        params.append(status)

    # Build queries
    params_items = params + [limit, offset]
    items_query = f"""
        SELECT *
        FROM "{collection}"
        {where_clause}
        LIMIT ${len(params) + 1}
        OFFSET ${len(params) + 2}
    """
    
    count_query = f"""
        SELECT COUNT(*)
        FROM "{collection}"
        {where_clause}
    """

    async with db_pool.acquire() as conn:
        items = await conn.fetch(items_query, *params_items)
        total_row = await conn.fetchrow(count_query, *params)
        total = total_row["count"]

    return {
        "items": [dict(item) for item in items],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@app.delete("/urls/{url_id}")
async def delete_url(
    url_id: int,
    collection: str = Query("new-posts")
):
    if collection not in ALLOWED_TABLES:
        raise HTTPException(status_code=400, detail="Invalid collection")

    async with db_pool.acquire() as conn:
        result = await conn.execute(
            f'DELETE FROM "{collection}" WHERE id = $1',
            url_id
        )

    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Not found")

    return {"success": True}

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)