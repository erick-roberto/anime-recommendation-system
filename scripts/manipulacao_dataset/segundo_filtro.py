'''
Retira os usuários com menos de 200 avaliações 
'''
import pandas as pd

ARQUIVO = "modificacoes/rating_filtrado_parte1.csv"
ARQUIVO_SAIDA = "modificacoes/rating_filtrado_parte2.csv"

df = pd.read_csv(ARQUIVO)

contagem = df.groupby("user_id").size()

usuarios_validos = contagem[contagem >= 200].index
usuarios_removidos = contagem[contagem < 200].index

df_filtrado = df[df["user_id"].isin(usuarios_validos)]

df_filtrado.to_csv(ARQUIVO_SAIDA, index=False)

print(f"Antes: {len(df)} avaliações")
print(f"Depois: {len(df_filtrado)} avaliações")
print(f"Usuários antes: {df['user_id'].nunique()}")
print(f"Usuários depois: {df_filtrado['user_id'].nunique()}")
print(f"Usuários removidos: {len(usuarios_removidos)}")
print("\nUsuários removidos e quantidade de avaliações:")
print(contagem[contagem < 200])
