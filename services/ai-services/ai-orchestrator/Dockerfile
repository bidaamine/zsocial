# AI Life Orchestrator — container image
FROM python:3.13-slim

WORKDIR /app

# Install deps first for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 4700

# In-memory service; no DB migrations needed. Point AI_MODEL_ROUTER_URL at the router.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "4700"]
