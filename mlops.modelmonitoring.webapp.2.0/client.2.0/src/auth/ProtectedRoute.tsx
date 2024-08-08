import { UseUser } from './UseUser';
import { useLocation, Navigate } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';

/**
 * Component Name:
 * ProtectedRoute Component
 *
 * Description:
 * This component is a higher-order component  designed to handle route protection.
 * It ensurs that UI components are accessible only to authenticated users.
 *
 * Props:
 *  children: React.ReactNode - rendered within this protected route.
 *
 * Usage:
 * Wrap any component that should be protected by authentication with this `ProtectedRoute` component in your route configuration.
 *
 * Example:
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 **/

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const location = useLocation();
  const user = UseUser();

  useEffect(() => {
    setLoaded(true);
  });

  if (!user && loaded) {
    return <Navigate to="/login" state={{ from: location }} />;
  }

  return children;
}
