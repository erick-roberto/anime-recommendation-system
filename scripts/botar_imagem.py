import os
import sys
from pathlib import Path
import html
import re
import time
import requests
from sqlalchemy import Column, Integer, String, create_engine, select, update
from sqlalchemy.orm import declarative_base, sessionmaker

DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "data" / "anime.db"

Base = declarative_base()

class Anime(Base):
    __tablename__ = "anime"
    anime_id = Column(Integer, primary_key=True)
    name = Column(String)
    members = Column(Integer)
    image_url = Column(String, nullable=True)

ANILIST_URL = "https://graphql.anilist.co"

# Query de busca textual no AniList
SEARCH_QUERY = """
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    coverImage {
      large
    }
  }
}
"""

def sanitizar_titulo(nome: str) -> str:
    if not nome:
        return ""
    # Decodifica entidades HTML: &#039; -> '
    limpo = html.unescape(nome)
    # Remove marcações de formato: (TV), (Movie), (OVA), (ONA), (Special)
    limpo = re.sub(r"\((TV|Movie|OVA|ONA|Special)\)", "", limpo, flags=re.IGNORECASE)
    # Remove caracteres especiais pesados que quebram busca
    limpo = re.sub(r"[_/\\#]", " ", limpo)
    return limpo.strip()

def resgatar_capas(batch_limit=500):
    if not DB_PATH.exists():
        print(f"Erro: Banco não encontrado em: {DB_PATH}")
        return

    engine = create_engine(f"sqlite:///{DB_PATH}")
    Session = sessionmaker(bind=engine)
    session = Session()

    # Busca os animes que estão sem capa ou marcados como NOT_FOUND
    stmt = (
        select(Anime)
        .where((Anime.image_url.is_(None)) | (Anime.image_url == "") | (Anime.image_url == "NOT_FOUND"))
        .order_by(Anime.members.desc().nullslast())
        .limit(batch_limit)
    )
    animes_pendentes = session.execute(stmt).scalars().all()
    total = len(animes_pendentes)

    print(f"=== Iniciando Resgate de Capas ({total} itens nesta rodada) ===")

    recuperados = 0
    headers = {"Content-Type": "application/json", "Accept": "application/json"}

    try:
        for idx, anime in enumerate(animes_pendentes, start=1):
            nome_busca = sanitizar_titulo(anime.name)
            sucesso = False

            while not sucesso:
                try:
                    res = requests.post(
                        ANILIST_URL,
                        json={"query": SEARCH_QUERY, "variables": {"search": nome_busca}},
                        headers=headers,
                        timeout=10
                    )

                    if res.status_code == 429:
                        retry_after = int(res.headers.get("Retry-After", 10))
                        print(f"Rate limit atingido. Aguardando {retry_after}s...")
                        time.sleep(retry_after)
                        continue

                    if res.status_code == 200:
                        media = res.json().get("data", {}).get("Media")
                        if media and media.get("coverImage", {}).get("large"):
                            anime.image_url = media["coverImage"]["large"]
                            recuperados += 1
                            print(f"[{idx}/{total}] RECUPERADO: {anime.name}")
                        else:
                            # Se não achar nem pelo nome, marca para não travar
                            anime.image_url = "DEFINITIVE_NOT_FOUND"
                            print(f"[{idx}/{total}] Não encontrado: {anime.name}")
                        sucesso = True
                    else:
                        anime.image_url = "DEFINITIVE_NOT_FOUND"
                        sucesso = True

                except requests.RequestException as e:
                    print(f"Erro de conexão em {anime.name}: {e}. Retentando...")
                    time.sleep(2)

            # Comita a cada 20 animes para não perder progresso
            if idx % 20 == 0:
                session.commit()

            # Respeita o limite do AniList (~1 req por 0.8s)
            time.sleep(0.7)

        session.commit()
        print(f"\nResgate finalizado: {recuperados}/{total} animes recuperados com sucesso!")

    except KeyboardInterrupt:
        print("\nInterrompido manualmente. Progresso salvo.")
        session.commit()
    finally:
        session.close()

if __name__ == "__main__":
    resgatar_capas(batch_limit=5000)