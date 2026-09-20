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
    user = { name: 'OtakuUser', avatarUrl: '' },
    onLoginClick,
    onLogoutClick,
    onProfileClick,
    onHomeClick, // <- Nova prop adicionada
}) => {

    const [anchorEl, setAnchorEl] = useState(null);
    const openMenu = Boolean(anchorEl);
    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);


    return (
        <AppBar position="static" width="100%" color="default" elevation={2} sx={{ backgroundColor: '#1f2833' }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>

                {/* ESQUERDA: Ícone SVG + Nome da Aplicação */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}>
                    {/* Caso o arquivo esteja na pasta 'src/assets': use src={logoSvg} */}
                    {/* Caso esteja na pasta 'public/logo.svg': use src="/logo.svg" */}
                    <Box
                        component="img"
                        src={'/site-icon.svg'}
                        alt="Logo AnimeRecs"
                        sx={{ width: 32, height: 32 }}
                        onClick={onHomeClick}
                    />

                    <Typography
                        variant="h6"
                        component="div"
                        sx={{ fontWeight: 'bold', color: '#00e5ff', letterSpacing: 0.5 }}
                        onClick={onHomeClick}
                    >
                        AnimeRecs
                    </Typography>
                </Box>

                {/* DIREITA: Estado de Logado vs Deslogado */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {isLoggedIn ? (
                        <>
                            {/* Botão 'Meu Perfil' */}
                            <Button
                                color="inherit"
                                onClick={onProfileClick}
                                sx={{ textTransform: 'none', fontWeight: 'bold', color: '#ffffff' }}
                            >
                                Meus animes
                            </Button>

                            {/* Avatar do Usuário com Menu Droppdown */}
                            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 1 }}>
                                <Avatar
                                    src={user.avatarUrl}
                                    alt={user.name}
                                    sx={{ bgcolor: '#7c4dff', width: 38, height: 38, fontWeight: 'bold' }}
                                >
                                    {user.name ? user.name[0].toUpperCase() : 'U'}
                                </Avatar>
                            </IconButton>

                            {/* Menu suspenso ao clicar no Avatar */}
                            <Menu
                                anchorEl={anchorEl}
                                open={openMenu}
                                onClose={handleMenuClose}
                                onClick={handleMenuClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                PaperProps={{
                                    sx: { bgcolor: '#0b0c10', color: '#fff', mt: 1, minWidth: 150 },
                                }}
                            >
                                <MenuItem onClick={onProfileClick}>Meu Perfil</MenuItem>
                                <Divider sx={{ my: 0.5, borderColor: '#1f2833' }} />
                                <MenuItem onClick={onLogoutClick} sx={{ color: '#ff5252' }}>
                                    Sair
                                </MenuItem>
                            </Menu>
                        </>
                    ) : (
                        /* Botão de Login / Cadastro quando deslogado */
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
                                }} >
                                Login
                            </Button>
                        </>)}
                </Box>

            </Toolbar>
        </AppBar>
    )
}

export default NavBar