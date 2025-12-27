import os
from pathlib import Path
import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB configuration
MONGODB_URI =  "mongodb+srv://admin:7PgahMfHEcrEtUP7@cluster0.j7wrwox.mongodb.net/?appName=Cluster0"
DB_NAME = "drop-db"  # your DB name
COLLECTION = "new-posts"  # collection containing URLs

# Next.js public assets folder
PUBLIC_ASSETS_PATH = Path(__file__).parent / "public" / "assets"
PUBLIC_ASSETS_PATH.mkdir(parents=True, exist_ok=True)

def download_thumbnails():
    client = MongoClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION]

    # Fetch first 10 documents with a thumbnail URL
    docs = collection.find({"thumb_url": {"$exists": True}}).limit(10)

    for doc in docs:
        topic_id = doc.get("topic_id") or str(doc.get("_id"))
        thumb_url = doc.get("thumb_url")

        if not thumb_url:
            print(f"Skipping {topic_id}, no thumbnail URL")
            continue
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                              "AppleWebKit/537.36 (KHTML, like Gecko) "
                              "Chrome/118.0.0.0 Safari/537.36"
            }
            response = requests.get(thumb_url, headers=headers, timeout=10)
            response.raise_for_status()

            file_path = PUBLIC_ASSETS_PATH / f"{topic_id}_thumb.jpg"
            with open(file_path, "wb") as f:
                f.write(response.content)

            print(f"Downloaded thumbnail for topic_id {topic_id}")

        except requests.RequestException as e:
            print(f"Failed to download thumbnail for {topic_id}: {e}")

    client.close()

if __name__ == "__main__":
    download_thumbnails()