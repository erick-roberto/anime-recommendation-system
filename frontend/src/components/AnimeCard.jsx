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
    // Trata gêneros para suportar Array ou String separada por vírgulas (até 3 itens)
    const genresList = Array.isArray(anime.genre)
        ? anime.genre.slice(0, 3)
        : anime.genre
        ? anime.genre.split(',').map((g) => g.trim()).slice(0, 3)
        : [];

    return (
        <Card
            onClick={onClick}
            sx={{
                width: 200,
                flexShrink: 0,
                backgroundColor: '#1f2833',
                position: 'relative',
                transition: 'transform 0.2s ease-in-out',
                '&:hover': { transform: 'translateY(-6px)' },
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
                height="260"
                image={anime.img || anime.image_url || 'https://via.placeholder.com/200x260?text=Sem+Capa'}
                alt={anime.name}
                sx={{ objectFit: 'cover' }}
            />

            {/* Conteúdo */}
            <CardContent sx={{ p: 1.5, pb: 1 }}>
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

            {/* Avaliação do Usuário */}
            {/* Avaliação do Utilizador (Apenas Leitura) */}
            <CardActions sx={{ px: 1.5, pb: 1.5, pt: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                <Typography variant="caption" color="text.secondary">
                    Sua Nota:
                </Typography>
                <Rating
                    size="small"
                    precision={1}
                    value={anime.userRating || null}
                    readOnly // <-- A magia acontece aqui! Torna as estrelas não clicáveis.
                />
            </CardActions>
        </Card>
    );
}