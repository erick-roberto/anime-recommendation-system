import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Chip,
  CircularProgress,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import FlameIcon from '@mui/icons-material/Whatshot';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import TheatersIcon from '@mui/icons-material/Theaters';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import AnimeCard from '../components/AnimeCard';
import AnimeDetailsModal from '../components/AnimeDetailsModal';
import { animeService } from '../api/api';

// Componente Reutilizável de Título de Seção - memoizado
const SectionHeader = memo(function SectionHeader({ icon, title, subtitle, badgeText }) {
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
});

// Fileira Horizontal com Rolagem Suave - memoizada
const HorizontalRow = memo(function HorizontalRow({ children }) {
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
});

export default function Home({
  isLoggedIn = false,
  user = null,
  userHistory = [],
  onRateAnime,
}) {
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados dos catálogos
  const [loading, setLoading] = useState(true);
  const [popularAnimes, setPopularAnimes] = useState([]);
  const [topRatedAnimes, setTopRatedAnimes] = useState([]);
  const [shonenAnimes, setShonenAnimes] = useState([]);
  const [movieAnimes, setMovieAnimes] = useState([]);
  const [recommendedAnimes, setRecommendedAnimes] = useState([]);
  const [pearsonAnimes, setPearsonAnimes] = useState([]);

  // 1. Carrega todas as seções públicas simultaneamente
  const loadPublicSections = useCallback(async () => {
    setLoading(true);
    try {
      const [populares, topRated, shonen, movies] = await Promise.all([
        animeService.getPopulares().catch(() => []),
        animeService.getTopRated().catch(() => []),
        animeService.getShonen().catch(() => []),
        animeService.getFilmes().catch(() => []),
      ]);

      setPopularAnimes(Array.isArray(populares) ? populares : []);
      setTopRatedAnimes(Array.isArray(topRated) ? topRated : []);
      setShonenAnimes(Array.isArray(shonen) ? shonen : []);
      setMovieAnimes(Array.isArray(movies) ? movies : []);
    } catch (err) {
      console.error('Erro ao carregar seções públicas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicSections();
  }, [loadPublicSections]);

  // 2. Busca recomendações do KNN caso logado e com 5+ avaliações
  useEffect(() => {
    const userId = user?.user_id || user?.id;

    if (isLoggedIn && userId && userHistory.length >= 5) {
      // Promise.all dispara as duas requisições ao mesmo tempo
      Promise.all([
        animeService.getRecomendados(userId).catch(() => []),
        animeService.getPearsonRecommendations(userId).catch(() => [])
      ])
        .then(([cossenoData, pearsonData]) => {
          // Função auxiliar para formatar os dados e evitar repetição de código
          const formatData = (data) => (Array.isArray(data) ? data : []).map((item) => ({
            anime_id: item.anime_id,
            name: item.nome || item.name,
            genre: item.genre || '',
            type: item.type || 'TV',
            rating: item.score ?? item.rating ?? null,
            members: item.members ?? null,
            image_url: item.image_url,
          }));

          setRecommendedAnimes(formatData(cossenoData));
          setPearsonAnimes(formatData(pearsonData));
        })
        .catch((err) => {
          console.error('Erro ao carregar recomendações:', err);
          setRecommendedAnimes([]);
          setPearsonAnimes([]);
        });
    } else {
      setRecommendedAnimes([]);
      setPearsonAnimes([]);
    }
  }, [isLoggedIn, user, userHistory.length]);

  // Mapeia a nota dada pelo usuário para dentro do card - MEMOIZADO
  const getAnimeWithRating = useCallback((anime) => {
    if (!anime) return null;
    const animeId = anime.anime_id || anime.id;

    // Procura no histórico atualizado
    const historyItem = userHistory.find(
      (item) => (item.anime_id || item.id) === animeId
    );

    return {
      ...anime,
      userRating: historyItem ? (historyItem.userRating ?? historyItem.rating) : null,
    };
  }, [userHistory]);

  // Versão memoizada para usar no render (evita criar nova função a cada render)
  const getAnimeWithRatingMemo = useMemo(
    () => getAnimeWithRating,
    [getAnimeWithRating]
  );

  const handleOpenDetails = (anime) => {
    setSelectedAnime(anime);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAnime(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 14 }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pb: 6 }}>
      {/* BANNER DE BOAS-VINDAS / CALIBRAÇÃO DO KNN */}
      {(!isLoggedIn || userHistory.length < 5) && (
        <Box
          sx={{
            p: 3,
            mb: 4,
            mt: 2,
            background: 'linear-gradient(135deg, #7c4dff 0%, #00e5ff 100%)',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 229, 255, 0.2)',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff', mb: 1 }}>
            Descubra novos animes com IA! 🍿
          </Typography>
          <Typography variant="body1" sx={{ color: '#fff', mb: 2, fontWeight: 500 }}>
            {isLoggedIn
              ? `Você avaliou ${userHistory.length}/5 animes necessários para calibrar o modelo KNN. Avalie mais títulos abaixo para liberar suas recomendações!`
              : 'Entre na sua conta e avalie 5 animes para receber recomendações por filtragem colaborativa baseadas no seu perfil.'}
          </Typography>

          <HorizontalRow>
            {popularAnimes.slice(0, 8).map((anime) => (
              <AnimeCard
                key={anime.anime_id}
                anime={getAnimeWithRatingMemo(anime)}
                onClick={() => handleOpenDetails(anime)}
              />
            ))}
          </HorizontalRow>
        </Box>
      )}

      {/* SEÇÃO 1: RECOMENDADOS (KNN) */}
      {isLoggedIn && recommendedAnimes.length > 0 && (
        <>
          <SectionHeader
            icon={<AutoAwesomeIcon sx={{ color: '#00e5ff', fontSize: 30 }} />}
            title="Recomendados Para Você"
            badgeText="KNN Ativo"
            subtitle="Calculado a partir de usuários com notas parecidas com as suas"
          />
          <HorizontalRow>
            {recommendedAnimes.map((anime) => (
              <AnimeCard
                key={anime.anime_id}
                anime={getAnimeWithRatingMemo(anime)}
                onClick={() => handleOpenDetails(anime)}
              />
            ))}
          </HorizontalRow>
        </>
      )}

      {/* SEÇÃO 1.5: RECOMENDADOS (KNN - PEARSON) */}
      {isLoggedIn && pearsonAnimes.length > 0 && (
        <>
          <SectionHeader
            icon={<AutoAwesomeIcon sx={{ color: '#ff4081', fontSize: 30 }} />} // Cor rosa para diferenciar
            title="Gostos Refinados"
            badgeText="Pearson Ativo"
            subtitle="Recomendações com alta precisão usando correlação de Pearson"
          />
          <HorizontalRow>
            {pearsonAnimes.map((anime) => (
              <AnimeCard
                key={`pea-${anime.anime_id}`}
                anime={getAnimeWithRatingMemo(anime)}
                onClick={() => handleOpenDetails(anime)}
              />
            ))}
          </HorizontalRow>
        </>
      )}

      {/* SEÇÃO 2: TOP 10 MELHORES */}
      <SectionHeader
        icon={<StarIcon sx={{ color: '#ffb400', fontSize: 30 }} />}
        title="Top 10 Melhores Animes"
        subtitle="As maiores médias de notas atribuídas pela comunidade"
      />
      <HorizontalRow>
        {topRatedAnimes.map((anime, index) => (
          <AnimeCard
            key={anime.anime_id}
            anime={{ ...getAnimeWithRatingMemo(anime), rank: index + 1 }}
            isRanked
            onClick={() => handleOpenDetails(anime)}
          />
        ))}
      </HorizontalRow>

      {/* SEÇÃO 3: MAIS POPULARES */}
      <SectionHeader
        icon={<FlameIcon sx={{ color: '#ff5252', fontSize: 30 }} />}
        title="Favoritos da Galera"
        subtitle="Os animes com maior número de membros registrados"
      />
      <HorizontalRow>
        {popularAnimes.map((anime) => (
          <AnimeCard
            key={anime.anime_id}
            anime={getAnimeWithRatingMemo(anime)}
            onClick={() => handleOpenDetails(anime)}
          />
        ))}
      </HorizontalRow>

      {/* SEÇÃO 4: SHONEN & AÇÃO */}
      <SectionHeader
        icon={<FlashOnIcon sx={{ color: '#7c4dff', fontSize: 30 }} />}
        title="Shonen & Ação em Alta"
        subtitle="Os títulos do gênero de ação mais populares do catálogo"
      />
      <HorizontalRow>
        {shonenAnimes.map((anime) => (
          <AnimeCard
            key={anime.anime_id}
            anime={getAnimeWithRatingMemo(anime)}
            onClick={() => handleOpenDetails(anime)}
          />
        ))}
      </HorizontalRow>

      {/* SEÇÃO 5: FILMES CONSAGRADOS */}
      <SectionHeader
        icon={<TheatersIcon sx={{ color: '#00e5ff', fontSize: 30 }} />}
        title="Filmes em Destaque"
        subtitle="Longas-metragens de animação aclamados pela crítica"
      />
      <HorizontalRow>
        {movieAnimes.map((anime) => (
          <AnimeCard
            key={anime.anime_id}
            anime={getAnimeWithRatingMemo(anime)}
            onClick={() => handleOpenDetails(anime)}
          />
        ))}
      </HorizontalRow>

      {/* MODAL DE DETALHES E AVALIAÇÃO */}
      <AnimeDetailsModal
        open={isModalOpen}
        onClose={handleCloseModal}
        // Passa sempre o anime re-calculado com base no userHistory atual
        anime={getAnimeWithRatingMemo(selectedAnime)}
        onRate={(animeTarget, newRating) => {
          const targetId = animeTarget.anime_id || animeTarget.id;
          if (onRateAnime) {
            onRateAnime(animeTarget, newRating);
          }
          // Atualiza também o selectedAnime para o modal não piscar com valor antigo
          setSelectedAnime((prev) => prev ? { ...prev, userRating: newRating } : null);
        }}
        isLoggedIn={isLoggedIn}
      />
    </Container>
  );
}