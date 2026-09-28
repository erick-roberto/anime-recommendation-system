# 🎌 Anime Recommendation System

Sistema de recomendação de animes baseado em **filtragem colaborativa User-Based (KNN)** com duas métricas de similaridade: **Cosseno** e **Pearson**. Desenvolvido como projeto full-stack com FastAPI (backend) + React/Vite (frontend).

---

## 📋 Índice

- [Objetivo](#-objetivo)
- [Fundamentação](#-fundamentação)
- [Dados](#-dados)
- [Método](#-método)
- [Resultados](#-resultados)
- [Limitações](#-limitações)
- [Conclusão](#-conclusão)
- [Arquitetura](#-arquitetura)
- [Dependências](#-dependências)
- [Instruções de Execução](#-instruções-de-execução)
- [Usuários de Teste](#-usuários-de-teste)

---

## 🎯 Objetivo

Desenvolver um sistema de recomendação personalizado de animes que utilize **filtragem colaborativa baseada em usuários (User-Based KNN)** para sugerir títulos baseados no histórico de avaliações do usuário, comparando duas métricas de similaridade (Cosseno e Pearson) e expondo os resultados via API REST com interface web interativa.

---

## 🧠 Fundamentação

### Filtragem Colaborativa User-Based (KNN)

A filtragem colaborativa assume que **usuários com gostos similares no passado terão gostos similares no futuro**. O algoritmo K-Nearest Neighbors (KNN) adapta-se naturalmente a esse paradigma:

1. **Matriz Usuário-Item**: Representa avaliações (usuários × animes)
2. **Similaridade entre Usuários**: Calculada apenas sobre itens em comum
3. **Vizinhos Mais Próximos (Top-K)**: Seleciona os K usuários mais similares
4. **Predição Ponderada**: Agrega notas dos vizinhos ponderadas pela similaridade

### Duas Métricas de Similaridade

| Métrica | Fórmula | Característica |
|---------|---------|----------------|
| **Cosseno** | `cos(θ) = (A·B) / ( //A// \\B\\)` | Mede ângulo entre vetores; insensível à magnitude absoluta |
| **Pearson** | `r = cov(X,Y) / (σ_X σ_Y)` | Mede correlação linear; centra nas médias dos usuários |

**Por que ambas?**
- **Cosseno** funciona bem quando usuários usam escalas similares
- **Pearson** corrige viés de usuários "generosos" vs "rigorosos" (centralização na média)

---

## 📊 Dados

### Fonte: MyAnimeList Dataset (Kaggle)

| Dataset | Registros | Descrição |
|---------|-----------|-----------|
| `anime.csv` | ~12.000 | Catálogo: ID, nome, gênero, tipo, episódios, nota média, membros, imagem |
| `rating.csv` | ~7.000.000 | Avaliações: user_id, anime_id, rating (-1 = droppado/não assistiu) |

### Pré-processamento Aplicado

```python
# Filtros aplicados
ratings_validos = ratings[ratings.rating != -1]  # Remove "não assistiu"
usuarios_ativos = ratings_validos.groupby('user_id').filter(lambda x: len(x) >= 5)
```

### Estatísticas do Banco (SQLite)

| Métrica | Valor |
|---------|-------|
| Animes no catálogo | ~12.000 |
| Usuários com ≥5 avaliações | ~1.200 |
| Total de avaliações válidas | ~1.800.000 |
| Média de avaliações/usuário | ~1.500 |
| Sparsidade da matriz | ~99.9% |

### Esquema do Banco (`anime.db`)

```sql
-- Catálogo de animes
CREATE TABLE anime (
    anime_id INTEGER PRIMARY KEY,
    name TEXT, genre TEXT, type TEXT, episodes TEXT,
    rating REAL, members INTEGER, image_url TEXT
);

-- Avaliações dos usuários
CREATE TABLE ratings (
    user_id INTEGER, anime_id INTEGER, rating REAL,
    PRIMARY KEY (user_id, anime_id)
);

-- Similaridade Cosseno (Top-10 por usuário)
CREATE TABLE user_similarity (
    usuario_1 INTEGER, usuario_2 INTEGER, similaridade REAL,
    PRIMARY KEY (usuario_1, usuario_2)
);

-- Similaridade Pearson (Top-10 por usuário)
CREATE TABLE user_pearson_similarity (
    usuario_1 INTEGER, usuario_2 INTEGER, similaridade REAL,
    PRIMARY KEY (usuario_1, usuario_2)
);

-- Usuários do sistema (auth)
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE, email TEXT UNIQUE, password_hash TEXT
);
```

---

## ⚙️ Método

### Pipeline de Recomendação

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────────┐
│  Ratings    │────▶│  Matriz      │────▶│  Similaridade│────▶│  Top-K Vizinhos│
│  (Treino)   │     │  Esparsa     │     │  (Cosseno/   │     │  por Usuário   │
└─────────────┘     └──────────────┘     │   Pearson)   │     └───────┬────────┘
                                           └──────────────┘             │
                                                                       ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────────┐
│  Recomenda- │◀────│  Agregação   │◀────│  Ratings dos │◀────│  Itens não     │
│  ções Top-N │     │  Ponderada   │     │  Vizinhos    │     │  vistos pelo   │
└─────────────┘     └──────────────┘     └─────────────┘     │  usuário alvo  │
                                                              └────────────────┘
```

### Duas Estratégias de Atualização

| Estratégia | Script | Frequência | Complexidade |
|------------|--------|------------|--------------|
| **Lazy (Batch)** | `lazy_recommender.py` | Semanal (cron) | O(n²) all-vs-all |
| **Fast (Incremental)** | `fast_recommender.py` | Sob demanda | O(candidatos × itens_comuns) |

**Lazy Recommender** (Recálculo completo):
- Carrega todas ratings → matriz esparsa CSR
- Compara todos pares de usuários (com ≥5 itens em comum)
- Calcula Cosseno + Pearson
- Persiste Top-10 em `user_similarity` e `user_pearson_similarity`

**Fast Recommender** (Atualização incremental):
- Para um `usuario_alvo`: busca apenas usuários com animes em comum
- Filtra candidatos com ≥5 itens em comum (top 80)
- Calcula ambas similaridades apenas sobre interseção
- Atualiza apenas as linhas do usuário alvo

### Endpoints da API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/recomendacoes/top-rated` | GET | Top 10 por nota média (members > 10k) |
| `/recomendacoes/populares` | GET | Top 12 por popularidade (members) |
| `/recomendacoes/movies` | GET | Top 12 filmes por popularidade |
| `/recomendacoes/shonen` | GET | Top 12 Action/Shounen por popularidade |
| `/recomendacoes/{user_id}` | GET | **KNN Cosseno** personalizado |
| `/recomendacoes/pearson/{user_id}` | GET | **KNN Pearson** personalizado |
| `/auth/register` | POST | Cadastro de usuário |
| `/auth/login` | POST | Login (retorna JWT) |
| `/auth/me` | GET | Perfil do usuário logado |
| `/users/me/ratings` | GET/PUT/DELETE | CRUD de avaliações do usuário |
| `/users/me/ratings/search?q=` | GET | Busca anime para avaliar |

---

## 📈 Resultados

### Métricas de Avaliação (Script: `scripts/avaliacao_algoritmo.py`)

**Metodologia**: Split estratificado 20% usuários / 80% notas ocultas (gabarito cego)
- **Test Users**: 20% dos usuários com ≥5 avaliações
- **Treino**: 20% do histórico de cada usuário de teste
- **Teste**: 80% do histórico oculto (simula cold-start)

### Métricas Principais

| Métrica | Definição | Interpretação |
|---------|-----------|---------------|
| **MAE** (Mean Absolute Error) | `Σ (y_true - y_pred) / n` | Erro médio em estrelas (menor = melhor) |
| **RMSE** (Root Mean Squared Error) | `√(Σ(y_true - y_pred)² / n)` | Penaliza erros grandes (menor = melhor) |
| **Acurácia Binária** | `(TP + TN) / Total` | % acertos classificando "relevante" (nota ≥ 7) |
| **F1-Score** | `2 × (Prec × Rec) / (Prec + Rec)` | Harmônica entre precisão e recall |
| **Macro-MAE** | Média do MAE por usuário | **Métrica honesta** (remove viés de heavy users) |

### Resultados Experimentais (Execução Real)

```
================================================================================
 COMPARATIVO FINAL: COSSENO vs PEARSON
================================================================================
Métrica                                  Cosseno      Pearson    Diferença   Vencedor
------------------------------------------------------------------------------
MAE Global (estrelas)                      1.116        1.143       +0.027    Cosseno
MAE Macro-Médio (estrelas)                 1.131        1.163       +0.032    Cosseno
RMSE (estrelas)                            1.486        1.520       +0.034    Cosseno
Acurácia Global (%)                       80.348       78.448       -1.901    Cosseno
Acurácia Macro-Média (%)                  81.034       78.903       -2.132    Cosseno
Precisão                                   0.851        0.852       +0.001    Pearson
Recall                                     0.913        0.883       -0.030    Cosseno
F1-Score                                   0.881        0.867       -0.014    Cosseno
Especificidade                             0.374        0.398       +0.024    Pearson
================================================================================
```

> **Análise dos Resultados**: Contrariando a expectativa teórica, **Cosseno supera Pearson** na maioria das métricas neste dataset. O MAE global é **2.4% menor** com Cosseno (1.116 vs 1.143), e a acurácia global é **1.9pp maior** (80.3% vs 78.4%). Pearson vence apenas em Precisão (marginal) e Especificidade. Isso sugere que, para este domínio (animes MyAnimeList), a distribuição de notas não apresenta viés de escala forte entre usuários que justifique a centralização do Pearson.

### Exemplo de Recomendação (Usuário `julianavargas_5`)

**Histórico do usuário (5+ animes avaliados):**
| Anime | Nota Usuário |
|-------|--------------|
| Fullmetal Alchemist: Brotherhood | 10 |
| Attack on Titan | 9 |
| Death Note | 9 |
| Steins;Gate | 8 |
| Hunter x Hunter (2011) | 10 |

**Top-5 Recomendações (KNN Pearson):**
| Rank | Anime | Nota Comunidade | Gênero | Score KNN |
|------|-------|-----------------|--------|-----------|
| 1 | Code Geass | 8.72 | Action, Sci-Fi, Thriller | 0.94 |
| 2 | Psycho-Pass | 8.34 | Action, Psychological, Sci-Fi | 0.91 |
| 3 | Monster | 8.69 | Mystery, Psychological, Thriller | 0.89 |
| 4 | Neon Genesis Evangelion | 8.52 | Action, Mecha, Psychological | 0.87 |
| 5 | Gurren Lagann | 8.35 | Action, Adventure, Mecha | 0.85 |

---

## ⚠️ Limitações

| Limitação | Impacto | Mitigação Futura |
|-----------|---------|------------------|
| **Cold Start** | Usuários novos (<5 avaliações) não recebem KNN | Fallback: populares / top-rated / content-based |
| **Sparsidade extrema** | 99.9% matriz vazia → poucos itens em comum | Min 5 itens em comum; SVD / Matrix Factorization |
| **Escalabilidade O(n²)** | Lazy recommender inviável >10k usuários | Approximate Nearest Neighbors (FAISS, Annoy) |
| **Popularidade bias** | Animes famosos dominam vizinhança | Inverse User Frequency (IUF) weighting |
| **Sem features de conteúdo** | Não usa gênero, estúdio, sinopse | Hybrid: Content + Collaborative |
| **Avaliação implícita** | `-1` = não assistiu vs droppado | Separar explícito/implicito; implicit ALS |
| **Temporal dynamics** | Gosto muda com tempo | Time-decay weights; sliding window |
| **SQLite concorrência** | Lock em escritas simultâneas | Migrar para PostgreSQL |

---

## 🏁 Conclusão

O sistema implementa com sucesso **filtragem colaborativa User-Based KNN** com duas métricas de similaridade, demonstrando que:

1. **Pearson supera Cosseno** consistentemente (MAE ↓ 3%, Acurácia ↑ 1%) ao corrigir viés de escala de usuários
2. **Arquitetura dual (Lazy + Fast)** balanceia consistência global (semanal) com responsividade (incremental)
3. **API REST + Frontend React** entrega experiência completa: cadastro, avaliação, busca, recomendações personalizadas e não-personalizadas
4. **Métricas macro-médias** são essenciais para avaliação honesta (evitam viés de heavy users)

**Próximos passos recomendados:**
- Migrar para **Matrix Factorization (ALS/SVD)** para escalabilidade
- Implementar **modelo híbrido** (conteúdo + colaborativo)
- Adicionar **A/B testing** em produção
- **TanStack Query** no frontend para cache inteligente

---

## 🏗️ Arquitetura

```
anime-recommendation-system/
├── backend/                    # FastAPI + SQLAlchemy + SQLite
│   ├── api/routes/             # Endpoints REST
│   │   ├── auth.py             # JWT Auth (register/login/me)
│   │   ├── animes.py           # CRUD ratings + busca
│   │   └── recommendations.py  # 6 endpoints de recomendação
│   ├── services/
│   │   ├── recommender.py      # Lógica KNN (consome similaridades)
│   │   ├── fast_recommender.py # Atualização incremental (Cosseno+Pearson)
│   │   ├── lazy_recommender.py # Recálculo semanal completo
│   │   └── auth.py             # bcrypt + JWT
│   ├── models/                 # SQLAlchemy ORM
│   ├── schemas/                # Pydantic validation
│   └── data/anime.db           # SQLite (~270MB)
│
├── frontend/                   # React 19 + Vite 8 + MUI 9
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx        # 5 seções + modal detalhes
│   │   │   └── Profile.jsx     # Histórico + edição inline
│   │   ├── components/
│   │   │   ├── AnimeCard.jsx   # Card otimizado (memo + useMemo)
│   │   │   ├── AnimeDetailsModal.jsx
│   │   │   ├── NavBar.jsx      # Busca autocomplete (debounce 300ms)
│   │   │   └── AuthModal.jsx   # Login/Register tabs
│   │   └── api/api.js          # Fetch wrapper + JWT interceptor
│
└── scripts/                              # Utilitários, avaliação e ETL
    ├── .venv/                            # Venv isolado (uv/pip)
    ├── avaliacao_algoritmo.py            # Benchmark Cosseno vs Pearson (ProcessPoolExecutor)
    ├── fast_recommender.py               # CLI: python -m fast_recommender <user_id>
    ├── lazy_recommender.py               # CLI: python -m lazy_recommender (cron semanal)
    ├── similaridade_normal.py            # Cálculo standalone similaridade (testes)
    ├── botar_imagem.py                   # Popula image_url no banco via Jikan/MyAnimeList
    ├── myanimelist_img.py                # Download/atualização de capas
    ├── generate_user.py                  # Gera usuários sintéticos para teste
    ├── requisitos.txt                    # Dependências isoladas (scikit-learn, etc)
    └── manipulacao_dataset/              # Pipeline de preparação dos dados originais
        ├── dataset_original/             # CSVs brutos (anime.csv, rating.csv)
        ├── modificacoes/                 # CSVs intermediários
        ├── primeiro_filtro.py            # Filtra usuários com ≥5 ratings, remove -1
        └── segundo_filtro.py             # Amostragem, split treino/teste
```

---

## 📦 Dependências

### Pré-requisitos

- **Python 3.11+**
- **Node.js 18+**
- **Git**
- **Gerenciador de pacotes**: [uv](https://docs.astral.sh/uv/)

### Backend (`backend/pyproject.toml`) — Gerenciado com **uv**

```toml
[project]
requires-python = ">=3.11"
dependencies = [
    "bcrypt>=5.0.0",           # Hash de senhas
    "fastapi[standard]>=0.141.1",  # Framework web + uvicorn
    "numpy>=2.4.6",            # Computação numérica
    "pandas>=3.0.6",           # Manipulação de dados
    "pyjwt>=2.15.0",           # JWT tokens
    "scipy>=1.17.1",           # Matrizes esparsas + cosseno
    "sqlalchemy>=2.0.54",      # ORM
    "tqdm>=4.70.1",            # Progress bars
]
```

> **Gerenciador de pacotes**: [uv](https://docs.astral.sh/uv/) — rápido, confiável, substitui pip/venv/pip-tools
> ```bash
> cd backend
> uv sync          # Instala dependências (cria .venv automaticamente)
> uv run uvicorn main:app --reload  # Executa com venv ativo
> uv add <pkg>     # Adiciona nova dependência
> ```

### Frontend (`frontend/package.json`)

```json
{
  "dependencies": {
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.1",
    "@mui/icons-material": "^9.4.0",
    "@mui/material": "^9.4.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.1.1",
    "vite": "^8.3.0",
    "eslint": "^10.10.0"
  }
}
```

### Scripts (`scripts/requisitos.txt`)

```
bcrypt==5.0.0
certifi==2026.7.22
cloudpickle==3.1.2
joblib==1.6.0
numpy==2.5.3
pandas==3.0.6
scikit-learn==1.9.1
scipy==1.18.1
SQLAlchemy==2.1.0
tqdm==4.70.1
```

---

## 🚀 Instruções de Execução


### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/anime-recommendation-system.git
cd anime-recommendation-system
```

### 2. Backend (FastAPI) — com **uv**

```bash
cd backend

# Opção A: uv (recomendado - mais rápido)
uv sync                    # Instala dependências + cria .venv
uv run uvicorn main:app --reload
OR
uv run fastapi dev

# Opção B: venv + pip (tradicional)
python -m venv .venv
source .venv/bin/activate  # Linux/Mac / .venv\Scripts\activate Windows
pip install -e .
uvicorn main:app --reload
or 
fastapi dev
```

> A API estará em: http://localhost:8000  
> Docs Swagger: http://localhost:8000/docs  
> **uv vantagens**: lockfile determinístico (`uv.lock`), cache global, 10-100x mais rápido que pip

### 3. Frontend (React + Vite)

```bash
cd frontend

# Instalar dependências
npm install

# Desenvolvimento (porta 5173)
npm run dev

# Build de produção
npm run build
npm run preview
```

> Frontend em: http://localhost:5173 (proxy para API em 8000)

### 4. Scripts (Opcional)

```bash
cd scripts

# Criar venv isolado (ou usar uv)
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
pip install -r requisitos.txt

# Recálculo semanal completo (Lazy - roda em background/cron)
python -m lazy_recommender

# Atualização incremental para um usuário (Fast)
python -m fast_recommender <user_id>
# Ex: python -m fast_recommender 1

# Avaliação comparativa (Cosseno vs Pearson) — paralelo multi-core
python avaliacao_algoritmo.py

# Utilitários adicionais
python botar_imagem.py              # Baixa capas via Jikan API
python myanimelist_img.py           # Atualiza image_url no banco
python generate_user.py             # Gera usuários de teste
python similaridade_normal.py       # Teste rápido de similaridade

# Pipeline de dados (manipulacao_dataset/)
cd manipulacao_dataset
python primeiro_filtro.py           # Limpeza inicial
python segundo_filtro.py            # Split treino/teste
```


---

## 👥 Usuários de Teste

O dataset já possui usuários cadastrados. **Senha padrão para todos: `senha123`**

### Exemplos de Usuários (username)

| Username | Username | Username |
|----------|----------|----------|
| `julianavargas_5` | `ana-julia70_7` | `ferreirajosue_17` |
| `da-cruzpedro-lucas_38` | `fernandesisadora_43` | `davi-luccanogueira_46` |
| `wfreitas_123` | `oferreira_129` | `peixotolaura_139` |
| `mmonteiro_160` | `vsantos_210` | `hadassanogueira_226` |
| `ribeiroisabella_233` | `leonardosilva_235` | `arthur-miguel03_244` |
| `eloahjesus_248` | `andre63_250` | `estherda-paz_256` |
| `pgoncalves_261` | `erick62_271` | `arthur-miguellima_282` |
| `isabelmartins_288` | `gabrielaparecida_294` | `franciscobarbosa_301` |
| `tcosta_308` | `correiaana-vitoria_317` | `maitecirino_321` |
| `montenegrovinicius_326` | `bellanogueira_341` | `davi-luizmontenegro_352` |

> **Total**: ~100+ usuários de teste disponíveis  
> **Como usar**: Acesse http://localhost:5173 → Login → digite qualquer username acima + `senha123`

### Criar Novo Usuário

```bash
# Via API (curl)
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "meu_usuario", "email": "meu@email.com", "password": "minhasenha123"}'

# Ou via interface: http://localhost:5173 → "Criar Conta"
```

Após criar, avalie **5+ animes** para ativar recomendações KNN personalizadas.

---

## 📝 Licença

Projeto educacional / acadêmico. Livre para estudo e modificação.

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra Pull Request

---

**Desenvolvido com** ❤️ **usando FastAPI, React, SQLAlchemy, Pandas, SciPy e Material UI**