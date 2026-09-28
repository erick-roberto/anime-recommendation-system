import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, TextField,
  Button, Tabs, Tab, IconButton, Alert, InputAdornment,
  CircularProgress
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import { authService } from '../api/api';

export default function AuthModal({ open, onClose, onLoginSuccess }) {
  const [tabIndex, setTabIndex] = useState(0); // 0 = Entrar, 1 = Criar Conta
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleTabChange = (val) => {
    setTabIndex(val);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (tabIndex === 0) {
        // --- LOGIN ---
        await authService.login({
          username: formData.username,
          password: formData.password,
        });

        // Recupera os dados do usuário autenticado pelo JWT
        const userData = await authService.getMe();
        onLoginSuccess(userData);
        setFormData({ username: '', email: '', password: '' });
        onClose();
      } else {
        // --- CADASTRO ---
        await authService.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });

        setSuccessMessage('Conta criada com sucesso! Faça login para começar.');
        setTabIndex(0); // Redireciona para aba de login
      }
    } catch (err) {
      setErrorMessage(err.message || 'Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#1f2833',
          color: '#fff',
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogContent sx={{ pt: 2 }}>
        <Tabs
          value={tabIndex}
          onChange={(e, val) => handleTabChange(val)}
          variant="fullWidth"
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ mb: 3, borderBottom: '1px solid #333' }}
        >
          <Tab label="Entrar" sx={{ fontWeight: 'bold' }} />
          <Tab label="Criar Conta" sx={{ fontWeight: 'bold' }} />
        </Tabs>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.85rem' }}>
            {errorMessage}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2, fontSize: '0.85rem' }}>
            {successMessage}
          </Alert>
        )}

        {tabIndex === 1 && (
          <Alert
            severity="info"
            icon={<AutoAwesomeIcon sx={{ color: '#00e5ff' }} />}
            sx={{
              mb: 2.5,
              backgroundColor: '#0b0c10',
              color: '#fff',
              border: '1px solid #7c4dff',
              fontSize: '0.8rem',
            }}
          >
            Ao se cadastrar, você poderá dar notas aos animes para calibrar suas recomendações!
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Nome de usuário (Login e Cadastro usam username) */}
          <TextField
            label="Nome de Usuário"
            variant="outlined"
            fullWidth
            required
            disabled={loading}
            value={formData.username}
            onChange={handleChange('username')}
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
          />

          {/* Email apenas no Cadastro */}
          {tabIndex === 1 && (
            <TextField
              label="E-mail"
              type="email"
              variant="outlined"
              fullWidth
              required
              disabled={loading}
              value={formData.email}
              onChange={handleChange('email')}
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
            />
          )}

          {/* Senha */}
          <TextField
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            fullWidth
            required
            disabled={loading}
            value={formData.password}
            onChange={handleChange('password')}
            slotProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                    sx={{ color: '#aaa' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            sx={{
              mt: 1,
              py: 1.2,
              fontWeight: 'bold',
              fontSize: '1rem',
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : tabIndex === 0 ? (
              'Entrar'
            ) : (
              'Cadastrar e Começar'
            )}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 2.5 }}>
          {tabIndex === 0 ? 'Não tem uma conta?' : 'Já possui uma conta?'}
          <Button
            size="small"
            disabled={loading}
            onClick={() => handleTabChange(tabIndex === 0 ? 1 : 0)}
            sx={{ textTransform: 'none', color: '#00e5ff', ml: 0.5, p: 0 }}
          >
            {tabIndex === 0 ? 'Cadastre-se' : 'Faça Login'}
          </Button>
        </Typography>
      </DialogContent>
    </Dialog>
  );
}