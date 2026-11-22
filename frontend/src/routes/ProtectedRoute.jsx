import { Navigate, useLocation } from 'react-router-dom';
import Spinner from '../components/ui/Spinner.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const { pathname, search, hash } = useLocation();
  // This guard improves navigation UX. The API enforces access against the database.
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: pathname + search + hash }} />;
  if (roles && !roles.includes(user.role)) return <h1>Not allowed</h1>;
  return children;
}
