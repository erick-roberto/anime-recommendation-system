from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from backend.db.session import get_db
from backend.services.recommender import recommend_users_based
from backend.models.anime import Anime
from backend.schemas.anime import AnimeCardResponse

recommendation_router = APIRouter(prefix="/recomendacoes", tags=["recomendacoes"])


# 1. TOP 10 MELHORES
@recommendation_router.get("/top-rated", response_model=List[AnimeCardResponse])
def get_top_rated_animes(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    stmt = (
        select(
            Anime.anime_id,
            Anime.name,
            Anime.genre,
            Anime.type,
            Anime.rating.label("score"),
            Anime.members
        )
        .where(Anime.members > 10000, Anime.rating.isnot(None))
        .order_by(desc(Anime.rating))
        .limit(limit)
    )
    rows = db.execute(stmt).mappings().all()
    # Converte explicitamente cada RowMapping para dict
    return [dict(row) for row in rows]


# 2. MAIS POPULARES
@recommendation_router.get("/populares", response_model=List[AnimeCardResponse])
def get_popular_animes(
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db)
):
    stmt = (
        select(
            Anime.anime_id,
            Anime.name,
            Anime.genre,
            Anime.type,
            Anime.rating.label("score"),
            Anime.members
        )
        .where(Anime.members.isnot(None))
        .order_by(desc(Anime.members))
        .limit(limit)
    )
    rows = db.execute(stmt).mappings().all()
    return [dict(row) for row in rows]


# 3. FILMES CONSAGRADOS
@recommendation_router.get("/movies", response_model=List[AnimeCardResponse])
def get_top_movies(
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db)
):
    stmt = (
        select(
            Anime.anime_id,
            Anime.name,
            Anime.genre,
            Anime.type,
            Anime.rating.label("score"),
            Anime.members
        )
        .where(Anime.type == "Movie")
        .order_by(desc(Anime.members))
        .limit(limit)
    )
    rows = db.execute(stmt).mappings().all()
    return [dict(row) for row in rows]

# SEÇÃO: SHONEN & AÇÃO EM ALTA (deve vir ANTES de /{usuario_alvo})
@recommendation_router.get("/shonen", response_model=List[AnimeCardResponse])
def get_shonen_animes(
    limit: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db)
):
    stmt = (
        select(
            Anime.anime_id,
            Anime.name,
            Anime.genre,
            Anime.type,
            Anime.rating.label("score"),
            Anime.members
        )
        .where(
            Anime.genre.isnot(None),
            (Anime.genre.ilike("%Action%")) | (Anime.genre.ilike("%Shounen%")),
            Anime.members.isnot(None)
        )
        .order_by(desc(Anime.members))
        .limit(limit)
    )
    rows = db.execute(stmt).mappings().all()
    return [dict(row) for row in rows]


# 4. RECOMENDAÇÕES DO KNN (Rota dinâmica sempre por último!)
@recommendation_router.get("/{usuario_alvo}", response_model=List[AnimeCardResponse])
def get_recommendations_for_user(
    usuario_alvo: int, 
    session: Session = Depends(get_db)
):
    recomendacoes = recommend_users_based(usuario_alvo=usuario_alvo, session=session)
    return recomendacoes