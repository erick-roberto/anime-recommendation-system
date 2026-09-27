# backend/schemas/rating.py
from pydantic import BaseModel, Field
from typing import Optional

class RatingCreate(BaseModel):
    # Aceita qualquer valor de 0 a 10 (inteiro ou decimal)
    rating: float = Field(..., ge=0.0, le=10.0, description="Nota dada pelo usuário (0 a 10)")

class UserRatedAnimeResponse(BaseModel):
    anime_id: int
    name: str
    genre: Optional[str] = None
    type: Optional[str] = None
    userRating: float

    class Config:
        from_attributes = True