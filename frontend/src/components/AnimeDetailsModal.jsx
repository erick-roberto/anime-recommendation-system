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
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

export default function AnimeDetailsModal({
  open,
  onClose,
  anime,
  onRate,
  isLoggedIn,
}) {
  if (!anime) return null;

  const currentRating = anime.userRating ?? null;

  const handleRatingChange = (event, newValue) => {
    if (!isLoggedIn || newValue === null) return;
    if (onRate) {
      onRate(anime, newValue);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1f2833',
          color: '#fff',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.4rem' }}>
        {anime.name}
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: '#333' }}>
        {/* Informações básicas: Gênero, Tipo, Média da comunidade */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {anime.genre &&
            anime.genre.split(',').map((g, idx) => (
              <Chip
                key={idx}
                label={g.trim()}
                size="small"
                sx={{ bgcolor: '#0b0c10', color: '#00e5ff', border: '1px solid #333' }}
              />
            ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <StarIcon sx={{ color: '#ffb400', fontSize: 20 }} />
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Média da Comunidade: {anime.score || anime.rating || 'N/A'}
          </Typography>
        </Box>

        {/* Avaliação do Usuário (Escala 0 a 10) */}
        <Box
          sx={{
            p: 2,
            bgcolor: '#0b0c10',
            borderRadius: 2,
            border: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ color: '#aaa' }}>
              Sua Avaliação:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: currentRating ? '#00e5ff' : '#666' }}>
              {currentRating ? `${currentRating} / 10` : (isLoggedIn ? 'Toque nas estrelas para avaliar' : 'Faça login para avaliar')}
            </Typography>
          </Box>

          <Rating
            max={10}
            precision={0.5}
            value={Number(currentRating) || 0}
            readOnly={!isLoggedIn}
            onChange={handleRatingChange}
            sx={{
              fontSize: '1.8rem',
              '& .MuiRating-iconEmpty': {
                color: '#333e48',
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ color: '#aaa', '&:hover': { color: '#fff' } }}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}