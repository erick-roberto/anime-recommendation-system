// src/components/AnimeDetailsModal.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Rating,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import TvIcon from '@mui/icons-material/Tv';
import MovieIcon from '@mui/icons-material/Movie';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';

export default function AnimeDetailsModal({
  open,
  onClose,
  anime,
  onRate,
  isLoggedIn,
}) {
  if (!anime) return null;

  // Suporte a diferentes formatos de dados
  const currentRating = anime.userRating ?? null;
  const animeCover = anime.image_url || anime.img || 'https://via.placeholder.com/220x310?text=Sem+Capa';

  const handleRatingChange = (event, newValue) => {
    if (!isLoggedIn || newValue === null) return;
    if (onRate) {
      onRate(anime, newValue);
    }
  };

  // Helper de ícone por tipo de mídia
  const getTypeIcon = (type) => {
    const t = (type || '').toUpperCase();
    if (t === 'MOVIE') return <MovieIcon sx={{ fontSize: 16 }} />;
    if (t === 'OVA' || t === 'SPECIAL') return <OndemandVideoIcon sx={{ fontSize: 16 }} />;
    return <TvIcon sx={{ fontSize: 16 }} />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#161d26',
          color: '#fff',
          borderRadius: 3,
          backgroundImage: 'radial-gradient(circle at top right, rgba(0, 229, 255, 0.08), transparent 400px)',
          border: '1px solid #23303d',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        },
      }}
    >
      {/* Cabeçalho com Fechar */}
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ pr: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>
            {anime.name}
          </Typography>
          {anime.japanese_name && (
            <Typography variant="caption" sx={{ color: '#8b9bb4', display: 'block', mt: 0.3 }}>
              {anime.japanese_name}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} sx={{ color: '#8b9bb4', '&:hover': { color: '#fff', bgcolor: '#23303d' } }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#23303d', p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
          {/* Lado Esquerdo: Poster do Anime */}
          <Box sx={{ flexShrink: 0, mx: { xs: 'auto', sm: 0 }, width: { xs: 200, sm: 220 } }}>
            <Box
              component="img"
              src={animeCover}
              alt={anime.name}
              sx={{
                width: '100%',
                height: { xs: 280, sm: 310 },
                objectFit: 'cover',
                borderRadius: 2.5,
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6)',
                border: '1px solid #2b3947',
              }}
            />
          </Box>

          {/* Lado Direito: Informações e Metadados */}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Chips de Status / Tipo / Episódios */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip
                icon={getTypeIcon(anime.type)}
                label={anime.type || 'TV'}
                size="small"
                sx={{ bgcolor: '#0b0c10', color: '#00e5ff', fontWeight: 700, border: '1px solid #1f2833' }}
              />

              {anime.episodes && (
                <Chip
                  label={`${anime.episodes} ep${anime.episodes > 1 ? 's' : ''}`}
                  size="small"
                  sx={{ bgcolor: '#0b0c10', color: '#fff', border: '1px solid #1f2833' }}
                />
              )}

              {anime.members && (
                <Tooltip title="Membros no MyAnimeList">
                  <Chip
                    icon={<PeopleAltIcon sx={{ fontSize: 16, color: '#8b9bb4 !important' }} />}
                    label={Number(anime.members).toLocaleString('pt-BR')}
                    size="small"
                    sx={{ bgcolor: '#0b0c10', color: '#8b9bb4', border: '1px solid #1f2833' }}
                  />
                </Tooltip>
              )}
            </Box>

            {/* Média da Comunidade */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon sx={{ color: '#ffb400', fontSize: 22 }} />
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#fff' }}>
                {anime.rating || 'N/A'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#8b9bb4' }}>
                (nota média no MyAnimeList)
              </Typography>
            </Box>

            {/* Lista de Gêneros */}
            {anime.genre && (
              <Box>
                <Typography variant="caption" sx={{ color: '#8b9bb4', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.8 }}>
                  Gêneros
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap' }}>
                  {anime.genre.split(',').map((g, idx) => (
                    <Chip
                      key={idx}
                      label={g.trim()}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(0, 229, 255, 0.08)',
                        color: '#66fcf1',
                        border: '1px solid rgba(0, 229, 255, 0.2)',
                        fontSize: '0.75rem',
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}


            {/* Área de Avaliação do Usuário */}
            <Box
              sx={{
                mt: 'auto',
                p: 2,
                bgcolor: '#0b0c10',
                borderRadius: 2.5,
                border: '1px solid #23303d',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ color: '#8b9bb4', fontWeight: 600 }}>
                  Sua Avaliação
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: currentRating ? '#00e5ff' : '#666' }}>
                  {currentRating ? `${currentRating} / 10` : (isLoggedIn ? 'Selecione uma nota' : 'Faça login para avaliar')}
                </Typography>
              </Box>

              <Rating
                max={10}
                precision={0.5}
                value={Number(currentRating) || 0}
                readOnly={!isLoggedIn}
                onChange={handleRatingChange}
                emptyIcon={<StarIcon style={{ opacity: 0.2, color: '#fff' }} fontSize="inherit" />}
                sx={{
                  fontSize: { xs: '1.6rem', sm: '1.9rem' },
                  color: '#00e5ff',
                  alignSelf: { xs: 'center', sm: 'flex-start' },
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, px: 3 }}>
        <Button onClick={onClose} sx={{ color: '#8b9bb4', textTransform: 'none', '&:hover': { color: '#fff' } }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}