from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_prefix: str = "/api/v1"
    app_title: str = "TaskFlow API"
    host: str = "127.0.0.1"
    port: int = 8000
    config_dir: str | None = Field(default=None, alias="TASKFLOW_CONFIG_DIR")
    database_url: str | None = Field(default=None, alias="TASKFLOW_DATABASE_URL")
    db_startup_retry_attempts: int = Field(default=3, alias="TASKFLOW_DB_STARTUP_RETRY_ATTEMPTS")
    db_startup_retry_backoff_seconds: float = Field(default=0.5, alias="TASKFLOW_DB_STARTUP_RETRY_BACKOFF_SECONDS")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
