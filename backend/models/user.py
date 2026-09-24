# Tabela de Usuários (nova)

from sqlalchemy import Column, Integer, Text
from sqlalchemy.orm import declarative_base


Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    user_id = Column("user_id", Integer, primary_key=True, autoincrement=True)
    username = Column("username", Text, unique=True, nullable=False, index=True)
    email = Column("email", Text, unique=True, nullable=False, index=True)
    password_hash = Column("password_hash", Text, nullable=False)
