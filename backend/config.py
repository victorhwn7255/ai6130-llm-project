from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Models
    ollama_base_url: str = "http://ollama:11434"
    ollama_model: str = "phi3:3.8b-mini-instruct-4k-q4_K_M"
    openai_api_key: str = ""
    cloud_model: str = "gpt-4o-mini"
    judge_model: str = "gpt-4o-mini"

    # Router
    router_model_path: str = "data/models/distilbert_router"
    routing_threshold: float = 0.7

    # Cost (per 1M tokens)
    cloud_input_cost_per_1m: float = 0.15
    cloud_output_cost_per_1m: float = 0.60

    # Database
    database_url: str = "sqlite+aiosqlite:///data/routing_logs.db"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
