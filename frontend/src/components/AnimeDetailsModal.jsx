import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  Button,
  Rating,
  Divider,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import TvIcon from '@mui/icons-material/Tv';
import MovieIcon from '@mui/icons-material/Movie';
import GroupIcon from '@mui/icons-material/Group';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';

export default function AnimeDetailsModal({ open, onClose, anime, onRate, isLoggedIn}) {
  if (!anime) return null;

  // Processa todos os gêneros (sem limite de 3)
  const genresList = Array.isArray(anime.genre)
    ? anime.genre
    : anime.genre
    ? anime.genre.split(',').map((g) => g.trim())
    : [];

  // Formata o número de membros (Ex: 1250000 -> 1.250.000)
  const formattedMembers = anime.members
    ? anime.members.toLocaleString('pt-BR')
    : 'N/A';

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
          borderRadius: 2,
        },
      }}
    >
      {/* Botão de Fechar no canto superior direito */}
      <IconButton
        onClick={onClose}
        sx={{ position: 'absolute', right: 8, top: 8, color: '#aaa' }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ pt: 3 }}>
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
          {/* Imagem do Anime */}
          <Box
            component="img"
            src={anime.img || anime.image_url || 'https://via.placeholder.com/200x280?text=Sem+Capa'}
            alt={anime.name}
            sx={{
              width: { xs: '100%', sm: 180 },
              height: 250,
              objectFit: 'cover',
              borderRadius: 1.5,
            }}
          />

          {/* Informações do Anime */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, color: '#fff' }}>
              {anime.name}
            </Typography>

            {/* Média da Comunidade */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <StarIcon sx={{ color: '#ffb400' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {anime.score || anime.rating || 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                / 10 (MyAnimeList)
              </Typography>
            </Box>

            {/* Chips de Informações Principais */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                icon={<TvIcon sx={{ fontSize: '1rem !important', color: '#00e5ff' }} />}
                label={anime.type || 'TV'}
                size="small"
                sx={{ bgcolor: '#0b0c10', color: '#fff' }}
              />
              <Chip
                icon={<MovieFilterIcon sx={{ fontSize: '1rem !important', color: '#7c4dff' }} />}
                label={`${anime.episodes || '?'} ep(s)`}
                size="small"
                sx={{ bgcolor: '#0b0c10', color: '#fff' }}
              />
              <Chip
                icon={<GroupIcon sx={{ fontSize: '1rem !important', color: '#ff5252' }} />}
                label={`${formattedMembers} membros`}
                size="small"
                sx={{ bgcolor: '#0b0c10', color: '#fff' }}
              />
            </Box>

            <Divider sx={{ my: 1.5, borderColor: '#333' }} />

            {/* Lista Completa de Gêneros */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Gêneros:
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {genresList.map((genre, idx) => (
                <Chip
                  key={idx}
                  label={genre}
                  size="small"
                  sx={{
                    bgcolor: '#0b0c10',
                    color: '#00e5ff',
                    border: '1px solid #333',
                    fontSize: '0.75rem',
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2.5, borderColor: '#333' }} />

        {/* Campo para o usuário dar a nota no Modal */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ color: isLoggedIn ? '#00e5ff' : '#aaa' }}>
            {/* 2. Muda o texto se não estiver logado */}
            {isLoggedIn ? 'Sua Avaliação para este Anime:' : 'Faça login para poder avaliar'}
          </Typography>
          
          <Rating
            size="medium"
            precision={1}
            value={anime.userRating || null}
            readOnly={!isLoggedIn} // <-- 3. BLOQUEIA O CLIQUE SE FOR FALSE!
            onChange={(e, val) => {
              if (onRate) onRate(anime, val);
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" color="inherit">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}