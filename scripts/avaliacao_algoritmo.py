import sys
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from math import sqrt
import time
import os
from concurrent.futures import ProcessPoolExecutor, as_completed
import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sqlalchemy import select
from tqdm import tqdm
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
)

from backend.db.session import SessionLocal
from backend.models.rating import Rating


RELEVANCE_THRESHOLD = 7.0
K_NEIGHBORS = 10
MIN_COMUM = 5
TEST_USER_RATIO = 0.20
MIN_USER_RATINGS = 5


def cosseno(rating1: np.ndarray, rating2: np.ndarray) -> float:
    xy = np.dot(rating1, rating2)
    sum_x2 = np.sum(rating1 ** 2)
    sum_y2 = np.sum(rating2 ** 2)
    if xy == 0 or sum_x2 == 0 or sum_y2 == 0:
        return 0.0
    return float(xy / (sqrt(sum_x2) * sqrt(sum_y2)))


def split_global_20(df: pd.DataFrame, random_state: int = 42):
    np.random.seed(random_state)
    
    total_usuarios_bruto = df["user_id"].nunique()
    total_avaliacoes_bruto = len(df)
    
    contagens = df["user_id"].value_counts()
    usuarios_elegiveis = contagens[contagens >= MIN_USER_RATINGS].index.to_numpy()
    total_elegiveis = len(usuarios_elegiveis)

    # 1º NÍVEL: Sorteio de 20% dos usuários da base
    n_test_users = max(1, int(total_elegiveis * TEST_USER_RATIO))
    test_user_ids = np.random.choice(usuarios_elegiveis, size=n_test_users, replace=False)
    test_user_set = set(test_user_ids)

    df_test_users = df[df["user_id"].isin(test_user_set)]
    total_notas_amostra_usuarios = len(df_test_users)

    indices_teste = []

    # 2º NÍVEL: ABORDAGEM 1 - Ocultação de 80% das notas (Simulação de Cold/Warm Start)
    for _, group in df_test_users.groupby("user_id"):
        n_items = max(1, int(np.ceil(len(group) * 0.80)))
        chosen = np.random.choice(group.index, size=n_items, replace=False)
        indices_teste.extend(chosen)

    df_test = df.loc[indices_teste].copy()
    df_train = df.drop(indices_teste).copy()

    # --- LOGS DIDÁTICOS DE ORIENTAÇÃO METODOLÓGICA ---
    print("\n" + "=" * 78)
    print(" METODOLOGIA DO SPLIT ESTRATIFICADO (ABORDAGEM 1 - ESTRESSE DE ALGORITMO)")
    print("=" * 78)
    print("1. UNIVERSO TOTAL DA BASE (SQLite):")
    print(f"   • Total de usuários únicos cadastrados   : {total_usuarios_bruto:,}")
    print(f"   • Total de avaliações válidas no banco   : {total_avaliacoes_bruto:,}")
    print(f"   • Usuários aptos (>= {MIN_USER_RATINGS} avaliações)      : {total_elegiveis:,}")

    print("\n2. NÍVEL 1 - SELEÇÃO DA AMOSTRA DE USUÁRIOS (20%):")
    print(f"   • Usuários sorteados para o teste        : {n_test_users:,} (20.00% da base ativa)")
    print(f"   • Total de notas desse grupo de usuários : {total_notas_amostra_usuarios:,}")

    print("\n3. NÍVEL 2 - TESTE DE ESTRESSE (Ocultando 80% do Histórico):")
    print("   • Para simular usuários com poucas avaliações e evitar que 'Heavy Users'")
    print("     facilitem a previsão, ocultamos a maior parte do histórico.")
    print(f"     - 20% do histórico fica no Treino : {total_notas_amostra_usuarios - len(df_test):,} notas passadas")
    print(f"     - 80% do histórico vai para Teste : {len(df_test):,} notas ocultas (Gabarito Cego)")

    print("\n4. RESUMO DOS CONJUNTOS DE DADOS:")
    print(f"   • MATRIZ DE TREINO (Treina similaridades) : {len(df_train):,} notas ({len(df_train)/total_avaliacoes_bruto*100:.2f}%)")
    print(f"   • GABARITO CEGO   (Métricas de validação): {len(df_test):,} notas ({len(df_test)/total_avaliacoes_bruto*100:.2f}%)")
    print("=" * 78 + "\n")

    return df_train, df_test, test_user_ids


# Função executada isoladamente em cada núcleo do processador
def avaliar_usuario_worker(args):
    (
        u_id,
        user_items_dict,
        matriz_esparsa,
        rev_user_map,
        rev_anime_map,
        user_means,
        anime_means,
        global_mean,
        total_usuarios_treino,
    ) = args

    anime_ids = np.array(user_items_dict["anime_id"])
    true_ratings = np.array(user_items_dict["rating"])

    if u_id not in rev_user_map:
        u_m = user_means.get(u_id, global_mean)
        pred_ratings = np.array([
            np.clip((u_m * 0.4) + (anime_means.get(aid, global_mean) * 0.6), 1.0, 10.0)
            for aid in anime_ids
        ])
    else:
        u_idx = rev_user_map[u_id]
        vetor_1 = matriz_esparsa.getrow(u_idx)
        vizinhos = []

        # Varredura par a par bruta
        for outro_idx in range(total_usuarios_treino):
            if outro_idx == u_idx:
                continue

            vetor_2 = matriz_esparsa.getrow(outro_idx)
            indices_comuns = np.intersect1d(vetor_1.indices, vetor_2.indices)

            if len(indices_comuns) < MIN_COMUM:
                continue

            r1 = vetor_1[:, indices_comuns].toarray().flatten()
            r2 = vetor_2[:, indices_comuns].toarray().flatten()

            sim = cosseno(r1, r2)
            if sim > 0:
                vizinhos.append((outro_idx, sim))

        vizinhos.sort(key=lambda x: x[1], reverse=True)
        top_k = vizinhos[:K_NEIGHBORS]

        u_m = user_means.get(u_id, global_mean)
        pred_ratings = []

        for aid in anime_ids:
            if aid not in rev_anime_map or not top_k:
                pred_ratings.append(np.clip((u_m * 0.4) + (anime_means.get(aid, global_mean) * 0.6), 1.0, 10.0))
                continue

            a_idx = rev_anime_map[aid]
            num = 0.0
            den = 0.0

            for vizinho_idx, sim in top_k:
                nota_vizinho = matriz_esparsa[vizinho_idx, a_idx]
                if nota_vizinho > 0:
                    num += sim * nota_vizinho
                    den += sim

            if den > 0:
                pred_ratings.append(np.clip(num / den, 1.0, 10.0))
            else:
                i_m = anime_means.get(aid, global_mean)
                pred_ratings.append(np.clip((u_m * 0.4) + (i_m * 0.6), 1.0, 10.0))

        pred_ratings = np.array(pred_ratings)

    mae = float(mean_absolute_error(true_ratings, pred_ratings))
    acc = float(accuracy_score(
        (true_ratings >= RELEVANCE_THRESHOLD).astype(int),
        (pred_ratings >= RELEVANCE_THRESHOLD).astype(int)
    ))

    return true_ratings.tolist(), pred_ratings.tolist(), mae, acc


def main():
    session = SessionLocal()
    print("=" * 78)
    print(" INICIANDO AVALIAÇÃO DE DESEMPENHO (BRUTE FORCE PARALELIZADO)")
    print("=" * 78)

    try:
        raw = session.execute(
            select(Rating.user_id, Rating.anime_id, Rating.rating)
            .where(Rating.rating != -1)
        ).all()

        if not raw:
            print("Nenhum dado encontrado no banco.")
            return

        df_ratings = pd.DataFrame(raw, columns=["user_id", "anime_id", "rating"])
        df_train, df_test, test_user_ids = split_global_20(df_ratings)

        user_cats = df_train["user_id"].astype("category")
        anime_cats = df_train["anime_id"].astype("category")

        user_map = dict(enumerate(user_cats.cat.categories))
        rev_user_map = {uid: idx for idx, uid in user_map.items()}

        anime_map = dict(enumerate(anime_cats.cat.categories))
        rev_anime_map = {aid: idx for idx, aid in anime_map.items()}

        matriz_esparsa = csr_matrix(
            (df_train["rating"].values, (user_cats.cat.codes, anime_cats.cat.codes)),
            dtype="float32"
        )

        total_usuarios_treino = matriz_esparsa.shape[0]
        global_mean = float(df_train["rating"].mean())
        user_means = df_train.groupby("user_id")["rating"].mean().to_dict()
        anime_means = df_train.groupby("anime_id")["rating"].mean().to_dict()

        test_grouped = df_test.groupby("user_id")
        
        tarefas = []
        for u_id in test_user_ids:
            if u_id in test_grouped.groups:
                g = test_grouped.get_group(u_id)
                items_dict = {"anime_id": g["anime_id"].tolist(), "rating": g["rating"].tolist()}
                tarefas.append((
                    u_id,
                    items_dict,
                    matriz_esparsa,
                    rev_user_map,
                    rev_anime_map,
                    user_means,
                    anime_means,
                    global_mean,
                    total_usuarios_treino
                ))

        num_cores = os.cpu_count() or 4
        print(f"Distribuindo {len(tarefas):,} usuários de teste entre {num_cores} núcleos de CPU...\n")

        y_true_all = []
        y_pred_all = []
        user_maes = []
        user_accuracies = []

        inicio_geral = time.perf_counter()

        with ProcessPoolExecutor(max_workers=num_cores) as executor:
            futuros = [executor.submit(avaliar_usuario_worker, arg) for arg in tarefas]
            for f in tqdm(as_completed(futuros), total=len(futuros), desc="Processando em paralelo"):
                t_ratings, p_ratings, mae, acc = f.result()
                y_true_all.extend(t_ratings)
                y_pred_all.extend(p_ratings)
                user_maes.append(mae)
                user_accuracies.append(acc)

        tempo_total = time.perf_counter() - inicio_geral

        # Métricas Globais
        y_true_all = np.array(y_true_all)
        y_pred_all = np.array(y_pred_all)

        y_true_bin = (y_true_all >= RELEVANCE_THRESHOLD).astype(int)
        y_pred_bin = (y_pred_all >= RELEVANCE_THRESHOLD).astype(int)

        mae_global = mean_absolute_error(y_true_all, y_pred_all)
        rmse_global = np.sqrt(mean_squared_error(y_true_all, y_pred_all))
        acc_global = accuracy_score(y_true_bin, y_pred_bin)
        prec_global = precision_score(y_true_bin, y_pred_bin, zero_division=0)
        rec_global = recall_score(y_true_bin, y_pred_bin, zero_division=0)
        f1_global = f1_score(y_true_bin, y_pred_bin, zero_division=0)
        cm = confusion_matrix(y_true_bin, y_pred_bin)
        especificidade = recall_score(y_true_bin, y_pred_bin, pos_label=0) 
        
        # Macro-Averaging (Anti-viés de Heavy Users)
        macro_mae = np.mean(user_maes)
        macro_acc = np.mean(user_accuracies)

        print("\n" + "=" * 78)
        print(" RESULTADOS FINAIS DA VALIDAÇÃO (20% DOS USUÁRIOS)")
        print("=" * 78)
        print(f"Tempo total decorrido      : {tempo_total:.2f}s ({tempo_total / 60:.2f} min)")
        print(f"Throughput computacional   : {len(tarefas) / tempo_total:.2f} usuários/segundo")
        print(f"Total de previsões testadas: {len(y_true_all):,} (Gabarito Cego)")

        print("\n--- 1. Métricas de Regressão Contínua (Predição de Nota) ---")
        print(f"MAE Global (com viés)      : {mae_global:.3f} estrelas")
        print(f"MAE Médio por Usuário      : {macro_mae:.3f} estrelas <-- (Métrica mais honesta)")
        print(f"RMSE (Raiz Erro Quadrático): {rmse_global:.3f} estrelas")
        print(f"Desvio Padrão do MAE (σ)   : ±{np.std(user_maes):.3f} (Consistência inter-usuários)")

        print(f"\n--- 2. Métricas de Classificação Binária (Relevante se Nota >= {RELEVANCE_THRESHOLD}) ---")
        print(f"Acurácia Global            : {acc_global * 100:.2f}%")
        print(f"Acurácia Média por Usuário : {macro_acc * 100:.2f}%")
        print(f"Desvio Padrão da Acurácia  : ±{np.std(user_accuracies) * 100:.2f}%")
        print(f"Precisão                   : {prec_global:.3f}")
        print(f"Recall (Sensibilidade)     : {rec_global:.3f}")
        print(f"Especificidade             : {especificidade:.3f} <-- (Capacidade de prever notas ruins)")
        print(f"F1-Score                   : {f1_global:.3f}")

        print("\n--- 3. Matriz de Confusão ---")
        tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
        print(f"                     Predito: Não (<7)  |  Predito: Sim (>=7)")
        print(f"Real: Não (<7)            TN = {tn:<8}  |  FP = {fp}")
        print(f"Real: Sim (>=7)           FN = {fn:<8}  |  TP = {tp}")
        print("=" * 78)

    finally:
        session.close()


if __name__ == "__main__":
    main()