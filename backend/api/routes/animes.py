# backend/api/routes/ratings.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Query, Session
from sqlalchemy import select, desc

from backend.db.session import get_db
from backend.models.user import User
from backend.models.rating import Rating
from backend.models.anime import Anime
from backend.schemas.anime import AnimeCardResponse
from backend.schemas.rating import RatingCreate, UserRatedAnimeResponse
from backend.api.dependencies import get_current_user

router = APIRouter(prefix="/users/me/ratings", tags=["User Ratings"])

@router.get("/search", response_model=List[AnimeCardResponse])
def search_animes(
    q: str = "",
    db: Session = Depends(get_db)
):
    stmt = (
        select(Anime)
        .where(Anime.name.ilike(f"%{q}%"))
        .order_by(Anime.members.desc().nullslast())
        .limit(8)
    )
    return db.execute(stmt).scalars().all()


@router.get("", response_model=List[UserRatedAnimeResponse])
def get_user_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos os animes avaliados pelo usuário autenticado,
    fazendo join com a tabela de animes para retornar os dados visuais.
    """
    results = (
        db.query(
            Rating.anime_id,
            Anime.name,
            Anime.genre,
            Anime.type,
            Rating.rating.label("userRating"),
            Anime.image_url
        )
        .join(Anime, Rating.anime_id == Anime.anime_id)
        .filter(Rating.user_id == current_user.user_id)
        .all()
    )

    return [
        UserRatedAnimeResponse(
            anime_id=r.anime_id,
            name=r.name,
            genre=r.genre,
            type=r.type,
            userRating=r.userRating,
            image_url=r.image_url
        )
        for r in results
    ]


@router.put("/{anime_id}", status_code=status.HTTP_200_OK)
def upsert_user_rating(
    anime_id: int,
    rating_in: RatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Avalia um anime ou atualiza a nota existente (Upsert).
    """
    # 1. Verifica se o anime existe no catálogo
    anime = db.query(Anime).filter(Anime.anime_id == anime_id).first()
    if not anime:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anime não encontrado no catálogo"
        )

    # 2. Verifica se o usuário já avaliou esse anime
    existing_rating = (
        db.query(Rating)
        .filter(Rating.user_id == current_user.user_id, Rating.anime_id == anime_id)
        .first()
    )

    if existing_rating:
        existing_rating.rating = rating_in.rating
    else:
        new_rating = Rating(
            user_id=current_user.user_id,
            anime_id=anime_id,
            rating=rating_in.rating
        )
        db.add(new_rating)

    db.commit()

    return {
        "message": "Avaliação salva com sucesso",
        "anime_id": anime_id,
        "rating": rating_in.rating
    }


@router.delete("/{anime_id}", status_code=status.HTTP_200_OK)
def delete_user_rating(
    anime_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Remove uma avaliação do usuário.
    """
    rating_entry = (
        db.query(Rating)
        .filter(Rating.user_id == current_user.user_id, Rating.anime_id == anime_id)
        .first()
    )

    if not rating_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Avaliação não encontrada"
        )

    db.delete(rating_entry)
    db.commit()

    return {"message": "Avaliação removida com sucesso"}

