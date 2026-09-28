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


# recomender baseado em usuário
def recommend_users_based(usuario_alvo: int, session: Session):

    # consulta dos vizinhos mais próximos do usuário alvo
    stmt_similares = (select(UserSimilarity.usuario_2, UserSimilarity.similaridade).where(UserSimilarity.usuario_1 == usuario_alvo))
    similares = session.execute(stmt_similares).all()

    # caso a query n retorne registros
    if not similares:
        return []

    # transforma os registros em um dicionário
    similaridades = {usuario_2: float(similaridade) for usuario_2, similaridade in similares}

    # separa apenas os IDs dentro de uma lista
    ids_vizinhos = list(similaridades.keys())

    # busca os IDs dos animes avaliados pelo usuário alvo
    stmt_animes_usuario = (select(Rating.anime_id).where(Rating.user_id == usuario_alvo, Rating.rating != -1))
    animes_usuario = set(session.execute(stmt_animes_usuario).scalars().all())

    # busca  as avaliações dos vizinhos
    stmt_ratings = (select(Rating.user_id, Rating.anime_id, Rating.rating).where(Rating.user_id.in_(ids_vizinhos), Rating.rating != -1))
    ratings_vizinhos = session.execute(stmt_ratings).all()

    recomendacoes = {}


    for user_id, anime_id, rating in ratings_vizinhos:

        if anime_id in animes_usuario:
            continue

        # similaridade de um dos vizinhos mais próximos
        similaridade = similaridades[user_id]

        # score: leva em consideração a nota que ele deu
        score = float(rating) * similaridade

        # adiciona o anime as recomendações, caso não esteja ainda
        if anime_id not in recomendacoes:
            recomendacoes[anime_id] = 0.0 

        # acumula essas notas
        recomendacoes[anime_id] += score


    # ordena as reomendações (decrescente)
    recomendacoes_ordenadas = sorted(
        recomendacoes.items(),
        key=lambda x: x[1],
        reverse=True
    )   

    # monta o JSON final 
    anime_ids = [anime_id for anime_id, score in recomendacoes_ordenadas] 

    # verifica se existe anime
    if not anime_ids:
        return []

    # busca os dados dos animes
    stmt_animes = (select(Anime.anime_id, Anime.name).where(Anime.anime_id.in_(anime_ids)))
    animes = session.execute(stmt_animes).all()

    # criação de um dicionário que possui os IDs e nomes
    nomes_animes = {anime_id: nome for anime_id, nome in animes}

    resultado = []

    for anime_id, score in recomendacoes_ordenadas:

        resultado.append({
            "anime_id": anime_id,
            "nome": nomes_animes.get(anime_id),
            "nota": round(score, 4)
        })

    return resultado

