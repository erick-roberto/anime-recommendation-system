from sqlalchemy.orm import Session
from backend.models.rating import Rating
from sqlalchemy import select
from backend.models.anime import Anime
from backend.models.user_similary import UserSimilarity
from backend.models.user_pearson_similarity import UserPearsonSimilarity

# 4. RECOMENDADOR BASEADO EM USUÁRIO (Atualizado com campos visuais e limite top_n)
# baseada em cosseno
def recommend_users_based(
    usuario_alvo: int, session: Session, top_n: int = 15
):
  # Consulta dos vizinhos mais próximos do usuário alvo
  stmt_similares = select(
      UserSimilarity.usuario_2, UserSimilarity.similaridade
  ).where(UserSimilarity.usuario_1 == usuario_alvo)
  similares = session.execute(stmt_similares).all()

  if not similares:
    return []

  similaridades = {usuario_2: float(sim) for usuario_2, sim in similares}
  ids_vizinhos = list(similaridades.keys())

  # Animes que o usuário alvo já assistiu/avaliou
  stmt_animes_usuario = select(Rating.anime_id).where(
      Rating.user_id == usuario_alvo, Rating.rating != -1
  )
  animes_usuario = set(session.execute(stmt_animes_usuario).scalars().all())

  # Avaliações dos vizinhos
  stmt_ratings = select(
      Rating.user_id, Rating.anime_id, Rating.rating
  ).where(Rating.user_id.in_(ids_vizinhos), Rating.rating != -1)
  ratings_vizinhos = session.execute(stmt_ratings).all()

  recomendacoes = {}

  for user_id, anime_id, rating in ratings_vizinhos:
    if anime_id in animes_usuario:
      continue

    similaridade = similaridades[user_id]
    score = float(rating) * similaridade

    if anime_id not in recomendacoes:
      recomendacoes[anime_id] = 0.0

    recomendacoes[anime_id] += score

  if not recomendacoes:
    return []

  # Ordena decrescente e limita aos top_n primeiros
  recomendacoes_ordenadas = sorted(
      recomendacoes.items(), key=lambda x: x[1], reverse=True
  )[:top_n]

  anime_ids = [anime_id for anime_id, _ in recomendacoes_ordenadas]

  # Busca os dados completos para renderizar no AnimeCard
  stmt_animes = select(
      Anime.anime_id,
      Anime.name,
      Anime.genre,
      Anime.type,
      Anime.rating,
      Anime.members,
      Anime.image_url
  ).where(Anime.anime_id.in_(anime_ids))
  animes_db = session.execute(stmt_animes).all()

  # Mapeia por ID para preservar o ranking gerado pelo KNN
  animes_dict = {
      a.anime_id: {
          'anime_id': a.anime_id,
          'name': a.name,
          'genre': a.genre,
          'type': a.type,
          'rating': a.rating,
          'members': a.members,
          'image_url': a.image_url
      }
      for a in animes_db
  }

  resultado = []
  for anime_id, _ in recomendacoes_ordenadas:
    if anime_id in animes_dict:
      resultado.append(animes_dict[anime_id])

  return resultado

# baseada em Pearson
def recommend_users_based_pearson(
    usuario_alvo: int, session: Session, top_n: int = 15
):
    
    stmt_similares = select(
        UserPearsonSimilarity.usuario_2,
        UserPearsonSimilarity.similaridade
    ).where(
        UserPearsonSimilarity.usuario_1 == usuario_alvo
    )

    similares = session.execute(stmt_similares).all()

    if not similares:
        return []

    similaridades = {
        usuario_2: float(sim)
        for usuario_2, sim in similares
    }

    ids_vizinhos = list(similaridades.keys())

    # Animes que o usuário alvo já avaliou
    stmt_animes_usuario = select(
        Rating.anime_id
    ).where(
        Rating.user_id == usuario_alvo,
        Rating.rating != -1
    )

    animes_usuario = set(
        session.execute(stmt_animes_usuario).scalars().all()
    )

    # Avaliações dos vizinhos
    stmt_ratings = select(
        Rating.user_id,
        Rating.anime_id,
        Rating.rating
    ).where(
        Rating.user_id.in_(ids_vizinhos),
        Rating.rating != -1
    )

    ratings_vizinhos = session.execute(stmt_ratings).all()

    recomendacoes = {}

    # Calcula o score usando Pearson
    for user_id, anime_id, rating in ratings_vizinhos:

        # Não recomenda anime que o usuário já avaliou
        if anime_id in animes_usuario:
            continue

        similaridade = similaridades[user_id]

        score = float(rating) * similaridade

        if anime_id not in recomendacoes:
            recomendacoes[anime_id] = 0.0

        recomendacoes[anime_id] += score

    if not recomendacoes:
        return []

    # Ordena pelo score e pega os Top N
    recomendacoes_ordenadas = sorted(
        recomendacoes.items(),
        key=lambda x: x[1],
        reverse=True
    )[:top_n]

    anime_ids = [
        anime_id
        for anime_id, _ in recomendacoes_ordenadas
    ]

    # Busca informações dos animes
    stmt_animes = select(
        Anime.anime_id,
        Anime.name,
        Anime.genre,
        Anime.type,
        Anime.rating,
        Anime.members,
        Anime.image_url
    ).where(
        Anime.anime_id.in_(anime_ids)
    )

    animes_db = session.execute(stmt_animes).all()

    # Mapeia os dados pelo ID
    animes_dict = {
        a.anime_id: {
            "anime_id": a.anime_id,
            "name": a.name,
            "genre": a.genre,
            "type": a.type,
            "rating": a.rating,
            "members": a.members,
            "image_url": a.image_url
        }
        for a in animes_db
    }

    # Mantém a ordem definida pelo score
    resultado = []

    for anime_id, _ in recomendacoes_ordenadas:
        if anime_id in animes_dict:
            resultado.append(animes_dict[anime_id])

    return resultado

