# Endpoint que retorna as recomendações

from fastapi import APIRouter, Depends
from backend.db.session import get_db
from sqlalchemy.orm import Session

recommendation_router = APIRouter(prefix="/recomendacoes", tags=["recomendacoes"])

@recommendation_router.get("/")
async def recommendations():
    return {"mensagem": "Você acessou a rota de recomendações"}



