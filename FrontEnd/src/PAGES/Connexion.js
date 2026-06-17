
import { Link, useNavigate } from 'react-router-dom';
import './Connexion.scss';

import Navbar from './Navbar/Navbar';
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineMail, AiOutlineLock } from 'react-icons/ai';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';



function Connexion() {
  const { login } = useAuth();
  const navigate = useNavigate();

  /* ── Vanta background ── */
  const vantaInstance = useRef(null);
  const vantaRef = useRef(null);

  useEffect(() => {
    if (!vantaInstance.current) {
      vantaInstance.current = NET({
        el: vantaRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 800.0,
        minWidth: 150.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color: 0xffffff,
        backgroundColor: 0x26266d,
      });
    }
    return () => {
      if (vantaInstance.current) {
        vantaInstance.current.destroy();
        vantaInstance.current = null;
      }
    };
  }, []);

  /* ── État du formulaire ── */
  const [formData, setFormData] = useState({ email: '', motDePasse: '' });
  const [showPassword, setShowPassword]   = useState(false);
  const [focusedField, setFocusedField]   = useState(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [erreur, setErreur]               = useState(null);

  const isActive = (field) => focusedField === field || !!formData[field];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErreur(null);
    try {
      const data = await api.post('/auth/connexion', {
        email: formData.email,
        password: formData.motDePasse,
      });
      login(data.token, data.user);
      setSubmitted(true);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setErreur(err.message);
      setIsLoading(false);
    }
  };

  /* ── Variants Framer Motion ── */
  const cardVariants = {
    hidden:  { opacity: 0, y: 50, scale: 0.96 },
    visible: { opacity: 1, y: 0,  scale: 1,
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
  };

  const item = (delay = 0) => ({
    hidden:  { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0,
      transition: { delay, duration: 0.5, ease: 'easeOut' } },
  });

  /* ── Rendu ── */
  return (
    <div className="connexion-page" id="PageConnexion">
      <div
        ref={vantaRef}
        className="vanta-wrapper"
      >
        {/* Navbar */}
        <div className="navbar-overlay">
          <Navbar />
        </div>

        {/* Carte de connexion */}
        <motion.div
          className="glass-card"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >

          {/* ── Header ── */}
          <motion.div className="gc-header" variants={item(0.15)} initial="hidden" animate="visible">
            <motion.div
              className="orb"
              animate={{
                boxShadow: [
                  '0 0 16px rgba(123,110,246,0.35)',
                  '0 0 36px rgba(123,110,246,0.75)',
                  '0 0 16px rgba(123,110,246,0.35)',
                ],
              }}
              transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
            >
              <AiOutlineLock size={26} color="#fff" />
            </motion.div>
            <h2 className="gc-title">Bienvenue</h2>
            <p className="gc-subtitle">Entrez vos identifiants pour accéder à votre espace</p>
          </motion.div>

          {/* ── Erreur ── */}
          {erreur && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ color:'#ff6b6b', fontSize:'.85rem', textAlign:'center', marginBottom:'8px' }}>
              {erreur}
            </motion.div>
          )}

          {/* ── Formulaire ── */}
          <form className="gc-form" onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <motion.div
              className={`field-group ${isActive('email') ? 'active' : ''}`}
              variants={item(0.28)}
              initial="hidden"
              animate="visible"
            >
              <AiOutlineMail className="field-icon" size={17} />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoComplete="email"
                required
              />
              <label htmlFor="email">Adresse email</label>
              <span className="field-line" />
            </motion.div>

            {/* Mot de passe */}
            <motion.div
              className={`field-group ${isActive('motDePasse') ? 'active' : ''}`}
              variants={item(0.38)}
              initial="hidden"
              animate="visible"
            >
              <AiOutlineLock className="field-icon" size={17} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="motDePasse"
                name="motDePasse"
                value={formData.motDePasse}
                onChange={handleChange}
                onFocus={() => setFocusedField('motDePasse')}
                onBlur={() => setFocusedField(null)}
                autoComplete="current-password"
                required
              />
              <label htmlFor="motDePasse">Mot de passe</label>
              <span className="field-line" />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword
                  ? <AiOutlineEyeInvisible size={18} />
                  : <AiOutlineEye size={18} />}
              </button>
            </motion.div>

            {/* Bouton */}
            <motion.button
              type="submit"
              className={`btn-submit ${isLoading ? 'loading' : ''} ${submitted ? 'success' : ''}`}
              disabled={isLoading || submitted}
              variants={item(0.48)}
              initial="hidden"
              animate="visible"
              whileHover={!isLoading && !submitted ? { scale: 1.03 } : {}}
              whileTap={!isLoading && !submitted ? { scale: 0.97 } : {}}
            >
              <AnimatePresence mode="wait">
                {isLoading && (
                  <motion.span key="spinner" className="spinner"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
                )}
                {!isLoading && !submitted && (
                  <motion.span key="label"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    Se connecter
                  </motion.span>
                )}
                {submitted && (
                  <motion.span key="ok"
                    initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    ✓ Connecté
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          {/* ── Footer ── */}
          <motion.div className="gc-footer" variants={item(0.58)} initial="hidden" animate="visible">
            <p>Pas encore de compte ?<Link to="/inscription">S'inscrire</Link></p>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}

export default Connexion;
