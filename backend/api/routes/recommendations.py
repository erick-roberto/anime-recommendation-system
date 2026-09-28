# Endpoint que retorna as recomendações

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.services.recommender import recommend_users_based


recommendation_router = APIRouter(prefix="/recomendacoes", tags=["recomendacoes"])

@recommendation_router.get("/{usuario_alvo}")
async def recommendations(usuario_alvo: int, session: Session = Depends(get_db)):
    recomendacoes = recommend_users_based(usuario_alvo, session)

    return recomendacoes


