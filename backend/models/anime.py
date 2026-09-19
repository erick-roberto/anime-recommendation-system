# Tabela baseada em anime.csv
'''
anime_id INTEGER 
name TEXT,
genre TEXT,
type TEXT,
episodes TEXT,
rating REAL,
members INTEGER

'''
from sqlalchemy import Column, Integer, Text, REAL
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Anime(Base):

    __tablename__ = "anime"

    anime_id = Column("anime_id", Integer, primary_key=True)
    name = Column("name", Text)
    genre = Column("genre", Text)
    type = Column("type", Text)
    episodes = Column("episodes", Text)
    rating = Column("rating", REAL)
    members = Column("members", Integer)

