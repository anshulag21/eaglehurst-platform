import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../store';
import BlockedUsersPage from './BlockedUsersPage';

const BlockedUsersPageWrapper: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  // Redirect admins to the admin version
  if (user?.user_type === 'admin') {
    return <Navigate to="/admin/blocked-users" replace />;
  }

  // Regular users get the standard blocked users page
  return <BlockedUsersPage />;
};

export default BlockedUsersPageWrapper;

