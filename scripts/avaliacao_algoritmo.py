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


def pearson(rating1: np.ndarray, rating2: np.ndarray) -> float:
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

    return float((sum_xy - (sum_x * sum_y) / n) / np.sqrt(termo_x * termo_y))


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

    # Se usuário não está na matriz de treino, usa fallback (média ponderada)
    if u_id not in rev_user_map:
        u_m = user_means.get(u_id, global_mean)
        pred_ratings_cosseno = np.array([
            np.clip((u_m * 0.4) + (anime_means.get(aid, global_mean) * 0.6), 1.0, 10.0)
            for aid in anime_ids
        ])
        pred_ratings_pearson = pred_ratings_cosseno.copy()
    else:
        u_idx = rev_user_map[u_id]
        vetor_1 = matriz_esparsa.getrow(u_idx)
        vizinhos_cosseno = []
        vizinhos_pearson = []

        # Varredura par a par bruta - calcula AMBAS as similaridades
        for outro_idx in range(total_usuarios_treino):
            if outro_idx == u_idx:
                continue

            vetor_2 = matriz_esparsa.getrow(outro_idx)
            indices_comuns = np.intersect1d(vetor_1.indices, vetor_2.indices)

            if len(indices_comuns) < MIN_COMUM:
                continue

            r1 = vetor_1[:, indices_comuns].toarray().flatten()
            r2 = vetor_2[:, indices_comuns].toarray().flatten()

            sim_cosseno = cosseno(r1, r2)
            sim_pearson = pearson(r1, r2)

            if sim_cosseno > 0:
                vizinhos_cosseno.append((outro_idx, sim_cosseno))
            if sim_pearson > 0:
                vizinhos_pearson.append((outro_idx, sim_pearson))

        # Top-K para cada método
        vizinhos_cosseno.sort(key=lambda x: x[1], reverse=True)
        top_k_cosseno = vizinhos_cosseno[:K_NEIGHBORS]

        vizinhos_pearson.sort(key=lambda x: x[1], reverse=True)
        top_k_pearson = vizinhos_pearson[:K_NEIGHBORS]

        u_m = user_means.get(u_id, global_mean)

        # Predições usando Cosseno
        pred_ratings_cosseno = []
        for aid in anime_ids:
            if aid not in rev_anime_map or not top_k_cosseno:
                pred_ratings_cosseno.append(np.clip((u_m * 0.4) + (anime_means.get(aid, global_mean) * 0.6), 1.0, 10.0))
                continue

            a_idx = rev_anime_map[aid]
            num = 0.0
            den = 0.0

            for vizinho_idx, sim in top_k_cosseno:
                nota_vizinho = matriz_esparsa[vizinho_idx, a_idx]
                if nota_vizinho > 0:
                    num += sim * nota_vizinho
                    den += sim

            if den > 0:
                pred_ratings_cosseno.append(np.clip(num / den, 1.0, 10.0))
            else:
                i_m = anime_means.get(aid, global_mean)
                pred_ratings_cosseno.append(np.clip((u_m * 0.4) + (i_m * 0.6), 1.0, 10.0))

        pred_ratings_cosseno = np.array(pred_ratings_cosseno)

        # Predições usando Pearson
        pred_ratings_pearson = []
        for aid in anime_ids:
            if aid not in rev_anime_map or not top_k_pearson:
                pred_ratings_pearson.append(np.clip((u_m * 0.4) + (anime_means.get(aid, global_mean) * 0.6), 1.0, 10.0))
                continue

            a_idx = rev_anime_map[aid]
            num = 0.0
            den = 0.0

            for vizinho_idx, sim in top_k_pearson:
                nota_vizinho = matriz_esparsa[vizinho_idx, a_idx]
                if nota_vizinho > 0:
                    num += sim * nota_vizinho
                    den += sim

            if den > 0:
                pred_ratings_pearson.append(np.clip(num / den, 1.0, 10.0))
            else:
                i_m = anime_means.get(aid, global_mean)
                pred_ratings_pearson.append(np.clip((u_m * 0.4) + (i_m * 0.6), 1.0, 10.0))

        pred_ratings_pearson = np.array(pred_ratings_pearson)

    # Métricas para Cosseno
    mae_cosseno = float(mean_absolute_error(true_ratings, pred_ratings_cosseno))
    acc_cosseno = float(accuracy_score(
        (true_ratings >= RELEVANCE_THRESHOLD).astype(int),
        (pred_ratings_cosseno >= RELEVANCE_THRESHOLD).astype(int)
    ))

    # Métricas para Pearson
    mae_pearson = float(mean_absolute_error(true_ratings, pred_ratings_pearson))
    acc_pearson = float(accuracy_score(
        (true_ratings >= RELEVANCE_THRESHOLD).astype(int),
        (pred_ratings_pearson >= RELEVANCE_THRESHOLD).astype(int)
    ))

    return (
        true_ratings.tolist(),
        pred_ratings_cosseno.tolist(),
        pred_ratings_pearson.tolist(),
        mae_cosseno,
        acc_cosseno,
        mae_pearson,
        acc_pearson
    )


def calcular_metricas_completas(y_true, y_pred, user_metricas=None):
    """Calcula todas as métricas para um conjunto de predições."""
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    y_true_bin = (y_true >= RELEVANCE_THRESHOLD).astype(int)
    y_pred_bin = (y_pred >= RELEVANCE_THRESHOLD).astype(int)

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    acc = accuracy_score(y_true_bin, y_pred_bin)
    prec = precision_score(y_true_bin, y_pred_bin, zero_division=0)
    rec = recall_score(y_true_bin, y_pred_bin, zero_division=0)
    f1 = f1_score(y_true_bin, y_pred_bin, zero_division=0)
    cm = confusion_matrix(y_true_bin, y_pred_bin)
    especificidade = recall_score(y_true_bin, y_pred_bin, pos_label=0)

    # Macro metrics se disponível
    macro_mae = np.mean(user_metricas["mae"]) if user_metricas and "mae" in user_metricas else None
    macro_acc = np.mean(user_metricas["acc"]) if user_metricas and "acc" in user_metricas else None

    return {
        "mae": mae,
        "rmse": rmse,
        "acc": acc,
        "prec": prec,
        "rec": rec,
        "f1": f1,
        "cm": cm,
        "especificidade": especificidade,
        "macro_mae": macro_mae,
        "macro_acc": macro_acc,
        "std_mae": np.std(user_metricas["mae"]) if user_metricas and "mae" in user_metricas else None,
        "std_acc": np.std(user_metricas["acc"]) if user_metricas and "acc" in user_metricas else None,
    }


def imprimir_resultados(titulo: str, metrics: dict, n_predictions: int):
    print(f"\n{'=' * 78}")
    print(f" RESULTADOS - {titulo}")
    print(f"{'=' * 78}")
    print(f"Total de previsões testadas: {n_predictions:,} (Gabarito Cego)")

    print("\n--- 1. Métricas de Regressão Contínua (Predição de Nota) ---")
    print(f"MAE Global (com viés)      : {metrics['mae']:.3f} estrelas")
    if metrics['macro_mae'] is not None:
        print(f"MAE Médio por Usuário      : {metrics['macro_mae']:.3f} estrelas <-- (Métrica mais honesta)")
        print(f"Desvio Padrão do MAE (σ)   : ±{metrics['std_mae']:.3f} (Consistência inter-usuários)")
    print(f"RMSE (Raiz Erro Quadrático): {metrics['rmse']:.3f} estrelas")

    print(f"\n--- 2. Métricas de Classificação Binária (Relevante se Nota >= {RELEVANCE_THRESHOLD}) ---")
    print(f"Acurácia Global            : {metrics['acc'] * 100:.2f}%")
    if metrics['macro_acc'] is not None:
        print(f"Acurácia Média por Usuário : {metrics['macro_acc'] * 100:.2f}%")
        print(f"Desvio Padrão da Acurácia  : ±{metrics['std_acc'] * 100:.2f}%")
    print(f"Precisão                   : {metrics['prec']:.3f}")
    print(f"Recall (Sensibilidade)     : {metrics['rec']:.3f}")
    print(f"Especificidade             : {metrics['especificidade']:.3f} <-- (Capacidade de prever notas ruins)")
    print(f"F1-Score                   : {metrics['f1']:.3f}")

    print("\n--- 3. Matriz de Confusão ---")
    cm = metrics['cm']
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    print(f"                     Predito: Não (<{RELEVANCE_THRESHOLD})  |  Predito: Sim (>= {RELEVANCE_THRESHOLD})")
    print(f"Real: Não (<{RELEVANCE_THRESHOLD})            TN = {tn:<8}  |  FP = {fp}")
    print(f"Real: Sim (>= {RELEVANCE_THRESHOLD})           FN = {fn:<8}  |  TP = {tp}")
    print("=" * 78)


def main():
    session = SessionLocal()
    print("=" * 78)
    print(" INICIANDO AVALIAÇÃO DE DESEMPENHO (BRUTE FORCE PARALELIZADO)")
    print(" Comparando: Cosseno vs Pearson")
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

        # Acumuladores para Cosseno
        y_true_all = []
        y_pred_cosseno_all = []
        user_maes_cosseno = []
        user_accuracies_cosseno = []

        # Acumuladores para Pearson
        y_pred_pearson_all = []
        user_maes_pearson = []
        user_accuracies_pearson = []

        inicio_geral = time.perf_counter()

        with ProcessPoolExecutor(max_workers=num_cores) as executor:
            futuros = [executor.submit(avaliar_usuario_worker, arg) for arg in tarefas]
            for f in tqdm(as_completed(futuros), total=len(futuros), desc="Processando em paralelo"):
                t_ratings, p_ratings_cos, p_ratings_pea, mae_cos, acc_cos, mae_pea, acc_pea = f.result()

                y_true_all.extend(t_ratings)
                y_pred_cosseno_all.extend(p_ratings_cos)
                y_pred_pearson_all.extend(p_ratings_pea)

                user_maes_cosseno.append(mae_cos)
                user_accuracies_cosseno.append(acc_cos)
                user_maes_pearson.append(mae_pea)
                user_accuracies_pearson.append(acc_pea)

        tempo_total = time.perf_counter() - inicio_geral

        print(f"\nTempo total decorrido      : {tempo_total:.2f}s ({tempo_total / 60:.2f} min)")
        print(f"Throughput computacional   : {len(tarefas) / tempo_total:.2f} usuários/segundo")

        # Preparar métricas por usuário para macro-averaging
        user_metrics_cosseno = {"mae": user_maes_cosseno, "acc": user_accuracies_cosseno}
        user_metrics_pearson = {"mae": user_maes_pearson, "acc": user_accuracies_pearson}

        # Calcular métricas completas para ambos
        metrics_cosseno = calcular_metricas_completas(
            y_true_all, y_pred_cosseno_all, user_metrics_cosseno
        )
        metrics_pearson = calcular_metricas_completas(
            y_true_all, y_pred_pearson_all, user_metrics_pearson
        )

        # Imprimir resultados lado a lado
        imprimir_resultados("COSSENO (User-based KNN)", metrics_cosseno, len(y_true_all))
        imprimir_resultados("PEARSON (User-based KNN)", metrics_pearson, len(y_true_all))

        # Comparativo final
        print("\n" + "=" * 78)
        print(" COMPARATIVO FINAL: COSSENO vs PEARSON")
        print("=" * 78)
        print(f"{'Métrica':<35} {'Cosseno':>12} {'Pearson':>12} {'Diferença':>12} {'Vencedor':>10}")
        print("-" * 78)

        comparacoes = [
            ("MAE Global (estrelas)", metrics_cosseno['mae'], metrics_pearson['mae'], "menor"),
            ("RMSE (estrelas)", metrics_cosseno['rmse'], metrics_pearson['rmse'], "menor"),
            ("Acurácia Global (%)", metrics_cosseno['acc']*100, metrics_pearson['acc']*100, "maior"),
            ("Precisão", metrics_cosseno['prec'], metrics_pearson['prec'], "maior"),
            ("Recall", metrics_cosseno['rec'], metrics_pearson['rec'], "maior"),
            ("F1-Score", metrics_cosseno['f1'], metrics_pearson['f1'], "maior"),
            ("Especificidade", metrics_cosseno['especificidade'], metrics_pearson['especificidade'], "maior"),
        ]

        if metrics_cosseno['macro_mae'] is not None:
            comparacoes.insert(1, ("MAE Macro-Médio (estrelas)", metrics_cosseno['macro_mae'], metrics_pearson['macro_mae'], "menor"))
        if metrics_cosseno['macro_acc'] is not None:
            comparacoes.insert(4, ("Acurácia Macro-Média (%)", metrics_cosseno['macro_acc']*100, metrics_pearson['macro_acc']*100, "maior"))

        for nome, val_cos, val_pea, direcao in comparacoes:
            diff = val_pea - val_cos
            if direcao == "menor":
                vencedor = "Pearson" if val_pea < val_cos else "Cosseno"
            else:
                vencedor = "Pearson" if val_pea > val_cos else "Cosseno"
            print(f"{nome:<35} {val_cos:>12.3f} {val_pea:>12.3f} {diff:>+12.3f} {vencedor:>10}")

        print("=" * 78)

    finally:
        session.close()


if __name__ == "__main__":
    main()