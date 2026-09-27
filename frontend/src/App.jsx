import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Container, Box, CircularProgress } from '@mui/material';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AuthModal from './components/AuthModal';
import theme from './theme';

// Importa os serviços reais
import { authService, userService } from './api/auth_api'

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
  const handleUpdateRating = async (animeId, newRating) => {
    setUserHistory((prev) =>
      prev.map((item) =>
        item.anime_id === animeId ? { ...item, userRating: newRating } : item
      )
    );

    try {
      await userService.upsertRating(animeId, newRating);
    } catch (err) {
      console.error('Erro ao atualizar nota:', err);
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