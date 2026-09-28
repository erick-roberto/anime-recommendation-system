import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Avatar,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Rating,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import MovieIcon from '@mui/icons-material/Movie';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function Profile({
  user = null,
  history = [],
  onUpdateRating,
  onRemoveRating,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const displayName = user?.username || user?.name || 'Usuário';
  const displayEmail = user?.email || '';

  // Filtra por nome com segurança contra valores nulos/indefinidos
  const filteredHistory = (Array.isArray(history) ? history : []).filter((item) =>
    (item?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Profile.jsx - user:', user);
  console.log('Profile.jsx - history:', history);

  // Média defensiva (apenas números válidos entre 0 e 10)
  const averageRating =
    history.length > 0
      ? (
          history.reduce((acc, curr) => {
            const val = Number(curr?.userRating ?? curr?.rating) || 0;
            return acc + val;
          }, 0) / history.length
        ).toFixed(1)
      : '0.0';

  return (
    <Container maxWidth="lg" sx={{ pt: 3, pb: 6 }}>
      {/* 1. CABEÇALHO DO PERFIL */}
      <Paper
        elevation={3}
        sx={{
          p: 3,
          mb: 4,
          backgroundColor: '#1f2833',
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Avatar
            sx={{
              width: 72,
              height: 72,
              bgcolor: '#7c4dff',
              fontSize: 32,
              fontWeight: 'bold',
            }}
          >
            {displayName[0]?.toUpperCase() || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#fff' }}>
              {displayName}
            </Typography>
            {displayEmail && (
              <Typography variant="body2" color="text.secondary">
                {displayEmail}
              </Typography>
            )}
            <Chip
              icon={<AutoAwesomeIcon sx={{ fontSize: '0.9rem !important' }} />}
              label={history.length >= 5 ? 'KNN Calibrado' : `Calibrando KNN (${history.length}/5)`}
              size="small"
              color={history.length >= 5 ? 'secondary' : 'default'}
              sx={{ mt: 1, fontWeight: 'bold' }}
            />
          </Box>
        </Box>

        {/* ESTATÍSTICAS REAIS */}
        <Grid container spacing={2} sx={{ maxWidth: { sm: 360, xs: '100%' } }}>
          <Grid xs={6}>
            <Card sx={{ bgcolor: '#0b0c10', textAlign: 'center', p: 1 }}>
              <CardContent sx={{ p: '8px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                  <MovieIcon sx={{ color: '#00e5ff', fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
                    {history.length}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Avaliados
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid xs={6}>
            <Card sx={{ bgcolor: '#0b0c10', textAlign: 'center', p: 1 }}>
              <CardContent sx={{ p: '8px !important' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                  <StarIcon sx={{ color: '#ffb400', fontSize: 20 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#fff' }}>
                    {averageRating}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Média Dada
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* 2. BARRA DE BUSCA */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#00e5ff' }}>
          Histórico de Assistidos & Avaliações
        </Typography>

        <TextField
          size="small"
          placeholder="Filtrar seu histórico..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#aaa' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            bgcolor: '#1f2833',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': { color: '#fff' },
            width: { xs: '100%', sm: 260 },
          }}
        />
      </Box>

      {/* 3. TABELA DE HISTÓRICO */}
      <Paper sx={{ width: '100%', overflow: 'hidden', backgroundColor: '#1f2833', borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#0b0c10' }}>
            <TableRow>
              <TableCell sx={{ color: '#aaa', fontWeight: 'bold' }}>Anime</TableCell>
              <TableCell sx={{ color: '#aaa', fontWeight: 'bold' }}>Gêneros</TableCell>
              <TableCell sx={{ color: '#aaa', fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell align="center" sx={{ color: '#aaa', fontWeight: 'bold' }}>
                Sua Avaliação
              </TableCell>
              <TableCell align="right" sx={{ color: '#aaa', fontWeight: 'bold' }}>
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#aaa' }}>
                  {searchTerm
                    ? 'Nenhum anime corresponde ao filtro.'
                    : 'Você ainda não avaliou nenhum anime. Dê notas aos animes para receber recomendações!'}
                </TableCell>
              </TableRow>
            ) : (
              filteredHistory.map((item) => {
                const animeId = item.anime_id || item.id;
                const currentRating = Number(item.userRating ?? item.rating) || 0;

                return (
                  <TableRow key={animeId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    {/* Nome e Capa */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          component="img"
                          src={item.img || item.image_url || 'https://via.placeholder.com/40x55?text=No+Img'}
                          alt={item.name || 'Anime'}
                          sx={{ width: 40, height: 55, objectFit: 'cover', borderRadius: 1 }}
                        />
                        <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                          {item.name || `Anime ID: ${animeId}`}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Gênero */}
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {Array.isArray(item.genre)
                          ? item.genre.join(', ')
                          : item.genre || 'N/A'}
                      </Typography>
                    </TableCell>

                    {/* Tipo */}
                    <TableCell>
                      <Chip label={item.type || 'TV'} size="small" sx={{ bgcolor: '#0b0c10', color: '#fff' }} />
                    </TableCell>

                    {/* Nota (sem multiplicar por 2) */}
                    <TableCell align="center">
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                        <Rating
                          max={10}
                          precision={0.5}
                          size="small"
                          value={currentRating}
                          onChange={(e, val) => {
                            if (onUpdateRating && val !== null) {
                              onUpdateRating(animeId, val);
                            }
                          }}
                          sx={{
                            fontSize: '0.95rem',
                            '& .MuiRating-iconEmpty': { color: '#333e48' },
                          }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#00e5ff', minWidth: 32 }}>
                          {currentRating > 0 ? `${currentRating}/10` : '-'}
                        </Typography>
                      </Box>
                    </TableCell>

                    {/* Excluir da Lista */}
                    <TableCell align="right">
                      <Tooltip title="Remover avaliação">
                        <IconButton
                          onClick={() => onRemoveRating && onRemoveRating(animeId)}
                          sx={{ color: '#ff5252' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}