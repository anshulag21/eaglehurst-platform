import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton,
  useTheme,
  useMediaQuery,
  Stack,
  Chip,
} from '@mui/material';
import {
  Business,
  Security,
  TrendingUp,
  People,
  CheckCircle,
  ArrowForward,
  Menu as MenuIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants';

const LandingPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  const features = [
    {
      icon: <Business sx={{ fontSize: 40 }} />,
      title: 'Medical Business Marketplace',
      description: 'Connect buyers and sellers of medical practices across the UK with our secure, verified platform.',
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Secure & Verified',
      description: 'All users undergo KYC verification and listings are admin-approved for maximum security.',
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      title: 'Professional Services',
      description: 'Access legal and valuation services to ensure smooth business transactions.',
    },
    {
      icon: <People sx={{ fontSize: 40 }} />,
      title: 'Direct Communication',
      description: 'Connect directly with verified buyers and sellers through our secure messaging system.',
    },
  ];

  const benefits = [
    'Verified medical professionals only',
    'Comprehensive business listings',
    'Secure messaging system',
    'Professional legal support',
    'Business valuation services',
    'Admin-approved listings',
    'Mobile and web access',
    'UK compliance focused',
  ];

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      {/* Navigation */}
      <AppBar position="fixed" elevation={0} sx={{ backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography
            variant="h5"
            component="div"
            sx={{ 
              flexGrow: 1, 
              fontWeight: 700,
              color: 'primary.main',
              letterSpacing: '-0.02em',
            }}
          >
            CareAcquire
          </Typography>
          
          {!isMobile && (
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<LoginIcon />}
                onClick={() => navigate(ROUTES.LOGIN)}
                sx={{ borderRadius: 2 }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => navigate(ROUTES.REGISTER)}
                sx={{ borderRadius: 2 }}
              >
                Get Started
              </Button>
            </Stack>
          )}
          
          {isMobile && (
            <IconButton edge="end" color="inherit">
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 12, md: 16 },
          pb: { xs: 8, md: 12 },
          background: `linear-gradient(135deg, ${theme.palette.primary.main}10 0%, ${theme.palette.secondary.main}10 100%)`,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    fontWeight: 800,
                    lineHeight: 1.1,
                    mb: 3,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  The UK's Premier Medical Business Marketplace
                </Typography>
                
                <Typography
                  variant="h5"
                  color="text.secondary"
                  sx={{ mb: 4, lineHeight: 1.6 }}
                >
                  Connect with verified medical professionals to buy, sell, or invest in healthcare practices across the United Kingdom.
                </Typography>
                
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate(ROUTES.REGISTER)}
                    sx={{
                      py: 2,
                      px: 4,
                      fontSize: '1.1rem',
                      borderRadius: 3,
                      boxShadow: 3,
                    }}
                  >
                    Start Your Journey
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate(ROUTES.LOGIN)}
                    sx={{
                      py: 2,
                      px: 4,
                      fontSize: '1.1rem',
                      borderRadius: 3,
                      borderWidth: 2,
                      '&:hover': { borderWidth: 2 },
                    }}
                  >
                    Sign In
                  </Button>
                </Stack>
                
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label="Verified Professionals" color="primary" variant="outlined" />
                  <Chip label="Secure Platform" color="secondary" variant="outlined" />
                  <Chip label="UK Focused" color="success" variant="outlined" />
                </Stack>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: { xs: 300, md: 400 },
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 3,
                  }}
                >
                  <Business sx={{ fontSize: 120, color: 'white', opacity: 0.9 }} />
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <Typography
            variant="h2"
            align="center"
            sx={{ mb: 2, fontWeight: 700 }}
          >
            Why Choose CareAcquire?
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            sx={{ mb: 6, maxWidth: 600, mx: 'auto' }}
          >
            Our platform is designed specifically for the UK medical business market, ensuring compliance and security.
          </Typography>
        </motion.div>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card
                  sx={{
                    height: '100%',
                    textAlign: 'center',
                    transition: 'transform 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box
                      sx={{
                        color: 'primary.main',
                        mb: 2,
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Benefits Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Typography variant="h3" sx={{ mb: 3, fontWeight: 700 }}>
                  Everything You Need in One Platform
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                  From initial listing to final transaction, CareAcquire provides all the tools and services you need for successful medical business transactions.
                </Typography>
                
                <Grid container spacing={2}>
                  {benefits.map((benefit, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {benefit}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </motion.div>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <Box
                  sx={{
                    height: 400,
                    background: `linear-gradient(135deg, ${theme.palette.success.main}, ${theme.palette.info.main})`,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 3,
                  }}
                >
                  <Security sx={{ fontSize: 120, color: 'white', opacity: 0.9 }} />
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" sx={{ mb: 3, fontWeight: 700 }}>
                Ready to Get Started?
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Join thousands of medical professionals who trust CareAcquire for their business transactions.
              </Typography>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                <Button
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate(ROUTES.REGISTER)}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: 3,
                    boxShadow: 3,
                  }}
                >
                  Create Account
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate(ROUTES.LOGIN)}
                  sx={{
                    py: 2,
                    px: 4,
                    fontSize: '1.1rem',
                    borderRadius: 3,
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2 },
                  }}
                >
                  Sign In
                </Button>
              </Stack>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ backgroundColor: 'grey.900', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="body2" align="center" color="grey.400">
            © 2024 CareAcquire. All rights reserved. | Medical Business Marketplace for the UK
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
