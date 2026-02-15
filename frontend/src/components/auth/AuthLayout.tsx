import React from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showBackButton?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackButton = true,
  maxWidth = 'sm',
}) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.50',
        py: 4,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.secondary.main}08 100%)`,
      }}
    >
      <Container maxWidth={maxWidth}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={3}
            sx={{
              p: { xs: 3, sm: 4, md: 5 },
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background decoration */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 100,
                height: 100,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
                borderRadius: '0 0 0 100px',
                zIndex: 0,
              }}
            />

            {/* Header */}
            <Box sx={{ position: 'relative', zIndex: 1, mb: 4 }}>
              {showBackButton && (
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => navigate(ROUTES.HOME)}
                  sx={{ 
                    mb: 2, 
                    alignSelf: 'flex-start',
                    color: 'text.secondary',
                  }}
                >
                  Back to Home
                </Button>
              )}
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 700,
                    color: 'primary.main',
                    mb: 1,
                    fontSize: { xs: '1.75rem', sm: '2.125rem' },
                  }}
                >
                  {title}
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                >
                  {subtitle}
                </Typography>
              </Box>
            </Box>

            {/* Content */}
            <Box sx={{ position: 'relative', zIndex: 1 }}>
              {children}
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default AuthLayout;
