import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Autocomplete,
  TextField,
  InputAdornment,
  CircularProgress,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { animeService } from '../api/api';

export default function NavBar({
  isLoggedIn = false,
  user = null,
  onLoginClick,
  onLogoutClick,
  onProfileClick,
  onHomeClick,
  onSelectAnime,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const displayName = user?.username || user?.name || '';
  const initialLetter = displayName ? displayName[0].toUpperCase() : 'U';

  // Debounce de 300ms conectado ao animeService
  useEffect(() => {
    const query = inputValue.trim();
    if (!query || query.length < 2) {
      setOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await animeService.searchAnimes(query);
        setOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao buscar animes na API:', err);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  return (
    <AppBar
      position="static"
      color="default"
      elevation={2}
      sx={{ width: '100%', backgroundColor: '#1f2833' }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', gap: 2 }}>
        {/* ESQUERDA: Logo */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer', flexShrink: 0 }}
          onClick={onHomeClick}
        >
          <Box
            component="img"
            src="/site-icon.svg"
            alt="Logo AnimeRecs"
            sx={{ width: 32, height: 32 }}
          />
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 'bold',
              color: '#00e5ff',
              letterSpacing: 0.5,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            AnimeRecs
          </Typography>
        </Box>

        {/* CENTRO: Barra de Busca */}
        <Box sx={{ flexGrow: 1, maxWidth: 480, mx: { xs: 1, sm: 2 } }}>
          <Autocomplete
            freeSolo
            options={options}
            getOptionLabel={(option) => (typeof option === 'string' ? option : option.name || '')}
            isOptionEqualToValue={(option, value) => (option?.anime_id || option?.id) === (value?.anime_id || value?.id)}
            filterOptions={(x) => x}
            loading={loading}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            onChange={(event, selectedAnime) => {
              if (selectedAnime && typeof selectedAnime === 'object') {
                if (onSelectAnime) {
                  onSelectAnime(selectedAnime);
                }
                setInputValue('');
              }
            }}
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              const animeId = option.anime_id || option.id;

              return (
                <Box
                  key={animeId || option.name}
                  component="li"
                  {...otherProps}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: '8px 12px !important',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#2b3947 !important' },
                  }}
                >
                  <Box
                    component="img"
                    src={option.image_url || option.img || 'https://via.placeholder.com/40x55?text=No+Img'}
                    alt={option.name}
                    sx={{ width: 38, height: 50, objectFit: 'cover', borderRadius: 1 }}
                  />
                  <Box sx={{ overflow: 'hidden', flexGrow: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#fff' }} noWrap>
                      {option.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                      <Chip
                        label={option.type || 'TV'}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#0b0c10', color: '#00e5ff' }}
                      />
                      <Typography variant="caption" sx={{ color: '#aaa' }} noWrap>
                        {option.genre ? (Array.isArray(option.genre) ? option.genre.slice(0, 2).join(', ') : option.genre.split(',').slice(0, 2).join(',')) : ''}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            }}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: '#1f2833',
                  color: '#fff',
                  mt: 0.5,
                  borderRadius: 2,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
                },
              },
            }}
            renderInput={(params) => {
              const { InputProps } = params;

              return (
                <TextField
                  {...params}
                  size="small"
                  placeholder="Buscar anime para avaliar..."
                  InputProps={{
                    ...InputProps,
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#aaa', ml: 0.5 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <>
                        {loading ? (
                          <CircularProgress color="inherit" size={16} sx={{ color: '#00e5ff', mr: 1 }} />
                        ) : null}
                        {InputProps?.endAdornment}
                      </>
                    ),
                  }}
                  sx={{
                    bgcolor: '#0b0c10',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#333e48' },
                      '&:hover fieldset': { borderColor: '#00e5ff' },
                      '&.Mui-focused fieldset': { borderColor: '#00e5ff' },
                    },
                  }}
                />
              );
            }}
          />
        </Box>

        {/* DIREITA: Auth & Perfil */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          {isLoggedIn ? (
            <>
              <Button
                color="inherit"
                onClick={onProfileClick}
                sx={{ textTransform: 'none', fontWeight: 'bold', color: '#ffffff', display: { xs: 'none', md: 'inline-flex' } }}
              >
                Meus animes
              </Button>

              <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
                <Avatar
                  src={user?.avatarUrl}
                  alt={displayName}
                  sx={{ bgcolor: '#7c4dff', width: 38, height: 38, fontWeight: 'bold' }}
                >
                  {initialLetter}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                  paper: {
                    sx: { bgcolor: '#0b0c10', color: '#fff', mt: 1, minWidth: 160 },
                  },
                }}
              >
                <MenuItem disabled sx={{ color: '#aaa !important', fontSize: '0.85rem' }}>
                  {displayName || 'Conta ativa'}
                </MenuItem>
                <Divider sx={{ my: 0.5, borderColor: '#1f2833' }} />
                <MenuItem onClick={onProfileClick}>Meu Perfil</MenuItem>
                <MenuItem onClick={onLogoutClick} sx={{ color: '#ff5252' }}>
                  Sair
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={onLoginClick}
                sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2, px: 2 }}
              >
                Cadastro
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={onLoginClick}
                sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2, px: 2 }}
              >
                Login
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}