"""Empty FastAPI app: only a health check for now."""

from fastapi import FastAPI

app = FastAPI(title="English Tutor")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
