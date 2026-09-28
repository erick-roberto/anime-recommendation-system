import React from 'react';
import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Rating,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';

export default function AnimeCard({ anime, isRanked = false, onClick }) {
  // Suporta Array ou String separada por vírgula (até 3 itens)
  const genresList = Array.isArray(anime.genre)
    ? anime.genre.slice(0, 3)
    : anime.genre
    ? anime.genre.split(',').map((g) => g.trim()).slice(0, 3)
    : [];

  const currentUserRating = anime.userRating ?? anime.rating ?? null;

  return (
    <Card
      onClick={onClick}
      sx={{
        width: 220, // Largura ideal para acomodar 10 estrelas confortavelmente
        flexShrink: 0,
        backgroundColor: '#1f2833',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': onClick ? { transform: 'translateY(-6px)' } : {},
      }}
    >
      {/* Badge de Posição (Ex: Top 10) */}
      {isRanked && anime.rank && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 2,
            backgroundColor: '#7c4dff',
            color: '#fff',
            fontWeight: 'bold',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 3,
            fontSize: '0.85rem',
          }}
        >
          #{anime.rank}
        </Box>
      )}

      {/* Capa do Anime */}
      <CardMedia
        component="img"
        height="290"
        image={anime.image_url}
        alt={anime.name}
        sx={{ objectFit: 'cover' }}
      />

      {/* Conteúdo */}
      <CardContent sx={{ p: 1.5, pb: 0.5 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 'bold', color: '#fff', lineHeight: 1.2 }}
          noWrap
          title={anime.name}
        >
          {anime.name}
        </Typography>

        {/* Média da Comunidade */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <StarIcon sx={{ fontSize: 16, color: '#ffb400' }} />
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#fff' }}>
            {anime.score || anime.rating || 'N/A'}
          </Typography>
        </Box>

        {/* Chips de Gêneros (Até 3) */}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
          {genresList.map((genre, index) => (
            <Chip
              key={index}
              label={genre}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                bgcolor: '#0b0c10',
                color: '#00e5ff',
                border: '1px solid #333',
              }}
            />
          ))}
        </Box>
      </CardContent>

      {/* Avaliação do Usuário (10 estrelas ajustadas) */}
      <CardActions sx={{ px: 1.5, pb: 1.5, pt: 1, flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Sua Nota:
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 'bold', color: currentUserRating ? '#00e5ff' : '#666' }}>
            {currentUserRating ? `${currentUserRating}/10` : 'Sem nota'}
          </Typography>
        </Box>

        <Rating
          max={10}
          precision={0.5}
          value={Number(currentUserRating) || 0}
          readOnly
          sx={{
            fontSize: '1.05rem', // ~16.8px por estrela
            '& .MuiRating-icon': {
              mr: '1px', // Espaçamento compacto para não vazar a borda
            },
            '& .MuiRating-iconEmpty': {
              color: '#333e48', // Contorno visível no fundo escuro
            },
          }}
        />
      </CardActions>
    </Card>
  );
}