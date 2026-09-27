import React, { useState } from 'react';
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
} from '@mui/material';

const NavBar = ({
  isLoggedIn = false,
  user = null,
  onLoginClick,
  onLogoutClick,
  onProfileClick,
  onHomeClick,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // Lê o username retornado da API ou o name legada, com fallback seguro
  const displayName = user?.username || user?.name || '';
  const initialLetter = displayName ? displayName[0].toUpperCase() : 'U';

  return (
    <AppBar
      position="static"
      color="default"
      elevation={2}
      sx={{ width: '100%', backgroundColor: '#1f2833' }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* ESQUERDA: Ícone SVG + Nome da Aplicação */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
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
            sx={{ fontWeight: 'bold', color: '#00e5ff', letterSpacing: 0.5 }}
          >
            AnimeRecs
          </Typography>
        </Box>

        {/* DIREITA: Estado de Logado vs Deslogado */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isLoggedIn ? (
            <>
              {/* Botão 'Meus animes' */}
              <Button
                color="inherit"
                onClick={onProfileClick}
                sx={{ textTransform: 'none', fontWeight: 'bold', color: '#ffffff' }}
              >
                Meus animes
              </Button>

              {/* Avatar do Usuário com Menu Dropdown */}
              <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
                <Avatar
                  src={user?.avatarUrl}
                  alt={displayName}
                  sx={{ bgcolor: '#7c4dff', width: 38, height: 38, fontWeight: 'bold' }}
                >
                  {initialLetter}
                </Avatar>
              </IconButton>

              {/* Menu suspenso */}
              <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{
                  sx: { bgcolor: '#0b0c10', color: '#fff', mt: 1, minWidth: 160 },
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
            /* Botões quando deslogado */
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={onLoginClick}
                sx={{
                  textTransform: 'none',
                  fontWeight: 'bold',
                  borderRadius: 2,
                  px: 2.5,
                }}
              >
                Cadastro
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={onLoginClick}
                sx={{
                  textTransform: 'none',
                  fontWeight: 'bold',
                  borderRadius: 2,
                  px: 2.5,
                }}
              >
                Login
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;