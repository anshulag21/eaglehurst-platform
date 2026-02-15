import React from 'react';
import { Typography, Container, Paper } from '@mui/material';

const ResetPasswordPage: React.FC = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Reset Password
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Password reset functionality coming soon.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ResetPasswordPage;
