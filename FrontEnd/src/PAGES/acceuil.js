import '../App.css';
import './acceuil.css';
import React, { useEffect, useRef, useState } from "react";
import { Link } from 'react-router-dom';
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar/Navbar';

const cardAnim = (delay) => ({
  hidden:  { opacity: 0, y: 45, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
});

export default function Acceuil() {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const showClient     = role === 'CLIENT'     || role === 'ADMIN';
  const showEntreprise = role === 'ENTREPRISE' || role === 'ADMIN';
  const showAdmin      = role === 'ADMIN';

  const vantaRef = useRef(null);
  const vantaInstance = useRef(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    if (!vantaInstance.current) {
      vantaInstance.current = NET({
        el: vantaRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        color: 0xffffff,
        backgroundColor: 0x12125e,
        points: 12,
        maxDistance: 22,
        spacing: 18,
      });
    }
    return () => {
      if (vantaInstance.current) {
        vantaInstance.current.destroy();
        vantaInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="ac-root" ref={vantaRef}>

      {/* ══ NAVBAR ══ */}
      <Navbar onAbout={() => setAboutOpen(true)} />

      {/* ══ HERO ══ */}
      <section className="ac-hero">

        {/* Image / logo animé */}
        <div className="ac-hero-image-wrap">
          <div className="ac-hero-logo-frame">
            <div
              className="ac-hero-logo-image"
              role="img"
              aria-label="Jeloft"
              style={{ backgroundImage: `url(${process.env.PUBLIC_URL}/images/jeloft-logo-transparent.png)` }}
            />
          </div>
        </div>

        {/* Texte */}
        <div className="ac-hero-text">
          <div className="ac-hero-pill">🚀 Gestion de files d'attente intelligente</div>
          <h1 className="ac-hero-title">
            Bienvenue sur <span className="ac-hero-title-accent">Jeloft</span>
          </h1>
          <p className="ac-hero-desc">
            <strong className="ac-strong">Jeloft</strong> est une application web moderne
            dédiée à la <span className="ac-hl-cyan">gestion intelligente des files d'attente</span>.
            Elle permet aux entreprises d'optimiser l'accueil de leurs clients, de réduire les
            temps d'attente et d'améliorer l'expérience utilisateur grâce à un système de{" "}
            <span className="ac-hl-purple">tickets numériques en temps réel</span>.
          </p>
          <div className="ac-hero-actions">
            <Link to="/inscription" className="ac-btn-primary">Commencer gratuitement →</Link>
            <button
              className="ac-btn-outline"
              onClick={() => setAboutOpen(true)}
            >Voir la démo</button>
          </div>
        </div>
      </section>

      {/* ══ CARDS ESPACES ══ */}

       <section className="ac-cards-section">
        <p className="ac-section-label">CHOISISSEZ VOTRE ESPACE</p>
        <div className="ac-cards-grid">

          {showClient && (
            <motion.div variants={cardAnim(0.2)} initial="hidden" animate="visible">
              <Link to="/Client" className="ac-space-card ac-card-client">
                <div className="ac-space-icon ac-icon-client">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <h3 className="ac-space-title">Espace Client</h3>
                <p className="ac-space-desc">Prenez votre ticket et suivez votre position dans la file d'attente en temps réel.</p>
                <span className="ac-space-btn ac-spbtn-client">Accéder →</span>
              </Link>
            </motion.div>
          )}

          {showEntreprise && (
            <motion.div variants={cardAnim(0.35)} initial="hidden" animate="visible">
              <Link to="/EntrepriseAccueil" className="ac-space-card ac-card-entreprise">
                <div className="ac-space-icon ac-icon-entreprise">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                </div>
                <h3 className="ac-space-title">Espace Entreprise</h3>
                <p className="ac-space-desc">Gérez vos services, appelez les clients et suivez les performances.</p>
                <span className="ac-space-btn ac-spbtn-entreprise">Gérer →</span>
              </Link>
            </motion.div>
          )}

          {showAdmin && (
            <motion.div variants={cardAnim(0.5)} initial="hidden" animate="visible">
              <Link to="/Administrateur" className="ac-space-card ac-card-admin">
                <div className="ac-space-icon ac-icon-admin">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
                  </svg>
                </div>
                <h3 className="ac-space-title">Administration</h3>
                <p className="ac-space-desc">Configuration système, gestion des utilisateurs, des guichets et rapports avancés.</p>
                <span className="ac-space-btn ac-spbtn-admin">Administrer →</span>
              </Link>
            </motion.div>
          )}
        </div>
      </section> 


      {/* ══ FEATURES ══ */}
      <section className="ac-feat-section">
        {FEATURES.map((f) => (
          <div key={f.label} className="ac-feat-item">
            <div className={`ac-feat-icon ${f.iconClass}`}>{f.icon}</div>
            <div className="ac-feat-label">{f.label}</div>
            <div className="ac-feat-desc">{f.desc}</div>
          </div>
        ))}
      </section>

      {/* ══ MODALE À PROPOS ══ */}
      {aboutOpen && (
        <div className="ac-modal-overlay" onClick={() => setAboutOpen(false)}>
          <div className="ac-modal" onClick={e => e.stopPropagation()}>
            <button className="ac-modal-close" onClick={() => setAboutOpen(false)}>✕</button>
            <div className="ac-modal-header">
              <div className="ac-modal-logo">Jel<span className="ac-logo-accent">oft</span></div>
              <div className="ac-modal-tag">Application web — Mémoire de fin d'études</div>
            </div>
            <div className="ac-modal-body">
              <div className="ac-modal-section">
                <h3 className="ac-modal-section-title">🎯 Contexte du projet</h3>
                <p className="ac-modal-text">
                  Jeloft est un outil de gestion développé dans le cadre d'un mémoire de fin d'études en Informatique.
                  Face aux longues files d'attente dans les divers secteurs notamment celui de l'informel,
                  ce projet propose une solution numérique partielle pour transformer l'expérience d'attente.
                </p>
              </div>
              <div className="ac-modal-section">
                <h3 className="ac-modal-section-title">⚙️ Fonctionnalités clés</h3>
                <ul className="ac-modal-list">
                  {[
                    "Génération et suivi de tickets numériques en temps réel",
                    "Tableau de bord analytique pour les gestionnaires",
                    "Système de priorité dynamique par catégorie",
                    "Notifications et estimations de temps d'attente",
                    "Gestion multi-services et multi-guichets",
                    "Rapports détaillés sur les performances",
                  ].map(item => (
                    <li key={item} className="ac-modal-list-item">
                      <span className="ac-list-dot"/>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ac-modal-section">
                <h3 className="ac-modal-section-title">🛠️ Technologies utilisées</h3>
                <div className="ac-tech-row">
                  {["React.js", "Node.js", "Express", "PostgreSQL", "Prisma", "JWT"].map(t => (
                    <span key={t} className="ac-tech-badge">{t}</span>
                  ))}
                </div>
              </div>
              <div className="ac-modal-section">
                <h3 className="ac-modal-section-title">👤 Auteur</h3>
                <p className="ac-modal-text">
                  Projet réalisé par <strong className="ac-author">Joël</strong>. Ce système vise à
                  améliorer la qualité de service dans les structures accueillant du public en
                  Afrique et au-delà.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const FEATURES = [
  {
    label: "Multi-Services",
    desc: "Gestion simultanée de multiples services et points d'accueil",
    iconClass: "ac-feat-icon--multi",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];
