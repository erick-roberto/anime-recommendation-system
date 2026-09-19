# Configuração da engine do SQLAlchemy para o SQLite
# cria e fornece sessões para conversar com o banco

from sqlalchemy.orm import sessionmaker
from db.database import engine

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
