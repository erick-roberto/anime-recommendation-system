import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Container, Box, CircularProgress } from '@mui/material';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AuthModal from './components/AuthModal';
import theme from './theme';
import { authService, userService } from './api/api';
import AnimeDetailsModal from './components/AnimeDetailsModal';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userHistory, setUserHistory] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenAnimeModal = (anime) => {
    setSelectedAnime(anime);
    setIsModalOpen(true);
  };

  // 1. EFEITO DE INICIALIZAÇÃO: Mantém logado ao dar reload
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsInitializing(false);
        return;
      }

      try {
        const userData = await authService.getMe();
        setUser(userData);
        setIsLoggedIn(true);

        const ratings = await userService.getRatings().catch(() => []);
        setUserHistory(Array.isArray(ratings) ? ratings : []);
      } catch (err) {
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
    const isObject = typeof animeTarget === 'object' && animeTarget !== null;
    const animeId = isObject ? (animeTarget.anime_id || animeTarget.id) : animeTarget;
    const animeData = isObject ? animeTarget : {};

    setUserHistory((prev) => {
      const existingIndex = prev.findIndex(
        (item) => (item.anime_id || item.id) === animeId
      );

      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, userRating: newRating, rating: newRating }
            : item
        );
      } else {
        return [
          ...prev,
          {
            ...animeData,
            anime_id: animeId,
            name: animeData.name || animeData.nome || `Anime #${animeId}`,
            genre: animeData.genre || '',
            type: animeData.type || 'TV',
            img: animeData.img || animeData.image_url || '',
            image_url: animeData.image_url || animeData.img || '',
            userRating: newRating,
            rating: newRating,
          },
        ];
      }
    });

    try {
      await userService.upsertRating(animeId, newRating);
    } catch (err) {
      console.error('Erro ao salvar avaliação no backend:', err);
    }
  };

  // 4. REMOVER NOTA (sincroniza com o backend)
  const handleRemoveRating = async (animeId) => {
    setUserHistory((prev) => prev.filter((item) => (item.anime_id || item.id) !== animeId));

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

  // Recupera a nota que o usuário já deu para o anime selecionado (se houver)
  const currentSelectedRating = selectedAnime
    ? userHistory.find(
        (item) => (item.anime_id || item.id) === (selectedAnime.anime_id || selectedAnime.id)
      )?.rating || 0
    : 0;

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
        onHomeClick={() => setCurrentView('home')}
        onProfileClick={() => setCurrentView('profile')}
        onLoginClick={() => setIsAuthOpen(true)} // <-- 2. Corrigido de setIsAuthModalOpen para setIsAuthOpen
        onLogoutClick={handleLogout}
        onSelectAnime={handleOpenAnimeModal}
      />

      {/* Modal acionado pela busca da Navbar ou cliques nos cards */}
      {selectedAnime && (
        <AnimeDetailsModal
          open={isModalOpen}
          anime={selectedAnime}
          currentRating={currentSelectedRating}
          onClose={() => setIsModalOpen(false)}
          onRate={(id, score) => handleUpdateRating(selectedAnime, score)}
        />
      )}

      <Container maxWidth="100%" sx={{ mt: 4, mb: 4 }}>
        {currentView === 'home' ? (
          <Home
            isLoggedIn={isLoggedIn}
            user={user}
            userHistory={userHistory}
            onRateAnime={(anime, rating) => {
              handleUpdateRating(anime, rating);
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