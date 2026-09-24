from pathlib import Path
from faker import Faker
from sqlalchemy import create_engine, text
import bcrypt

# Gera o hash uma única vez como string
DUMMY_HASH = bcrypt.hashpw(b"senha123", bcrypt.gensalt()).decode("utf-8")

fake = Faker("pt_BR")
BATCH_SIZE = 5000

def populate_users_from_ratings(engine):
    with engine.connect() as conn:
        # 1. Pega apenas os user_ids de ratings que ainda não existem em users
        query_distinct_users = text("""
            SELECT DISTINCT r.user_id 
            FROM ratings r
            LEFT JOIN users u ON r.user_id = u.user_id
            WHERE u.user_id IS NULL
            ORDER BY r.user_id;
        """)
        
        user_ids = [row[0] for row in conn.execute(query_distinct_users)]
    
    total = len(user_ids)
    if not total:
        print("Nenhum usuário novo para criar.")
        return

    print(f"Gerando perfis fictícios para {total} usuários...")

    users_batch = []
    
    with engine.begin() as conn:
        insert_query = text("""
            INSERT INTO users (user_id, username, email, password_hash)
            VALUES (:user_id, :username, :email, :password_hash)
        """)

        for i, uid in enumerate(user_ids, start=1):
            clean_username = f"{fake.user_name()}_{uid}"
            email = f"{clean_username}@{fake.free_email_domain()}"

            users_batch.append({
                "user_id": uid,
                "username": clean_username,
                "email": email,
                "password_hash": DUMMY_HASH
            })

            # Executa em lotes
            if len(users_batch) >= BATCH_SIZE:
                conn.execute(insert_query, users_batch)
                users_batch.clear()
                print(f"Progresso: {i}/{total} usuários inseridos...")

        # Insere o lote restante
        if users_batch:
            conn.execute(insert_query, users_batch)
            print(f"Progresso: {total}/{total} usuários inseridos.")

    print("Usuários gerados e inseridos com sucesso!")

if __name__ == "__main__":
    engine = create_engine(r"sqlite:///C:\\Users\\Usuario\\Documents\\GitHub\\anime-recommendation-system\\backend\\data\\anime.db")
    populate_users_from_ratings(engine)