import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type Action = 'view' | 'create' | 'update' | 'delete' | string;

export interface AuthGateProps {
  children: React.ReactNode;
  moduleKey?: string;
  action?: Action;
}

function readAuthFromStorage(): { token: string | null } {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { token };
}

export default function AuthGate({ children, moduleKey, action = 'view' }: AuthGateProps) {
  const location = useLocation();
  const { token } = readAuthFromStorage();

  // Only check if user is logged in (has token)
  // All users and admins can access everything - no permission checks
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Allow access to all authenticated users
  return <>{children}</>;
}



