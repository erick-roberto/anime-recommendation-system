// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c4dff', // Roxo vívido
    },
    secondary: {
      main: '#00e5ff', // Ciano para destaques
    },
    background: {
      default: '#0b0c10',
      paper: '#1f2833',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  
});

export default theme;