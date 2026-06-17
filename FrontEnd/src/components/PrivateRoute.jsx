import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    if (user.role === 'CLIENT')     return <Navigate to="/Client" replace />;
    if (user.role === 'ENTREPRISE') return <Navigate to="/Entreprise" replace />;
    if (user.role === 'ADMIN')      return <Navigate to="/Administrateur" replace />;
  }

  return children;
}
