# Modelos Pydantic (Validação de I/O)
# backend/schemas/anime.py
from pydantic import BaseModel
from typing import Optional

class AnimeCardResponse(BaseModel):
    anime_id: int
    name: str
    genre: Optional[str] = None
    type: Optional[str] = None
    score: Optional[float] = None
    members: Optional[int] = None
    image_url: Optional[str] = None

    class Config:
        from_attributes = True