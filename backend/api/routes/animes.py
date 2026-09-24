# Busca de animes e envio de notas
from fastapi import APIRouter, Depends
from backend.db.session import get_db
from sqlalchemy.orm import Session
from backend.models.anime import Anime

anime_router = APIRouter(prefix="/animes", tags=["Animes"])

@anime_router.get("/")
async def animes():
    return {"mensagem": "Você acessou a rota de animes"}

@anime_router.get("/listar")
def listar_animes(db: Session = Depends(get_db)):
    animes = db.query(Anime).limit(10).all()
    return animes

