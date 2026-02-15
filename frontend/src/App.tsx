import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { store, useAppDispatch, useAppSelector } from './store';
import { getTheme } from './styles/theme';
import { initializeAuth } from './store/slices/authSlice';
import { ROUTES } from './constants';

// Components
import LoadingScreen from './components/common/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicRoute from './components/auth/PublicRoute';
import Header from './components/layout/Header';
import NotificationBanner from './components/common/NotificationBanner';
import SubscriptionBanner from './components/common/SubscriptionBanner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Dashboard Pages
import SellerDashboard from './pages/dashboard/SellerDashboard';
import BuyerDashboard from './pages/dashboard/BuyerDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';

// Listing Pages
import ListingsPage from './pages/listings/ListingsPage';
import ListingDetailPage from './pages/listings/ListingDetailPage';
import SellerListingDetailPage from './pages/listings/SellerListingDetailPage';
import CreateListingPage from './pages/listings/CreateListingPage';
import EditListingPage from './pages/listings/EditListingPage';
import MyListingsPage from './pages/listings/MyListingsPage';
import SavedListingsPage from './pages/listings/SavedListingsPage';

// Profile Pages
import ProfilePage from './pages/ProfilePage';
import ProfileSubscriptionPage from './pages/ProfileSubscriptionPage';
import KYCUploadPage from './pages/KYCUploadPage';
import BlockedUsersPageWrapper from './pages/BlockedUsersPageWrapper';
import AdminBlockedUsersPage from './pages/admin/AdminBlockedUsersPage';

// Connection Pages
import MessagesPage from './pages/MessagesPage';
import MessageThreadPage from './pages/MessageThreadPage';
import EnquiryHistoryPage from './pages/EnquiryHistoryPage';

// Subscription Pages
import SubscriptionsPage from './pages/SubscriptionsPage';
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage';

// Service Pages
import ServicesPage from './pages/ServicesPage';
import ServiceRequestPage from './pages/ServiceRequestPage';

// Admin Pages
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminListingsPage from './pages/admin/AdminListingsPage';
import AdminAllListingsPage from './pages/admin/AdminAllListingsPage';
import AdminListingDetailPage from './pages/admin/AdminListingDetailPage';
import AdminServicesPage from './pages/admin/AdminServicesPage';
import AdminBuyersPage from './pages/admin/AdminBuyersPage';
import AdminBuyerDetailPage from './pages/admin/AdminBuyerDetailPage';
import AdminSellersPage from './pages/admin/AdminSellersPage';
import AdminSellerDetailPage from './pages/admin/AdminSellerDetailPage';
import AdminListingConversationsPage from './pages/admin/AdminListingConversationsPage';
import AdminListingAnalyticsPage from './pages/admin/AdminListingAnalyticsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const dispatch = useAppDispatch();
  const { isInitialized, isLoading } = useAppSelector((state) => state.auth);
  const { theme } = useAppSelector((state) => state.ui);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  if (!isInitialized || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider theme={getTheme(theme)}>
      <CssBaseline />
      <Router>
        <Header />
        <NotificationBanner />
        <SubscriptionBanner />
        <Routes>
          {/* Public Routes */}
          <Route
            path={ROUTES.HOME}
            element={
              <PublicRoute>
                <LandingPage />
              </PublicRoute>
            }
          />
          <Route
            path={ROUTES.LOGIN}
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path={ROUTES.REGISTER}
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path={ROUTES.VERIFY_EMAIL}
            element={<VerifyEmailPage key="verify-email" />}
          />
          <Route
            path={ROUTES.EMAIL_VERIFICATION}
            element={
              <EmailVerificationPage />
            }
          />
          <Route
            path={ROUTES.FORGOT_PASSWORD}
            element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            }
          />
          <Route
            path={ROUTES.RESET_PASSWORD}
            element={
              <PublicRoute>
                <ResetPasswordPage />
              </PublicRoute>
            }
          />

          {/* Protected Routes - Dashboard */}
          <Route
            path={ROUTES.DASHBOARD}
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SELLER_DASHBOARD}
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.BUYER_DASHBOARD}
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <BuyerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_DASHBOARD}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Listings */}
          <Route
            path={ROUTES.LISTINGS}
            element={
              <ProtectedRoute>
                <ListingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.LISTING_DETAIL}
            element={
              <ProtectedRoute>
                <ListingDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SELLER_LISTING_DETAIL}
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <SellerListingDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.CREATE_LISTING}
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <CreateListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.EDIT_LISTING}
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <EditListingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.MY_LISTINGS}
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <MyListingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SAVED_LISTINGS}
            element={
              <ProtectedRoute allowedRoles={['buyer']}>
                <SavedListingsPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Profile */}
          <Route
            path={ROUTES.PROFILE}
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.PROFILE_SUBSCRIPTION}
            element={
              <ProtectedRoute>
                <ProfileSubscriptionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.KYC_UPLOAD}
            element={
              <ProtectedRoute allowedRoles={['seller']}>
                <KYCUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.BLOCKED_USERS}
            element={
              <ProtectedRoute>
                <BlockedUsersPageWrapper />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Connections & Messages */}
          <Route
            path={ROUTES.ENQUIRY_HISTORY}
            element={
              <ProtectedRoute>
                <EnquiryHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.MESSAGES}
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.MESSAGE_THREAD}
            element={
              <ProtectedRoute>
                <MessageThreadPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Subscriptions */}
          <Route
            path={ROUTES.SUBSCRIPTIONS}
            element={
              <ProtectedRoute>
                <SubscriptionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SUBSCRIPTION_SUCCESS}
            element={
              <ProtectedRoute>
                <SubscriptionSuccessPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Services */}
          <Route
            path={ROUTES.SERVICES}
            element={
              <ProtectedRoute>
                <ServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.SERVICE_REQUEST}
            element={
              <ProtectedRoute>
                <ServiceRequestPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Routes - Admin */}
          <Route
            path={ROUTES.ADMIN_USERS}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_BUYERS}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminBuyersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_BUYER_DETAIL}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminBuyerDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_SELLERS}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSellersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_SELLER_DETAIL}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSellerDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_LISTINGS}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminListingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_ALL_LISTINGS}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAllListingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_LISTING_DETAIL}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminListingDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_LISTING_CONVERSATIONS}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminListingConversationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_LISTING_ANALYTICS}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminListingAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_ANALYTICS}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.ADMIN_SERVICES}
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/blocked-users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminBlockedUsersPage />
              </ProtectedRoute>
            }
          />

          {/* Catch all route */}
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </Router>
      
      {/* Global Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#333' : '#fff',
            color: theme === 'dark' ? '#fff' : '#333',
          },
        }}
      />
    </ThemeProvider>
  );
}

// Dashboard redirect component based on user role
function DashboardRedirect() {
  const { user } = useAppSelector((state) => state.auth);
  
  if (!user) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Let ProtectedRoute handle subscription checks
  // This component just redirects to the appropriate dashboard
  switch (user.user_type) {
    case 'seller':
      return <Navigate to={ROUTES.SELLER_DASHBOARD} replace />;
    case 'buyer':
      return <Navigate to={ROUTES.BUYER_DASHBOARD} replace />;
    case 'admin':
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    default:
      return <Navigate to={ROUTES.HOME} replace />;
  }
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </Provider>
  );
}

export default App;