import React, { useState } from 'react';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import AuthModal from './components/AuthModal';
import theme from './theme';

// Importe os dados centralizados
import { MOCK_USER, MOCK_USER_HISTORY } from './data/mockData';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userHistory, setUserHistory] = useState([]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);

    // Se for o nosso utilizador mockado principal, carrega as notas dele.
    // Se for um registo novo ou outro email, começa com um array vazio.
    if (userData.email === MOCK_USER.email) {
      setUserHistory(MOCK_USER_HISTORY);
    } else {
      setUserHistory([]);
    }
  };
  const handleUpdateRating = (animeId, newRating) => {
    setUserHistory((prev) =>
      prev.map((item) => (item.anime_id === animeId ? { ...item, userRating: newRating } : item))
    );
  };

  const handleRemoveRating = (animeId) => {
    setUserHistory((prev) => prev.filter((item) => item.anime_id !== animeId));
  };

const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setUserHistory([]);
    setCurrentView('home');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavBar
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={() => setIsAuthOpen(true)}
        onLogoutClick={handleLogout}
        onProfileClick={() => setCurrentView('profile')}
        onHomeClick={() => setCurrentView('home')} // Volta para a Home ao clicar na Logo
      />


      {/* 3. Apenas o CONTEÚDO da página vai dentro do Container */}
      <Container maxWidth="100%" sx={{ mt: 4 }}>
        {currentView === 'home' ? (
          <Home
            isLoggedIn={isLoggedIn}
            userHistory={userHistory} // <-- ADICIONE ESTA LINHA!
            onRateAnime={(anime, rating) => {
              setUserHistory((prev) => {
                const existeNoHistorico = prev.find(item => item.anime_id === anime.anime_id);
                if (existeNoHistorico) {
                  return prev.map(item =>
                    item.anime_id === anime.anime_id ? { ...item, userRating: rating } : item
                  );
                } else {
                  return [...prev, { ...anime, userRating: rating }];
                }
              });
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