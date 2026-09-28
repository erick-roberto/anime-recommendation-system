import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from math import sqrt
from sqlalchemy.orm import Session
from backend.models.rating import Rating
from sqlalchemy import select
from backend.models.anime import Anime
from backend.models.user_similary import UserSimilarity

# matriz esparsa
def matriz_esparsa(session: Session):

    ratings = session.execute(select(Rating.user_id, Rating.anime_id, Rating.rating).where(Rating.rating != -1)).all()

    df_ratings = pd.DataFrame(ratings,columns=["user_id", "anime_id", "rating"])

    user_cats = df_ratings['user_id'].astype('category')
    anime_cats = df_ratings['anime_id'].astype('category')

    anime_index_map = dict(enumerate(anime_cats.cat.categories))
    user_index_map = dict(enumerate(user_cats.cat.categories))
    user_to_index = {user_id: idx for idx, user_id in enumerate(user_cats.cat.categories)}

    matriz_esparsa = csr_matrix((df_ratings['rating'].values, (user_cats.cat.codes, anime_cats.cat.codes)),dtype='float32')

    return matriz_esparsa, anime_index_map, user_index_map, user_to_index

# cálculo do cosseno
def cosseno(rating1, rating2):
    
    xy = np.dot(rating1, rating2)
    
    sum_x2 = np.sum(rating1 ** 2)
    sum_y2 = np.sum(rating2 ** 2)

    if xy == 0 or sum_x2 == 0 or sum_y2 == 0:
        return 0.0
    
    return xy / (sqrt(sum_x2) * sqrt(sum_y2))

# cálculo dos vizinhos mais próximos
def vizinhos_mais_proximos(usuario_alvo, matriz_esparsa, user_to_index, user_index_map, top_k=5):
    
    if usuario_alvo not in user_to_index:
        raise ValueError(f"Usuário {usuario_alvo} não encontrado nos dados.")

    idx_alvo = user_to_index[usuario_alvo]

    usuario_a = matriz_esparsa.getrow(idx_alvo)
    animes_a = usuario_a.indices
    num_usuarios = matriz_esparsa.shape[0]

    mais_proximos = []

    for idx in range(num_usuarios):
        if idx == idx_alvo:
            continue
        
        usuario_b = matriz_esparsa.getrow(idx)
        animes_b = usuario_b.indices

        # Intersecção de animes em comum
        animes_comuns = np.intersect1d(animes_a, animes_b)

        if animes_comuns.size < 10:
            continue
        
        ratings_a = usuario_a[:, animes_comuns].toarray().ravel()
        ratings_b = usuario_b[:, animes_comuns].toarray().ravel()

        distancia = cosseno(ratings_a, ratings_b)
        
        if distancia > 0:
            
            id_vizinho = user_index_map[idx]
            mais_proximos.append((float(distancia), id_vizinho))

    mais_proximos.sort(key=lambda x: x[0], reverse=True)

    # Retorna apenas os Top-K primeiros
    return mais_proximos[:top_k]


# 4. RECOMENDADOR BASEADO EM USUÁRIO (Atualizado com campos visuais e limite top_n)
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
          'score': a.rating,
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