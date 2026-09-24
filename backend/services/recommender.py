
import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from math import sqrt

ARQUIVO = "arquivos/rating_filtrado.csv"
df_ratings = pd.read_csv(ARQUIVO)

user_cats = df_ratings['user_id'].astype('category')
anime_cats = df_ratings['anime_id'].astype('category')

anime_index_map = dict(enumerate(anime_cats.cat.categories))
user_index_map = dict(enumerate(user_cats.cat.categories))
user_to_index = {user_id: idx for idx, user_id in enumerate(user_cats.cat.categories)}

matriz_esparsa = csr_matrix(
    (df_ratings['rating'].values, (user_cats.cat.codes, anime_cats.cat.codes)),
    dtype='float32'
)

def cosseno(rating1, rating2):
    
    xy = np.dot(rating1, rating2)
    
    sum_x2 = np.sum(rating1 ** 2)
    sum_y2 = np.sum(rating2 ** 2)

    if xy == 0 or sum_x2 == 0 or sum_y2 == 0:
        return 0.0
    
    return xy / (sqrt(sum_x2) * sqrt(sum_y2))

def usuarios_mais_proximos(usuario_alvo, 
                           matriz_esparsa, 
                           user_to_index=user_to_index, 
                           user_index_map = user_index_map, 
                           top_k=5):
    
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





