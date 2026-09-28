import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from math import sqrt
import time
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sqlalchemy import select, delete
from tqdm import tqdm

from backend.db.session import SessionLocal
from backend.models.rating import Rating
from backend.models.user_similary import UserSimilarity

def barra_progresso(total):
    inicio = time.perf_counter()
    barra = tqdm(total=total, desc="[SEMANAL] Comparando todos os usuários", unit="par")
    return barra, inicio

def cosseno(rating1: np.ndarray, rating2: np.ndarray) -> float:
    xy = np.dot(rating1, rating2)
    sum_x2 = np.sum(rating1 ** 2)
    sum_y2 = np.sum(rating2 ** 2)
    if xy == 0 or sum_x2 == 0 or sum_y2 == 0:
        return 0.0
    return float(xy / (sqrt(sum_x2) * sqrt(sum_y2)))

def executar_recalculo_semanal_completo(k_vizinhos: int = 10, min_comum: int = 5, batch_insert_size: int = 5000):
    session = SessionLocal()
    print("=== [PREGUIÇOSO] Iniciando varredura semanal completa ===")

    try:
        # 1. Carrega todas as avaliações válidas
        ratings_raw = session.execute(
            select(Rating.user_id, Rating.anime_id, Rating.rating)
            .where(Rating.rating != -1)
        ).all()

        if not ratings_raw:
            print("Nenhuma avaliação encontrada no banco.")
            return

        df_ratings = pd.DataFrame(ratings_raw, columns=["user_id", "anime_id", "rating"])

        user_cats = df_ratings["user_id"].astype("category")
        anime_cats = df_ratings["anime_id"].astype("category")

        user_index_map = dict(enumerate(user_cats.cat.categories))
        matriz_esparsa = csr_matrix(
            (df_ratings["rating"].values, (user_cats.cat.codes, anime_cats.cat.codes)),
            dtype="float32"
        )

        total_usuarios = matriz_esparsa.shape[0]
        total_comparacoes = (total_usuarios * (total_usuarios - 1)) // 2

        print(f"Total de usuários indexados: {total_usuarios}")
        print(f"Total de pares a verificar: {total_comparacoes:,}")

        barra, inicio = barra_progresso(total_comparacoes)
        vizinhos = [[] for _ in range(total_usuarios)]

        # 2. Varredura completa par a par
        for user_idx in range(total_usuarios):
            vetor_1 = matriz_esparsa.getrow(user_idx)

            for outro_idx in range(user_idx + 1, total_usuarios):
                barra.update(1)
                vetor_2 = matriz_esparsa.getrow(outro_idx)

                # Apenas animes em comum
                indices_comuns = np.intersect1d(vetor_1.indices, vetor_2.indices)

                if len(indices_comuns) < min_comum:
                    continue

                r1 = vetor_1[:, indices_comuns].toarray().flatten()
                r2 = vetor_2[:, indices_comuns].toarray().flatten()

                sim = cosseno(r1, r2)
                if sim > 0:
                    vizinhos[user_idx].append((outro_idx, sim))
                    vizinhos[outro_idx].append((user_idx, sim))

        barra.close()
        tempo_calc = time.perf_counter() - inicio
        print(f"\nCálculos concluídos em {tempo_calc:.2f}s. Gravando no SQLite...")

        # 3. Consolidação dos Top K para gravação no banco
        novos_registros = []
        for user_idx in range(total_usuarios):
            vizinhos[user_idx].sort(key=lambda x: x[1], reverse=True)

            for outro_idx, sim in vizinhos[user_idx][:k_vizinhos]:
                novos_registros.append({
                    "usuario_1": int(user_index_map[user_idx]),
                    "usuario_2": int(user_index_map[outro_idx]),
                    "similaridade": round(float(sim), 5)
                })

        # 4. Substituição atômica no banco SQLite
        print(f"Limpando tabela antiga e persistindo {len(novos_registros):,} conexões...")
        session.execute(delete(UserSimilarity))

        # Inserção em lotes para evitar estourar o limite de variáveis do SQLite
        for i in range(0, len(novos_registros), batch_insert_size):
            lote = [UserSimilarity(**dados) for dados in novos_registros[i:i + batch_insert_size]]
            session.add_all(lote)
            session.commit()

        print("=== [PREGUIÇOSO] Concluído com sucesso! Banco 100% atualizado. ===")

    except Exception as e:
        session.rollback()
        print(f"[ERRO NO BATCH] {e}")
    finally:
        session.close()

if __name__ == "__main__":
    executar_recalculo_semanal_completo()