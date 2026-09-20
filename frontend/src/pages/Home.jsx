import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import FlameIcon from '@mui/icons-material/Whatshot';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AnimeCard from '../components/AnimeCard';
import AnimeDetailsModal from '../components/AnimeDetailsModal';

import { MOCK_HOME_SECTIONS } from '../data/mockData';

// Componente Reutilizável de Título de Seção
function SectionHeader({ icon, title, subtitle, badgeText }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, mt: 4 }}>
      {icon}
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#fff' }}>
            {title}
          </Typography>
          {badgeText && <Chip label={badgeText} color="primary" size="small" />}
        </Box>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

// Fileira Horizontal com Rolagem Suave
function HorizontalRow({ children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2.5,
        overflowX: 'auto',
        pb: 2,
        pt: 0.5,
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: '#333', borderRadius: 4 },
      }}
    >
      {children}
    </Box>
  );
}

export default function Home({ isLoggedIn = false, userHistory = [], onRateAnime }) {
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Injeta a nota do usuário caso o anime já esteja no histórico
  const getAnimeWithRating = (anime) => {
    if (!anime) return null;
    const historyItem = userHistory.find((item) => item.anime_id === anime.anime_id);
    return {
      ...anime,
      userRating: historyItem ? historyItem.userRating : null, 
    };
  };

  const handleOpenDetails = (anime) => {
    setSelectedAnime(anime);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAnime(null);
  };

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>

      {/* BANNER DE COLD START: Só aparece se o usuário for novo/sem avaliações */}
      {userHistory.length === 0 && (
        <Box sx={{
          p: 3,
          mb: 4,
          mt: 2,
          background: 'linear-gradient(135deg, #7c4dff 0%, #00e5ff 100%)',
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 229, 255, 0.2)'
        }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff', mb: 1 }}>
            Bem-vindo ao AnimeRecs! 🍿
          </Typography>
          <Typography variant="body1" sx={{ color: '#fff', mb: 2, fontWeight: 500 }}>
            Nosso algoritmo precisa conhecer o seu gosto. Avalie alguns dos animes mais populares abaixo para recebermos recomendações precisas feitas pelo nosso KNN:
          </Typography>

          <HorizontalRow>
            {MOCK_HOME_SECTIONS.popular.map((anime) => (
              <AnimeCard
                key={anime.anime_id}
                anime={getAnimeWithRating(anime)}
                onClick={() => handleOpenDetails(anime)}
              />
            ))}
          </HorizontalRow>
        </Box>
      )}

      {/* SEÇÃO 1: Para Você (Só aparece quando o usuário já tem histórico) */}
      {userHistory.length > 0 && (
        <>
          <SectionHeader
            icon={<AutoAwesomeIcon sx={{ color: '#00e5ff', fontSize: 30 }} />}
            title="Para Você"
            badgeText="KNN Ativo"
            subtitle="Recomendações baseadas na similaridade das suas avaliações"
          />
          <HorizontalRow>
            {MOCK_HOME_SECTIONS.forYou.map((anime) => (
              <AnimeCard
                key={anime.anime_id}
                anime={getAnimeWithRating(anime)} 
                onClick={() => handleOpenDetails(anime)}
              />
            ))}
          </HorizontalRow>
        </>
      )}

      {/* AS PRÓXIMAS SEÇÕES APARECEM PARA TODOS OS USUÁRIOS */}

      {/* SEÇÃO 2: Top 10 */}
      <SectionHeader
        icon={<StarIcon sx={{ color: '#ffb400', fontSize: 30 }} />}
        title="Top 10 Melhores Animes"
        subtitle="Animes com as maiores médias da comunidade"
      />
      <HorizontalRow>
        {MOCK_HOME_SECTIONS.top10.map((anime) => (
          <AnimeCard
            key={anime.anime_id}
            anime={getAnimeWithRating(anime)} 
            isRanked
            onClick={() => handleOpenDetails(anime)}
          />
        ))}
      </HorizontalRow>

      {/* SEÇÃO 3: Populares */}
      <SectionHeader
        icon={<FlameIcon sx={{ color: '#ff5252', fontSize: 30 }} />}
        title="Favoritos da Galera"
        subtitle="Os animes mais populares e avaliados da plataforma"
      />
      <HorizontalRow>
        {MOCK_HOME_SECTIONS.popular.map((anime) => (
          <AnimeCard
            key={anime.anime_id}
            anime={getAnimeWithRating(anime)}
            onClick={() => handleOpenDetails(anime)}
          />
        ))}
      </HorizontalRow>

      {/* SEÇÃO 4: Recentes */}
      <SectionHeader
        icon={<NewReleasesIcon sx={{ color: '#7c4dff', fontSize: 30 }} />}
        title="Mais Recentes"
        subtitle="Últimos lançamentos adicionados ao catálogo"
      />
      <HorizontalRow>
        {MOCK_HOME_SECTIONS.recent.map((anime) => (
          <AnimeCard
            key={anime.anime_id}
            anime={getAnimeWithRating(anime)}
            onClick={() => handleOpenDetails(anime)}
          />
        ))}
      </HorizontalRow>

      {/* MODAL: Isolado de qualquer condicional. Pronto para ser aberto sempre! */}
      <AnimeDetailsModal
        open={isModalOpen}
        onClose={handleCloseModal}
        anime={getAnimeWithRating(selectedAnime)} 
        onRate={onRateAnime}
        isLoggedIn={isLoggedIn}
      />

    </Container>
  );
}