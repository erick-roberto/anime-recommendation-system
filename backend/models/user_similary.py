from sqlalchemy import Column, Integer, Float
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class UserSimilarity(Base):
    __tablename__ = "user_similarity"

    usuario_1 = Column(Integer, primary_key=True)
    usuario_2 = Column(Integer, primary_key=True)
    similaridade = Column(Float, nullable=False)