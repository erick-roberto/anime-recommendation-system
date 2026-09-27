# comando: uv run uvicorn main:app --reload

# OU uv run fastapi dev

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Anime Recommendation System API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Porta padrão do Vite
        "http://127.0.0.1:5173",
        "http://localhost:3000",  # Porta padrão do Create React App
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.api.routes.animes import router as anime_router
from backend.api.routes.recommendations import recommendation_router
from backend.api.routes.auth import router as auth_router

# incluindo as rotas na aplicação
app.include_router(anime_router)
app.include_router(recommendation_router)
app.include_router(auth_router)

@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "API operacional"}

