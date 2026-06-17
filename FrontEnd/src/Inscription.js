import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './App.css';
import Navbar from './PAGES/Navbar';

function Inscription() {
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    motDePasse: '',
    confirmerMotDePasse: '',
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
    if (formData.motDePasse !== formData.confirmerMotDePasse) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    if (!formData.accepteConditions) {
      alert('Veuillez accepter les conditions d\'utilisation');
      return;
    }
    console.log('Données d\'inscription:', formData);
    alert('Inscription réussie !');
  };

  return (
    <div className="inscription-page-new">
      {/* Navigation */}
    <Navbar />

      {/* Formulaire */}
      <div className="form-container">
        <div className="form-card">
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
          </div>

          {/* Formulaire d'inscription */}
          <form className="inscription-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                name="nom"
                placeholder="Nom"
                className="form-field"
                value={formData.nom}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <input
                type="text"
                name="prenom"
                placeholder="Prénom"
                className="form-field"
                value={formData.prenom}
                onChange={handleChange}
                required
              />
            </div>

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
                type="tel"
                name="telephone"
                placeholder="Téléphone"
                className="form-field"
                value={formData.telephone}
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

            <div className="form-group">
              <input
                type="password"
                name="confirmerMotDePasse"
                placeholder="Confirmer le mot de passe"
                className="form-field"
                value={formData.confirmerMotDePasse}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn-submit">
              S'inscrire
            </button>
          </form>

          {/* Section légale */}
          <div className="legal-section">
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
                J'accepte les{' '}
                <button type="button" className="btn btn-link p-0 legal-link">conditions d'utilisation</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inscription;