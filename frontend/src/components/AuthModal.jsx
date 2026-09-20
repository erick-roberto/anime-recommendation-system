import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography, TextField,
  Button, Tabs, Tab, IconButton, Alert, InputAdornment,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

// Importar o utilizador mockado
import { MOCK_USER } from '../data/mockData';

export default function AuthModal({ open, onClose, onLoginSuccess }) {
  const [tabIndex, setTabIndex] = useState(0); // 0 = Entrar, 1 = Criar Conta
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let userData;

    if (tabIndex === 0) {
      // Simulação de Login: Se for o email do mock, devolvemos o MOCK_USER
      if (formData.email === MOCK_USER.email) {
        userData = MOCK_USER;
      } else {
        // Simulação de um login qualquer
        userData = {
          user_id: Math.floor(Math.random() * 1000) + 1000,
          usuario: formData.email.split('@')[0],
          name: 'Utilizador Teste',
          email: formData.email,
          avatarUrl: ''
        };
      }
    } else {
      // Simulação de Registo: Cria um utilizador novo no padrão do banco
      userData = {
        user_id: Math.floor(Math.random() * 1000) + 1000,
        usuario: formData.username,
        name: formData.username, // Assumindo o mesmo para o frontend
        email: formData.email,
        avatarUrl: ''
      };
    }

    onLoginSuccess(userData);
    
    // Limpar o formulário antes de fechar
    setFormData({ username: '', email: '', password: '' });
    onClose();
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
        {/* Cabeçalho de Abas */}
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          variant="fullWidth"
          textColor="secondary"
          indicatorColor="secondary"
          sx={{ mb: 3, borderBottom: '1px solid #333' }}
        >
          <Tab label="Entrar" sx={{ fontWeight: 'bold' }} />
          <Tab label="Criar Conta" sx={{ fontWeight: 'bold' }} />
        </Tabs>

        {/* Mensagem Educativa sobre o KNN no Cadastro */}
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
            Ao se cadastrar, você poderá dar notas aos animes para o <strong>KNN</strong> calibrar suas recomendações!
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Campo de Nome de Usuário (Necessário no Cadastro) */}
          {tabIndex === 1 && (
            <TextField
              label="Nome de Usuário"
              variant="outlined"
              fullWidth
              required
              value={formData.username}
              onChange={handleChange('username')}
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
            />
          )}

          {/* Campo de Email */}
          <TextField
            label="E-mail"
            type="email"
            variant="outlined"
            fullWidth
            required
            value={formData.email}
            onChange={handleChange('email')}
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
          />

          {/* Campo de Senha com Visibilidade Alternável */}
          <TextField
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            fullWidth
            required
            value={formData.password}
            onChange={handleChange('password')}
            InputProps={{
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

          {/* Botão de Ação */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            sx={{
              mt: 1,
              py: 1.2,
              fontWeight: 'bold',
              fontSize: '1rem',
              borderRadius: 2,
              textTransform: 'none',
            }}
          >
            {tabIndex === 0 ? 'Entrar' : 'Cadastrar e Começar'}
          </Button>
        </Box>

        {/* Rodapé Alternativo */}
        <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 2.5 }}>
          {tabIndex === 0 ? 'Não tem uma conta?' : 'Já possui uma conta?'}
          <Button
            size="small"
            onClick={() => setTabIndex(tabIndex === 0 ? 1 : 0)}
            sx={{ textTransform: 'none', color: '#00e5ff', ml: 0.5, p: 0 }}
          >
            {tabIndex === 0 ? 'Cadastre-se' : 'Faça Login'}
          </Button>
        </Typography>
      </DialogContent>
    </Dialog>
  );
}