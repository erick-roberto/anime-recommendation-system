# Tabela baseada em rating.csv
'''
user_id INTEGER,
anime_id INTEGER
rating REAL
PRIMARY KEY (user_id, anime_id),
FOREIGN KEY (anime_id) REFERENCES anime(anime_id)
'''

from sqlalchemy import Column, Integer, REAL, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Rating(Base):

    __tablename__ = "ratings"

    user_id = Column("user_id", Integer, primary_key=True)
    anime_id = Column("anime_id", Integer,ForeignKey("anime.anime_id") ,primary_key=True)
    rating = Column("rating", REAL)

