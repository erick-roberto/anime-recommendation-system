# Modelos Pydantic (Validação de I/O)
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, Field

# Base compartilhada
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

# 1. Payload que vem no POST /register (Cadastro)
class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

# 2. Payload que vem no POST /login (caso use JSON direto em vez de Form do OAuth2)
class UserLogin(BaseModel):
    username: str
    password: str

# 3. Resposta de Token após o login
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

# 4. Dados embutidos dentro do payload do JWT
class TokenPayload(BaseModel):
    sub: Optional[str] = None

# 5. O que o backend devolve ao consultar o usuário logado (GET /me)
class UserResponse(UserBase):
    user_id: int

    model_config = ConfigDict(from_attributes=True)

class MessageResponse(BaseModel):
    message: str