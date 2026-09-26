from pathlib import Path
from sqlalchemy import create_engine


BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_URL = f"sqlite:///{BASE_DIR / 'data' / 'anime.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)


