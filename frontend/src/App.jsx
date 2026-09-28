import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Container, Box, CircularProgress } from '@mui/material';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AuthModal from './components/AuthModal';
import theme from './theme';

// Importa os serviços reais
import { authService, userService } from './api/api'

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);

  // 1. EFEITO DE INICIALIZAÇÃO: Mantém logado ao dar reload
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        // Valida o token no backend e traz os dados do usuário autenticado
        const userData = await authService.getMe();
        setUser(userData);
        setIsLoggedIn(true);

        // Busca o histórico real de notas do usuário no banco
        const ratings = await userService.getRatings().catch(() => []);
        setUserHistory(Array.isArray(ratings) ? ratings : []);
      } catch (err) {
        // Se o token estiver expirado ou inválido, limpa a sessão
        console.warn('Sessão expirada ou inválida:', err);
        authService.logout();
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();
  }, []);

  // 2. SUCESSO NO LOGIN (chamado pelo AuthModal)
  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    setIsLoggedIn(true);

    try {
      const ratings = await userService.getRatings().catch(() => []);
      setUserHistory(Array.isArray(ratings) ? ratings : []);
    } catch {
      setUserHistory([]);
    }
  };

  // 3. ATUALIZAR NOTA (sincroniza com o backend)
  const handleUpdateRating = async (animeTarget, newRating) => {
  // 1. Descobre se veio o objeto completo ou apenas o ID
  const isObject = typeof animeTarget === 'object' && animeTarget !== null;
  const animeId = isObject ? (animeTarget.anime_id || animeTarget.id) : animeTarget;
  const animeData = isObject ? animeTarget : {};

  // 2. Atualiza o estado preservando ou adicionando os metadados
  setUserHistory((prev) => {
    const existingIndex = prev.findIndex(
      (item) => (item.anime_id || item.id) === animeId
    );

    if (existingIndex >= 0) {
      // Se já existia, atualiza apenas as notas mantendo name, genre, etc.
      return prev.map((item, idx) =>
        idx === existingIndex
          ? { ...item, userRating: newRating, rating: newRating }
          : item
      );
    } else {
      // SE FOR NOVO: injeta os dados visuais completos vindos do Card/Modal!
      return [
        ...prev,
        {
          ...animeData, // <-- Garante name, genre, type, img, etc.
          anime_id: animeId,
          name: animeData.name || animeData.nome || `Anime #${animeId}`,
          genre: animeData.genre || '',
          type: animeData.type || 'TV',
          img: animeData.img || animeData.image_url || '',
          userRating: newRating,
          rating: newRating,
        },
      ];
    }
  });

  // 3. Persiste no banco de dados via API
  try {
    await userService.upsertRating(animeId, newRating);
  } catch (err) {
    console.error('Erro ao salvar avaliação no backend:', err);
  }
};

  // 4. REMOVER NOTA (sincroniza com o backend)
  const handleRemoveRating = async (animeId) => {
    setUserHistory((prev) => prev.filter((item) => item.anime_id !== animeId));

    try {
      await userService.deleteRating(animeId);
    } catch (err) {
      console.error('Erro ao remover nota:', err);
    }
  };

  // 5. LOGOUT
  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    setUser(null);
    setUserHistory([]);
    setCurrentView('home');
  };

  // Evita "piscar" a tela de login enquanto valida o token
  if (isInitializing) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0b0c10' }}>
          <CircularProgress color="secondary" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavBar
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={() => setIsAuthOpen(true)}
        onLogoutClick={handleLogout}
        onProfileClick={() => setCurrentView('profile')}
        onHomeClick={() => setCurrentView('home')}
      />

      <Container maxWidth="100%" sx={{ mt: 4 }}>
        {currentView === 'home' ? (
          <Home
            isLoggedIn={isLoggedIn}
            user={user}
            userHistory={userHistory}
            onRateAnime={(anime, rating) => {
              const animeId = anime.anime_id || anime.id;
              handleUpdateRating(animeId, rating);
            }}
          />
        ) : (
          <Profile
            user={user}
            history={userHistory}
            onUpdateRating={handleUpdateRating}
            onRemoveRating={handleRemoveRating}
          />
        )}

        <AuthModal
          open={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </Container>
    </ThemeProvider>
  );
}