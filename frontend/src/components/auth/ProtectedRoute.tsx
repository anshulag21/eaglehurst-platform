import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../store';
import { ROUTES } from '../../constants';
import LoadingScreen from '../common/LoadingScreen';
import { UserProfile } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles
}) => {
  const location = useLocation();
  const { isAuthenticated, user, profile, isLoading, isInitialized } = useAppSelector(
    (state) => state.auth
  );

  // Show loading screen while initializing
  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Authenticating..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role-based access
  if (allowedRoles && !allowedRoles.includes(user.user_type)) {
    // Redirect to appropriate dashboard based on user role
    const dashboardRoute = getDashboardRoute(user.user_type);
    return <Navigate to={dashboardRoute} replace />;
  }

  // Check if user is verified (email verification)
  if (!user.is_verified) {
    // Allow access to email verification page and profile pages
    if (location.pathname === ROUTES.EMAIL_VERIFICATION ||
      location.pathname === ROUTES.PROFILE ||
      (user.user_type === 'seller' && location.pathname === ROUTES.KYC_UPLOAD)) {
      return <>{children}</>;
    }

    // Redirect to email verification for unverified users
    return <Navigate to={ROUTES.EMAIL_VERIFICATION} replace />;
  }

  // Check if user has active subscription (skip for admin users)
  if (user.user_type !== 'admin') {
    // Wait for profile to load before checking subscription
    if (profile === null) {
      return <LoadingScreen message="Loading profile..." />;
    }

    const hasActiveSubscription = checkActiveSubscription(profile, user.user_type);

    if (!hasActiveSubscription) {
      // Allow access to subscription-related pages and profile
      if (location.pathname === ROUTES.SUBSCRIPTIONS ||
        location.pathname === ROUTES.SUBSCRIPTION_SUCCESS ||
        location.pathname === ROUTES.SUBSCRIPTION_CANCEL ||
        location.pathname === ROUTES.PROFILE ||
        location.pathname === ROUTES.PROFILE_SUBSCRIPTION ||
        location.pathname.startsWith('/stripe/')) {
        return <>{children}</>;
      }

      // Redirect to subscription page for users without active subscription
      return <Navigate to={ROUTES.SUBSCRIPTIONS} replace />;
    }
  }

  // Additional check for sellers - business verification
  if (user.user_type === 'seller') {
    // Get seller profile from profile data (fetched from /auth/me endpoint)
    const sellerProfile = profile?.seller_profile;

    // Only redirect to KYC if seller profile doesn't exist or has no verification documents
    // Allow sellers with any verification status (pending, approved, rejected) to access dashboard
    // But don't redirect if profile data hasn't loaded yet (profile is null)
    if (!sellerProfile && profile !== null) {
      // Allow access to KYC upload page and profile pages only
      if (location.pathname === ROUTES.KYC_UPLOAD ||
        location.pathname === ROUTES.PROFILE) {
        return <>{children}</>;
      }

      // Redirect to KYC upload for business verification
      return <Navigate to={ROUTES.KYC_UPLOAD} replace />;
    }

    // Allow sellers with any verification status to access dashboard
    // The dashboard will show appropriate messaging based on verification status

    // Redirect from certain pages if verification is pending or rejected (but not approved)
    if (sellerProfile && sellerProfile.verification_status !== 'approved') {
      const restrictedPaths = [
        ROUTES.CREATE_LISTING,
        ROUTES.EDIT_LISTING,
      ];

      if (restrictedPaths.some(path => location.pathname.startsWith(path.replace('/:id', '')))) {
        return <Navigate to={ROUTES.SELLER_DASHBOARD} replace />;
      }
    }
  }

  return <>{children}</>;
};

// Helper function to check if user has active subscription
function checkActiveSubscription(profile: UserProfile | null, userType: string): boolean {
  if (!profile) return false;

  let subscription;
  if (userType === 'buyer') {
    subscription = profile.buyer_profile?.subscription;
  } else if (userType === 'seller') {
    subscription = profile.seller_profile?.subscription;
  }

  if (!subscription) return false;

  // Check if subscription is active
  if (subscription.status !== 'active') return false;

  // Check if subscription hasn't expired
  if (subscription.expires_at) {
    const expiryDate = new Date(subscription.expires_at);
    const now = new Date();
    if (expiryDate <= now) return false;
  }

  return true;
}

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
      return ROUTES.HOME;
  }
}

export default ProtectedRoute;
