import html
import os
import re
import time
import requests
from sqlalchemy import Column, Float, Integer, String, create_engine, func, select
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Caminho para o seu banco SQLite (ajuste caso necessário)
DB_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../backend/data/anime.db")
)

# Se o script estiver na mesma pasta do arquivo .db, use:
# DB_PATH = "anime.db"

# 2. Configuração estrita de Rate Limit da Jikan v4
# 1.05s por requisição garante ~57 req/min (abaixo do teto de 60 req/min e < 3 req/s)
RATE_LIMIT_DELAY = 1.05

# 3. Definição autônoma do modelo para o script
Base = declarative_base()


class Anime(Base):
  __tablename__ = "anime"

  anime_id = Column(Integer, primary_key=True)
  name = Column(String)
  members = Column(Integer)
  image_url = Column(String, nullable=True)


def limpar_nome_anime(nome: str) -> str:
  """Limpa entidades HTML como &#039; e marcadores extras."""
  if not nome:
    return ""
  nome_limpo = html.unescape(nome)
  return re.sub(r"\(TV\)|\(Movie\)|\(OVA\)", "", nome_limpo).strip()


def popular_todas_capas(batch_size=100):
  if not os.path.exists(DB_PATH):
    print(f"Erro: Banco não encontrado no caminho: {DB_PATH}")
    return

  engine = create_engine(f"sqlite:///{DB_PATH}")
  Session = sessionmaker(bind=engine)
  session = Session()

  http = requests.Session()
  http.headers.update({
      "User-Agent": "StandaloneAnimeScraper/1.0 (Educational Project)"
  })

  # Contagem total de animes sem capa
  stmt_count = select(func.count(Anime.anime_id)).where(
      (Anime.image_url.is_(None)) | (Anime.image_url == "")
  )
  total_restante = session.execute(stmt_count).scalar_one()

  print("=== Script Autônomo de Enriquecimento de Capas ===")
  print(f"Banco conectado: {DB_PATH}")
  print(f"Animes restantes: {total_restante}")
  print(f"Intervalo programado: {RATE_LIMIT_DELAY}s (respeitando <= 60 req/min)\n")

  processados = 0

  try:
    while True:
      # Busca o próximo lote ordenado pelos mais populares
      stmt = (
          select(Anime)
          .where((Anime.image_url.is_(None)) | (Anime.image_url == ""))
          .order_by(Anime.members.desc().nullslast())
          .limit(batch_size)
      )
      animes = session.execute(stmt).scalars().all()

      if not animes:
        print("\nTodos os animes do banco já possuem capa ou foram tratados!")
        break

      for anime in animes:
        sucesso = False
        tentativas = 0
        max_tentativas = 3

        while not sucesso and tentativas < max_tentativas:
          tentativas += 1
          try:
            # 1. Tenta consulta direta pelo anime_id
            url = f"https://api.jikan.moe/v4/anime/{anime.anime_id}"
            res = http.get(url, timeout=12)

            if res.status_code == 429:
              print(
                  "[429 Rate Limit] Limite temporário atingido. Aguardando 5"
                  " segundos..."
              )
              time.sleep(5)
              continue

            if res.status_code == 200:
              data = res.json().get("data", {})
              images = data.get("images", {}).get("jpg", {})
              img_url = images.get("large_image_url") or images.get("image_url")

              anime.image_url = img_url or "NOT_FOUND"
              processados += 1
              print(f"[{processados}/{total_restante}] ID OK: {anime.name}")
              sucesso = True

            elif res.status_code == 404:
              # 2. Se o ID falhar, tenta por busca de nome
              time.sleep(RATE_LIMIT_DELAY)
              nome_busca = limpar_nome_anime(anime.name)
              search_url = "https://api.jikan.moe/v4/anime"

              search_res = http.get(
                  search_url, params={"q": nome_busca, "limit": 1}, timeout=12
              )

              if search_res.status_code == 200:
                results = search_res.json().get("data", [])
                if results:
                  img_url = (
                      results[0]
                      .get("images", {})
                      .get("jpg", {})
                      .get("large_image_url")
                  )
                  anime.image_url = img_url or "NOT_FOUND"
                  processados += 1
                  print(
                      f"[{processados}/{total_restante}] BUSCA OK: {anime.name}"
                  )
                else:
                  anime.image_url = "NOT_FOUND"
                  print(
                      f"[{processados}/{total_restante}] NÃO ENCONTRADO:"
                      f" {anime.name}"
                  )
                sucesso = True
              elif search_res.status_code == 429:
                print(
                    "[429 Rate Limit na Busca] Aguardando 5 segundos..."
                )
                time.sleep(5)
                continue
              else:
                anime.image_url = "NOT_FOUND"
                sucesso = True
            else:
              anime.image_url = "NOT_FOUND"
              sucesso = True

          except requests.exceptions.RequestException as e:
            print(
                f"Erro de conexão em {anime.name}: {e}. Tentando novamente..."
            )
            time.sleep(3)

        # Salva imediatamente após cada anime concluído
        session.commit()
        time.sleep(RATE_LIMIT_DELAY)

  except KeyboardInterrupt:
    print(
        "\n[PAUSADO] O progresso atual foi salvo! Você pode rodar novamente a"
        " qualquer momento."
    )
  finally:
    session.close()
    http.close()


if __name__ == "__main__":
  popular_todas_capas(batch_size=100)