import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { ROUTES } from '../../constants';
import LoadingScreen from '../common/LoadingScreen';

interface PublicRouteProps {
  children: React.ReactNode;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading, isInitialized } = useAppSelector(
    (state) => state.auth
  );

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  // If authenticated, check subscription and redirect appropriately
  if (isAuthenticated && user) {
    // Admin users don't need subscriptions
    if (user.user_type === 'admin') {
      const dashboardRoute = getDashboardRoute(user.user_type);
      return <Navigate to={dashboardRoute} replace />;
    }
    
    // For non-admin users, check if they have active subscription
    // Note: We'll let ProtectedRoute handle the subscription check for most cases
    // This is just for initial redirect from public pages
    const dashboardRoute = getDashboardRoute(user.user_type);
    return <Navigate to={dashboardRoute} replace />;
  }

  return <>{children}</>;
};

// Helper function to get dashboard route based on user type
function getDashboardRoute(userType: string): string {
  switch (userType) {
    case 'seller':
      return ROUTES.SELLER_DASHBOARD;
    case 'buyer':
      return ROUTES.BUYER_DASHBOARD;
    case 'admin':
      return ROUTES.ADMIN_DASHBOARD;
    default:
      return ROUTES.DASHBOARD;
  }
}

export default PublicRoute;
