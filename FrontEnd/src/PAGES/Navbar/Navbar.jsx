import React from 'react'
import './Navbar.scss';
import { Link, useNavigate } from 'react-router-dom';
import { AiFillHome, AiOutlineUser } from 'react-icons/ai';
import { useAuth } from '../../context/AuthContext';

export default function Navbar({ onAbout }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const roleLabel = { CLIENT: 'Client', ENTREPRISE: 'Entreprise', ADMIN: 'Admin' };

  return (
    <nav className="nav-bar">
      <div className="nav-left">
        <span className="nav-logo">Jelo<span>ft</span></span>
        <Link to="/" className="nav-icon" title="Accueil"><AiFillHome size={17} /></Link>
        <span className="nav-icon" title="Retour" onClick={() => navigate(-1)}>←</span>
      </div>

      {onAbout && (
        <div className="nav-center1">
          <Link to="/" className="btn-nav btn-nav--outline">Accueil</Link>
          <button className="btn-nav btn-nav--outline" onClick={onAbout}>À propos</button>
        </div>
      )}
      <div className="nav-right">
        {user ? (
          <>
            <div className="nav-user">
              <AiOutlineUser size={16} />
              <span className="nav-user__name">{user.nom}</span>
              <span className="nav-user__role">{roleLabel[user.role]}</span>
            </div>
            <button className="btn-nav btn-nav--outline" onClick={handleLogout}>
              Déconnexion
            </button>
          </>
        ) : (
          <>
            <Link to="/connexion" className="btn-nav btn-nav--outline">Connexion</Link>
            <Link to="/inscription" className="btn-nav btn-nav--fill">Inscription</Link>
          </>
        )}
      </div>
    </nav>
  );
}



