import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Service settings
    PORT: int = int(os.getenv("PORT", "4703"))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    ENV: str = os.getenv("ENV", "local")
    
    # Model Provider API Keys
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Audit observability service URL or Event bus settings
    AUDIT_SERVICE_URL: str = os.getenv("AUDIT_SERVICE_URL", "http://localhost:4109")
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    
    # Default Routing rules (e.g. timeout settings)
    REQUEST_TIMEOUT_SEC: float = float(os.getenv("REQUEST_TIMEOUT_SEC", "10.0"))

settings = Settings()
