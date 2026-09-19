from db.session import SessionLocal
from models.rating import Rating


db = SessionLocal()

try:
    rating = db.query(Rating).first()

    print("Usuário:", rating.user_id)
    print("Anime:", rating.anime_id)
    print("Nota:", rating.rating)

finally:
    db.close()