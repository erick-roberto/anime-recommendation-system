'''
Retirar os valores negativos -1 do dataset
-1 representa que o usuario assistiu mas nao avaliou
'''

import pandas as pd

df = pd.read_csv("dataset_original/rating.csv")

df_filtrado = df[df["rating"] != -1]

df_filtrado.to_csv("modificacoes/rating_filtrado_parte1.csv", index=False)

print(f"Registros originais: {len(df)}")
print(f"Registros após filtro: {len(df_filtrado)}")
print(f"Registros removidos: {len(df) - len(df_filtrado)}")

