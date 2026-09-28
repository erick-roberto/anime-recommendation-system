import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

import pandas as pd
import numpy as np
from scipy.sparse import csr_matrix
from math import sqrt
from sqlalchemy import select
from backend.models.rating import Rating
from backend.db.session import SessionLocal
from tqdm import tqdm
import time

def barra_progresso(total):
    inicio = time.perf_counter()
    barra = tqdm(total=total, desc="Comparando usuários", unit="comparação")
    return barra, inicio

def cosseno(rating1, rating2):
    xy = np.dot(rating1, rating2)

    sum_x2 = np.sum(rating1 ** 2)
    sum_y2 = np.sum(rating2 ** 2)

    if xy == 0 or sum_x2 == 0 or sum_y2 == 0:
        return 0.0

    return xy / (sqrt(sum_x2) * sqrt(sum_y2))

# Função para calcular a similaridade de Pearson
def pearson(rating1, rating2):
    n = len(rating1)

    if n == 0:
        return 0.0

    sum_x = np.sum(rating1)
    sum_y = np.sum(rating2)
    sum_xy = np.dot(rating1, rating2)
    sum_x2 = np.sum(rating1 ** 2)
    sum_y2 = np.sum(rating2 ** 2)

    termo_x = sum_x2 - (sum_x ** 2) / n
    termo_y = sum_y2 - (sum_y ** 2) / n

    if termo_x <= 0 or termo_y <= 0:
        return 0.0

    return ((sum_xy - (sum_x * sum_y) / n) / np.sqrt(termo_x * termo_y))

session = SessionLocal()
try:
    ratings = session.execute(
        select(Rating.user_id, Rating.anime_id, Rating.rating).where(Rating.rating != -1)).all()
finally:
    session.close()

# criação de um dataframe com as informações dos usuários
df_ratings = pd.DataFrame(ratings, columns=["user_id", "anime_id", "rating"])

user_cats = df_ratings["user_id"].astype("category")
anime_cats = df_ratings["anime_id"].astype("category")

user_index_map = dict(enumerate(user_cats.cat.categories))

# criação da matriz esparsa
matriz_esparsa = csr_matrix((df_ratings["rating"].values,(user_cats.cat.codes, anime_cats.cat.codes)), dtype="float32")

total_usuarios = matriz_esparsa.shape[0]

K = 10
MIN_ANIMES_EM_COMUM = 5

total_comparacoes = (total_usuarios * (total_usuarios - 1)) // 2

barra, inicio = barra_progresso(total_comparacoes)

vizinhos = [[] for _ in range(total_usuarios)]

# percorre todos os índices de usuário
for user_idx in range(total_usuarios):

    # busca o vetor do primeiro usuário
    vetor_1 = matriz_esparsa.getrow(user_idx)

    # faz a comparação com os outros usuários com indices maiores do que o primeiro usuário
    for outro_idx in range(user_idx + 1, total_usuarios):

        barra.update(1)

        # busca o vetor do segundo usuário
        vetor_2 = matriz_esparsa.getrow(outro_idx)

        # intersecção de indices (retorna os animes em comum)
        indices_comuns = np.intersect1d(vetor_1.indices, vetor_2.indices)

        if len(indices_comuns) < MIN_ANIMES_EM_COMUM:
            continue

        # retorna um array com todos as notas nos animes em comum entre os dois
        rating1 = (vetor_1[:,indices_comuns].toarray().flatten())
        rating2 = (vetor_2[:,indices_comuns].toarray().flatten())

        # calcula a similaridade
        similaridade = pearson(rating1, rating2)    

        # registro das relações nos dois sentidos (A -> B) e (B -> A)
        vizinhos[user_idx].append((outro_idx, similaridade))
        vizinhos[outro_idx].append((user_idx, similaridade))

barra.close()


tempo_total = (time.perf_counter() - inicio)

print(f"Tempo total: {tempo_total:.2f} segundos")

resultados = []

for user_idx in range(total_usuarios):

    vizinhos[user_idx].sort(key=lambda x: x[1], reverse=True)

    for outro_idx, similaridade in (vizinhos[user_idx][:K]):

        resultados.append({
                "usuario_1": user_index_map[user_idx],
                "usuario_2": user_index_map[outro_idx],
                "similaridade": similaridade
            }
        )

df_vizinhos = pd.DataFrame(resultados)

df_vizinhos.to_csv("vizinhos_usuarios_padrao_pearson.csv", index=False)

print(df_vizinhos.head(100))

