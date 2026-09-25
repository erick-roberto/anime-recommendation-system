
import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from math import sqrt
from sqlalchemy.orm import Session
from backend.models.rating import Rating
from sqlalchemy import select

def matriz_esparsa(session: Session):

    ratings = session.execute(
        select(Rating.user_id, Rating.anime_id, Rating.rating)
        .where(Rating.rating != -1)
    ).all()

    df_ratings = pd.DataFrame(
        ratings,
        columns=["user_id", "anime_id", "rating"]
    )

    user_cats = df_ratings['user_id'].astype('category')
    anime_cats = df_ratings['anime_id'].astype('category')

    anime_index_map = dict(enumerate(anime_cats.cat.categories))
    user_index_map = dict(enumerate(user_cats.cat.categories))
    user_to_index = {user_id: idx for idx, user_id in enumerate(user_cats.cat.categories)}

    matriz_esparsa = csr_matrix(
        (df_ratings['rating'].values, (user_cats.cat.codes, anime_cats.cat.codes)),
        dtype='float32'
    )

    return matriz_esparsa, anime_index_map, user_index_map, user_to_index

def cosseno(rating1, rating2):
    
    xy = np.dot(rating1, rating2)
    
    sum_x2 = np.sum(rating1 ** 2)
    sum_y2 = np.sum(rating2 ** 2)

    if xy == 0 or sum_x2 == 0 or sum_y2 == 0:
        return 0.0
    
    return xy / (sqrt(sum_x2) * sqrt(sum_y2))

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

def recommend_users_based(usuario_alvo, session: Session): 

    (matriz, anime_index_map, user_index_map, user_to_index) = matriz_esparsa(session)
    vizinhos = vizinhos_mais_proximos(usuario_alvo, matriz, user_to_index, user_index_map, top_k=5)

    recomendacoes = []

    idx_usuario = user_to_index[usuario_alvo]
    usuario = matriz.getrow(idx_usuario)
    userRatings = usuario.indices # indices dos animes que o usuario alvo avaliou

    for similaridade, user_id in vizinhos:

        idx_vizinho = user_to_index[user_id]
        usuario_vizinho = matriz.getrow(idx_vizinho)
        neighborRatings = usuario_vizinho.indices

        # retorna os indices dos animes que o usuário alvo não avaliou
        diferenca = np.setdiff1d(neighborRatings, userRatings)

        # adicionar a lógica de verificar os pesos de cada animes a ser recomendado



