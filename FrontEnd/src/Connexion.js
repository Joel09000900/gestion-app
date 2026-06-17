import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import Navbar from './PAGES/Navbar';

function Connexion() {
  const [formData, setFormData] = useState({
    email: '',
    motDePasse: '',
    accepteConditions: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.accepteConditions) {
      alert('Veuillez accepter les conditions d\'utilisation');
      return;
    }
    console.log('Données de connexion:', formData);
    alert('Connexion réussie !');
  };

  return (
    <div className="connexion-page">
      {/* Navigation */}
      <Navbar />

      {/* Formulaire */}
      <div className="form-container">
        <div className="form-card connexion-card">
          {/* Logo */}
          <div className="logo-section">
            <div className="logo-circle">
              <div className="logo-waves">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
            <h1 className="logo-text">Jeloft</h1>
            <h2 className="logo-subtitle">Jeloft</h2>
          </div>

          {/* Message d'instruction */}
          <div className="instruction-box">
            <p className="instruction-text">
              Connectez-vous pour accéder à votre espace personnel et gérer vos services en toute simplicité.
            </p>
          </div>

          {/* Formulaire de connexion */}
          <form className="connexion-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="email"
                name="email"
                placeholder="Email"
                className="form-field"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                name="motDePasse"
                placeholder="Mot de passe"
                className="form-field"
                value={formData.motDePasse}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn-connexion">
              Connexion
            </button>
          </form>

          {/* Section légale */}
          <div className="legal-section connexion-legal">
            <div className="checkbox-container">
              <input
                type="checkbox"
                name="accepteConditions"
                className="legal-checkbox"
                checked={formData.accepteConditions}
                onChange={handleChange}
                required
              />
              <p className="legal-text">
                I accept all legal conditions
              </p>
            </div>
            <button type="button" className="btn-conditions">
              See the condition
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Connexion;
