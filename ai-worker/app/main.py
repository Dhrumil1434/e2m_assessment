import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app.routers import analyze, health, render, segment

app = FastAPI(title="E2M AI Worker", version="1.0.0")
app.include_router(health.router)
app.include_router(analyze.router)
app.include_router(segment.router)
app.include_router(render.router)


@app.get("/")
def root():
    return {
        "service": "e2m-ai-worker",
        "stub_mode": os.getenv("AI_WORKER_STUB_MODE", "true").lower() == "true",
    }
