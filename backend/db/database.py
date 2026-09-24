# configura a conexão/engine com o SQLite
from sqlalchemy import create_engine


DATABASE_URL = "sqlite:///./data/anime.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)


