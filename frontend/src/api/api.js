// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Função auxiliar genérica para padronizar chamadas e tratamento de erros
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('access_token');

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Tratamento de token inválido/expirado
  if (response.status === 401) {
    localStorage.removeItem('access_token');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Trata mensagens de erro do FastAPI (strings ou lista de validação do Pydantic)
    let errorMessage = 'Erro ao processar requisição';
    if (data?.detail) {
      if (Array.isArray(data.detail)) {
        errorMessage = data.detail.map((err) => err.msg).join(', ');
      } else if (typeof data.detail === 'string') {
        errorMessage = data.detail;
      }
    }
    throw new Error(errorMessage);
  }

  return data;
}

export const authService = {
  // 1. Cadastro (POST JSON para /auth/register)
  register: async ({ username, email, password }) => {
    return request('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });
  },

  // 2. Login (POST Form-URL-Encoded para OAuth2PasswordRequestForm em /auth/login)
  login: async ({ username, password }) => {
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);

    const data = await request('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (data?.access_token) {
      localStorage.setItem('access_token', data.access_token);
    }
    return data;
  },

  // 3. Usuário logado (GET com Bearer token para /auth/me)
  getMe: async () => {
    return request('/auth/me');
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },
};

export const userService = {
  // Busca o perfil do usuário logado
  getProfile: async () => {
    return request('/auth/me');
  },

  // Busca o histórico de avaliações do usuário logado
  getRatings: async () => {
    return request('/users/me/ratings');
  },

  // Atualiza ou insere uma nota para um anime
  upsertRating: async (animeId, rating) => {
    return request(`/users/me/ratings/${animeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rating }),
    });
  },

  // Remove a nota de um anime
  deleteRating: async (animeId) => {
    return request(`/users/me/ratings/${animeId}`, {
      method: 'DELETE',
    });
  },
};

export const animeService = {
  getTopRated: () => request('/recomendacoes/top-rated'),
  getPopulares: () => request('/recomendacoes/populares'),
  getFilmes: () => request('/recomendacoes/movies'),
  getShonen: () => request('/recomendacoes/shonen'), // <-- Adicione esta linha
  getRecomendados: (userId) => request(`/recomendacoes/${userId}`),
  searchAnimes: (query) => request(`/users/me/ratings/search?q=${encodeURIComponent(query)}`),
};