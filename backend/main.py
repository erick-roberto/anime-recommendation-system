# comando: uv run uvicorn main:app --reload

from fastapi import FastAPI

app = FastAPI()

from api.routes.animes import anime_router
from api.routes.recommendations import recommendation_router

# incluindo as rotas na aplicação
app.include_router(anime_router)
app.include_router(recommendation_router)

