# backend/models/__init__.py
from backend.models.user import User
from backend.models.rating import Rating
from backend.models.anime import Anime  # certifique-se de que Anime também herda de db.session.Base

__all__ = ["User", "Rating", "Anime"]