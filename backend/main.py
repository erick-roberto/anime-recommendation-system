# comando: uv run uvicorn main:app --reload

from fastapi import FastAPI

app = FastAPI(
    title="Anime Recommendation System API",
    version="1.0.0"
)

from backend.api.routes.animes import anime_router
from backend.api.routes.recommendations import recommendation_router
from backend.api.routes.auth import router as auth_router

# incluindo as rotas na aplicação
app.include_router(anime_router)
app.include_router(recommendation_router)
app.include_router(auth_router)

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "API operacional"}

