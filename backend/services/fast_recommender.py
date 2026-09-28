import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from collections import Counter
from math import sqrt
import time
import numpy as np
from sqlalchemy import select, delete
from ..db.session import SessionLocal
from ..models.rating import Rating
from ..models.user_similary import UserSimilarity

def calcular_cosseno(r1: np.ndarray, r2: np.ndarray) -> float:
    xy = np.dot(r1, r2)
    sum_x2 = np.sum(r1 ** 2)
    sum_y2 = np.sum(r2 ** 2)
    if xy == 0 or sum_x2 == 0 or sum_y2 == 0:
        return 0.0
    return float(xy / (sqrt(sum_x2) * sqrt(sum_y2)))

def atualizar_similaridades_fast(
    usuario_alvo_id: int,
    k_vizinhos: int = 10,
    min_comum: int = 5,
    max_candidatos_teto: int = 80
):
    inicio = time.perf_counter()
    session = SessionLocal()

    try:
        # 1. Busca notas do usuário alvo
        ratings_alvo = session.execute(
            select(Rating.anime_id, Rating.rating)
            .where(Rating.user_id == usuario_alvo_id, Rating.rating != -1)
        ).all()

        if len(ratings_alvo) < min_comum:
            print(f"[FAST] Usuário {usuario_alvo_id} possui apenas {len(ratings_alvo)} notas. Mínimo exigido: {min_comum}.")
            return

        mapa_alvo = {aid: float(nota) for aid, nota in ratings_alvo}
        animes_alvo_ids = list(mapa_alvo.keys())

        # 2. Busca apenas avaliações que colidem com os animes do usuário alvo
        candidatos_raw = session.execute(
            select(Rating.user_id, Rating.anime_id, Rating.rating)
            .where(
                Rating.anime_id.in_(animes_alvo_ids),
                Rating.user_id != usuario_alvo_id,
                Rating.rating != -1
            )
        ).all()

        if not candidatos_raw:
            print(f"[FAST] Nenhum usuário com animes em comum encontrado.")
            return

        # 3. Mapeamento e contagem de intersecções
        mapa_candidatos = {}
        contador_comum = Counter()

        for uid, aid, r in candidatos_raw:
            if uid not in mapa_candidatos:
                mapa_candidatos[uid] = {}
            mapa_candidatos[uid][aid] = float(r)
            contador_comum[uid] += 1

        # 4. Poda: Apenas quem tem >= min_comum, ordenados por quem tem mais em comum (Top max_candidatos_teto)
        candidatos_selecionados = [
            uid for uid, contagem in contador_comum.most_common()
            if contagem >= min_comum
        ][:max_candidatos_teto]

        if not candidatos_selecionados:
            print(f"[FAST] Nenhum candidato atingiu o mínimo de {min_comum} animes em comum.")
            return

        # 5. Calcula similaridade apenas sobre os itens em comum
        scores = []
        for uid in candidatos_selecionados:
            notas_outro = mapa_candidatos[uid]
            comuns = [aid for aid in animes_alvo_ids if aid in notas_outro]

            vetor1 = np.array([mapa_alvo[aid] for aid in comuns])
            vetor2 = np.array([notas_outro[aid] for aid in comuns])

            sim = calcular_cosseno(vetor1, vetor2)
            if sim > 0:
                scores.append((uid, sim))

        if not scores:
            return

        # 6. Top K mais similares
        scores.sort(key=lambda x: x[1], reverse=True)
        top_vizinhos = scores[:k_vizinhos]

        # 7. Persiste no SQLite
        session.execute(
            delete(UserSimilarity).where(UserSimilarity.usuario_1 == usuario_alvo_id)
        )
        
        novos_vizinhos = [
            UserSimilarity(
                usuario_1=usuario_alvo_id,
                usuario_2=vizinho_id,
                similaridade=round(sim, 5)
            )
            for vizinho_id, sim in top_vizinhos
        ]
        session.add_all(novos_vizinhos)
        session.commit()

        tempo_exec = (time.perf_counter() - inicio) * 1000
        print(f"[FAST OK] Usuário {usuario_alvo_id}: {len(top_vizinhos)} vizinhos salvos em {tempo_exec:.2f}ms (Avaliados {len(candidatos_selecionados)} candidatos).")

    except Exception as e:
        session.rollback()
        print(f"[FAST ERRO] Falha ao atualizar usuário {usuario_alvo_id}: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    # Teste manual via CLI: python fast_recommender.py <user_id>
    uid_teste = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    atualizar_similaridades_fast(usuario_alvo_id=uid_teste)