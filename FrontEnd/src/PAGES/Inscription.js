
import { Link, useNavigate } from 'react-router-dom';
import './Inscription.scss';
import Navbar from './Navbar/Navbar';
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineUser, AiOutlineMail, AiOutlineUserAdd, AiOutlineIdcard, AiOutlineShop, AiOutlineLock } from 'react-icons/ai';
import { FaCut, FaCar } from 'react-icons/fa';
import { GiComb } from 'react-icons/gi';
import { MdLocalLaundryService } from 'react-icons/md';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

/* Email valide : du texte, un @, un domaine, un point, une extension. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Inscription() {
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

  /* ── Choix du rôle ── */
  const [role, setRole] = useState(null); // null | 'client' | 'entreprise'

  /* ── Type de service (entreprise uniquement) ── */
  const [serviceType, setServiceType] = useState(null); // coiffure | tresseuses | pressings | lavage-auto

  /* ── État du formulaire ── */
  const [formData, setFormData] = useState({ nom: '', email: '', password: '' });
  const [focusedField, setFocusedField] = useState(null);
  const [isLoading, setIsLoading]       = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [erreur, setErreur]             = useState(null);

  const isActive = (field) => focusedField === field || !!formData[field];

  /* ── Validité du formulaire ── */
  const emailValide      = EMAIL_RE.test(formData.email.trim());
  const tousChampsRemplis = formData.nom.trim() !== '' && formData.email.trim() !== '' && formData.password.trim() !== '';
  const serviceChoisi    = role !== 'entreprise' || !!serviceType;
  const peutSoumettre    = tousChampsRemplis && emailValide && serviceChoisi;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (role === 'entreprise' && !serviceType) {
      setErreur('Veuillez choisir votre type de service.');
      return;
    }
    if (!tousChampsRemplis) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }
    if (!emailValide) {
      setErreur('Veuillez saisir une adresse email valide (avec « @ »).');
      return;
    }
    setIsLoading(true);
    setErreur(null);
    try {
      const payload = { ...formData, email: formData.email.trim(), nom: formData.nom.trim(), role };
      if (role === 'entreprise') payload.type = serviceType;
      const data = await api.post('/auth/inscription', payload);
      login(data.token, data.user);
      setSubmitted(true);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setErreur(err.message);
      setIsLoading(false);
    }
  };

  /* ── Types de service proposés à l'entreprise ── */
  const SERVICE_TYPES = [
    { id: 'coiffure',    label: 'Coiffure / Barber', Icon: FaCut },
    { id: 'tresseuses',  label: 'Tresseuses',        Icon: GiComb },
    { id: 'pressings',   label: 'Pressings',         Icon: MdLocalLaundryService },
    { id: 'lavage-auto', label: 'Lavage Auto',       Icon: FaCar },
  ];

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
    <div className="inscription-page-new">
      <div
        ref={vantaRef}
        className="vanta-wrapper"
      >
        {/* Navbar */}
        <div className="navbar-overlay">
          <Navbar />
        </div>

        <AnimatePresence mode="wait">

          {/* ── ÉTAPE 1 : choix du rôle ── */}
          {!role && (
            <motion.div
              key="role-step"
              className="glass-card"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -30, scale: 0.96, transition: { duration: 0.3 } }}
            >
              <motion.div className="gc-header" variants={item(0.15)} initial="hidden" animate="visible">
                <motion.div
                  className="orb"
                  animate={{ boxShadow: ['0 0 16px rgba(123,110,246,0.35)', '0 0 36px rgba(123,110,246,0.75)', '0 0 16px rgba(123,110,246,0.35)'] }}
                  transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                >
                  <AiOutlineUserAdd size={26} color="#fff" />
                </motion.div>
                <h2 className="gc-title">Créer un compte</h2>
                <p className="gc-subtitle">Choisissez votre type de compte pour continuer</p>
              </motion.div>

              <div className="role-cards">
                {/* Client */}
                <motion.button
                  className="role-card"
                  onClick={() => setRole('client')}
                  variants={item(0.28)} initial="hidden" animate="visible"
                  whileHover={{ scale: 1.04, y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(123,110,246,0.25)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <motion.div
                    className="orb"
                    animate={{ boxShadow: ['0 0 16px rgba(123,110,246,0.35)', '0 0 36px rgba(123,110,246,0.75)', '0 0 16px rgba(123,110,246,0.35)'] }}
                    transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                  >
                    <AiOutlineIdcard size={24} color="#fff" />
                  </motion.div>
                  <div className="role-card__title">Client</div>
                  <div className="role-card__desc">Prenez des tickets et suivez votre position dans la file d'attente</div>
                </motion.button>

                {/* Entreprise */}
                <motion.button
                  className="role-card"
                  onClick={() => setRole('entreprise')}
                  variants={item(0.38)} initial="hidden" animate="visible"
                  whileHover={{ scale: 1.04, y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 20px rgba(123,110,246,0.25)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <motion.div
                    className="orb"
                    animate={{ boxShadow: ['0 0 16px rgba(123,110,246,0.35)', '0 0 36px rgba(123,110,246,0.75)', '0 0 16px rgba(123,110,246,0.35)'] }}
                    transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                  >
                    <AiOutlineShop size={24} color="#fff" />
                  </motion.div>
                  <div className="role-card__title">Entreprise</div>
                  <div className="role-card__desc">Gérez vos services, votre équipe et votre file d'attente</div>
                </motion.button>
              </div>

              <motion.div className="gc-footer" variants={item(0.5)} initial="hidden" animate="visible">
                <p>Déjà un compte ? <Link to="/connexion">Se connecter</Link></p>
              </motion.div>
            </motion.div>
          )}

          {/* ── ÉTAPE 2 : formulaire ── */}
          {role && (
            <motion.div
              key="form-step"
              className="glass-card"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -30, scale: 0.96, transition: { duration: 0.3 } }}
            >
              {/* Badge rôle + retour */}
              <motion.div className="role-badge-row" variants={item(0.1)} initial="hidden" animate="visible">
                <button className="role-back-btn" onClick={() => { setRole(null); setServiceType(null); setSubmitted(false); setFormData({ nom: '', email: '', password: '' }); }}>← Retour</button>
                <span className="role-badge">
                  {role === 'client' ? <><AiOutlineIdcard size={13} /> Client</> : <><AiOutlineShop size={13} /> Entreprise</>}
                </span>
              </motion.div>

              {/* Header */}
              <motion.div className="gc-header" variants={item(0.18)} initial="hidden" animate="visible">
                <motion.div
                  className="orb"
                  animate={{ boxShadow: ['0 0 16px rgba(123,110,246,0.35)', '0 0 36px rgba(123,110,246,0.75)', '0 0 16px rgba(123,110,246,0.35)'] }}
                  transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                >
                  <AiOutlineUserAdd size={26} color="#fff" />
                </motion.div>
                <h2 className="gc-title">Créer un compte</h2>
                <p className="gc-subtitle">Rejoignez Jeloft pour gérer vos files d'attente</p>
              </motion.div>

              {/* Erreur */}
              {erreur && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                  style={{ color:'#ff6b6b', fontSize:'.85rem', textAlign:'center', marginBottom:'8px' }}>
                  {erreur}
                </motion.div>
              )}

              {/* Formulaire */}
              <form className="gc-form" onSubmit={handleSubmit} noValidate>

                {/* Choix du type de service (entreprise) */}
                {role === 'entreprise' && (
                  <motion.div variants={item(0.24)} initial="hidden" animate="visible" style={{ marginBottom: '10px' }}>
                    <p style={{ fontSize: '.82rem', color: '#c4c9ee', marginBottom: '8px' }}>
                      Type de service fourni
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {SERVICE_TYPES.map((t) => {
                        const selected = serviceType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setServiceType(t.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '8px 12px', borderRadius: '10px', cursor: 'pointer',
                              fontSize: '.85rem', color: '#fff',
                              background: selected ? 'linear-gradient(135deg, #6c63ff, #4fc3f7)' : 'rgba(255,255,255,0.07)',
                              border: selected ? '1px solid transparent' : '1px solid rgba(255,255,255,0.2)',
                              transition: 'all .2s ease',
                            }}
                          >
                            <t.Icon size={15} /> {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                <motion.div className={`field-group ${isActive('nom') ? 'active' : ''}`} variants={item(0.28)} initial="hidden" animate="visible">
                  <AiOutlineUser className="field-icon" size={17} />
                  <input type="text" id="nom" name="nom" value={formData.nom} onChange={handleChange}
                    onFocus={() => setFocusedField('nom')} onBlur={() => setFocusedField(null)} autoComplete="name" required />
                  <label htmlFor="nom">Nom</label>
                  <span className="field-line" />
                </motion.div>

                <motion.div className={`field-group ${isActive('email') ? 'active' : ''}`} variants={item(0.38)} initial="hidden" animate="visible">
                  <AiOutlineMail className="field-icon" size={17} />
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleChange}
                    onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} autoComplete="email" required />
                  <label htmlFor="email">Adresse email</label>
                  <span className="field-line" />
                </motion.div>

                {formData.email.trim() !== '' && !emailValide && (
                  <span style={{ color: '#ff6b6b', fontSize: '.78rem', marginTop: '-6px', marginBottom: '2px' }}>
                    Adresse email invalide — elle doit contenir « @ » et un domaine.
                  </span>
                )}

                <motion.div className={`field-group ${isActive('password') ? 'active' : ''}`} variants={item(0.44)} initial="hidden" animate="visible">
                  <AiOutlineLock className="field-icon" size={17} />
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleChange}
                    onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} autoComplete="new-password" required />
                  <label htmlFor="password">Mot de passe</label>
                  <span className="field-line" />
                </motion.div>

                <motion.button
                  type="submit"
                  className={`btn-submit ${isLoading ? 'loading' : ''} ${submitted ? 'success' : ''}`}
                  disabled={isLoading || submitted || !peutSoumettre}
                  variants={item(0.48)} initial="hidden" animate="visible"
                  whileHover={!isLoading && !submitted && peutSoumettre ? { scale: 1.03 } : {}}
                  whileTap={!isLoading && !submitted && peutSoumettre ? { scale: 0.97 } : {}}
                >
                  <AnimatePresence mode="wait">
                    {isLoading  && <motion.span key="spinner" className="spinner" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} />}
                    {!isLoading && !submitted && <motion.span key="label" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>S'inscrire</motion.span>}
                    {submitted  && <motion.span key="ok" initial={{ opacity:0, scale:0.7 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}>✓ Compte créé</motion.span>}
                  </AnimatePresence>
                </motion.button>
              </form>

              <motion.div className="gc-footer" variants={item(0.58)} initial="hidden" animate="visible">
                <p>Déjà un compte ? <Link to="/connexion">Se connecter</Link></p>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

export default Inscription;
