import os
import sys
from pathlib import Path
import time
import requests
from sqlalchemy import Column, Integer, String, create_engine, func, select
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Configurações de Acesso
# Substitua pelo Client ID obtido no painel de desenvolvedor do MAL
MAL_CLIENT_ID = "f56225d93df87fffaa620b398b1b3a54" 

DB_PATH = Path(__file__).resolve().parent.parent / "backend" / "data" / "anime.db"

Base = declarative_base()

class Anime(Base):
    __tablename__ = "anime"

    anime_id = Column(Integer, primary_key=True)
    name = Column(String)
    members = Column(Integer)
    image_url = Column(String, nullable=True)

MAL_API_URL = "https://api.myanimelist.net/v2/anime"

def resgatar_com_mal_oficial(batch_limit=None):
    if MAL_CLIENT_ID == "SEU_CLIENT_ID_AQUI":
        print("[ERRO] Defina o seu MAL_CLIENT_ID antes de rodar o script!")
        return

    if not DB_PATH.exists():
        print(f"[ERRO] Banco não encontrado em: {DB_PATH}")
        return

    engine = create_engine(f"sqlite:///{DB_PATH}")
    Session = sessionmaker(bind=engine)
    session = Session()

    # Busca apenas os marcados como DEFINITIVE_NOT_FOUND, NOT_FOUND ou vazios
    stmt = (
        select(Anime)
        .where(
            (Anime.image_url == "DEFINITIVE_NOT_FOUND")
        )
        .order_by(Anime.members.desc().nullslast())
    )

    if batch_limit:
        stmt = stmt.limit(batch_limit)

    animes_pendentes = session.execute(stmt).scalars().all()
    total = len(animes_pendentes)

    print("=== Resgate Oficial com MyAnimeList API v2 ===")
    print(f"Banco conectado: {DB_PATH}")
    print(f"Animes para resgatar: {total}\n")

    if total == 0:
        print("Nenhum anime pendente encontrado!")
        return

    headers = {
        "X-MAL-CLIENT-ID": MAL_CLIENT_ID,
        "User-Agent": "AnimeRecsRescuer/1.0"
    }

    recuperados = 0
    nao_existentes = 0

    try:
        for idx, anime in enumerate(animes_pendentes, start=1):
            url = f"{MAL_API_URL}/{anime.anime_id}?fields=main_picture"
            sucesso = False

            while not sucesso:
                try:
                    res = requests.get(url, headers=headers, timeout=10)

                    # Tratamento de Rate Limit do MAL (Geralmente 429)
                    if res.status_code == 429:
                        print("\n[429 Rate Limit MAL] Aguardando 10 segundos...")
                        time.sleep(10)
                        continue

                    if res.status_code == 200:
                        data = res.json()
                        pic = data.get("main_picture", {})
                        img_url = pic.get("large") or pic.get("medium")

                        if img_url:
                            anime.image_url = img_url
                            recuperados += 1
                            print(f"[{idx}/{total}] SUCESSO: {anime.name}")
                        else:
                            anime.image_url = "MAL_NO_IMAGE"
                            print(f"[{idx}/{total}] SEM IMAGEM NO MAL: {anime.name}")

                        sucesso = True

                    elif res.status_code == 404:
                        # O ID foi removido/deletado do catálogo do MyAnimeList
                        anime.image_url = "MAL_DELETED"
                        nao_existentes += 1
                        print(f"[{idx}/{total}] 404 DELETADO/INEXISTENTE: {anime.name}")
                        sucesso = True

                    elif res.status_code in (401, 403):
                        print(f"\n[ERRO DE AUTENTICAÇÃO {res.status_code}] Verifique seu X-MAL-CLIENT-ID.")
                        return

                    else:
                        print(f"[{idx}/{total}] HTTP {res.status_code} em {anime.name}. Marcando provisório.")
                        sucesso = True

                except requests.RequestException as e:
                    print(f"Falha de rede em {anime.name}: {e}. Retentando em 3s...")
                    time.sleep(3)

            # Commit a cada 25 itens para garantir persistência contínua
            if idx % 25 == 0:
                session.commit()

            # Delay seguro: 0.5s permite rodar até ~120 req/min sem estresse
            time.sleep(0.5)

        session.commit()
        print(f"\n=== Concluído! ===")
        print(f"Recuperados com sucesso: {recuperados}")
        print(f"IDs não encontrados/deletados no MAL: {nao_existentes}")

    except KeyboardInterrupt:
        print("\n[PAUSADO] Progresso salvo no banco. Você pode rodar de novo quando quiser.")
        session.commit()
    finally:
        session.close()

if __name__ == "__main__":
    # Pode passar batch_limit=500 para testar um lote primeiro ou deixar sem parâmetro para rodar todos
    resgatar_com_mal_oficial()