import { ThemeProvider, CssBaseline, Container, Typography, Button, Box } from '@mui/material';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import { store } from './store';
import { getTheme } from './styles/theme';

// Simple components for testing
const HomePage = () => (
  <Container maxWidth="lg" sx={{ py: 4 }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h2" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
        Welcome to CareAcquire
      </Typography>
      <Typography variant="h5" color="text.secondary" sx={{ mb: 4 }}>
        The UK's Premier Medical Business Marketplace
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button component={Link} to="/login" variant="contained" size="large">
          Login
        </Button>
        <Button component={Link} to="/register" variant="outlined" size="large">
          Register
        </Button>
      </Box>
    </Box>
  </Container>
);

const LoginPage = () => (
  <Container maxWidth="sm" sx={{ py: 8 }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>Login</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Login functionality will be implemented here.
      </Typography>
      <Button component={Link} to="/" variant="outlined">
        Back to Home
      </Button>
    </Box>
  </Container>
);

const RegisterPage = () => (
  <Container maxWidth="sm" sx={{ py: 8 }}>
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>Register</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Registration functionality will be implemented here.
      </Typography>
      <Button component={Link} to="/" variant="outlined">
        Back to Home
      </Button>
    </Box>
  </Container>
);

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={getTheme('light')}>
        <CssBaseline />
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
