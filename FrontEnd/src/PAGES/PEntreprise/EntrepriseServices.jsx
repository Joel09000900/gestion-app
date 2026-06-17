import Navbar from '../Navbar/Navbar';
import './EntrepriseAccueil.scss';
import './EntrepriseServices.scss';
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCut, FaCar } from 'react-icons/fa';
import { GiComb } from 'react-icons/gi';
import { MdLocalLaundryService } from 'react-icons/md';
import { useAuth } from '../../context/AuthContext';

// L'id correspond à Entreprise.type et à la route /EntrepriseService/:type
const SERVICES = [
  { id: 'coiffure',    icon: <FaCut size={26} color="#fff" />,                 title: 'Coiffure / Barber', desc: 'Gérer la file coiffure',     orbGradient: 'linear-gradient(135deg, #4a48e8 0%, #8b7cf8 100%)', glowColor: 'rgba(123,110,246,0.75)' },
  { id: 'tresseuses',  icon: <GiComb size={26} color="#fff" />,                title: 'Tresseuses',        desc: 'Gérer la file tresseuses',   orbGradient: 'linear-gradient(135deg, #c4336e 0%, #f07ab0 100%)', glowColor: 'rgba(240,122,176,0.75)' },
  { id: 'pressings',   icon: <MdLocalLaundryService size={28} color="#fff" />, title: 'Pressings',         desc: 'Gérer la file pressings',    orbGradient: 'linear-gradient(135deg, #1a8fa8 0%, #5de0d8 100%)', glowColor: 'rgba(93,224,216,0.75)' },
  { id: 'lavage-auto', icon: <FaCar size={26} color="#fff" />,                 title: 'Lavage Automobile', desc: 'Gérer la file lavage auto',  orbGradient: 'linear-gradient(135deg, #1a8f4a 0%, #4ecb71 100%)', glowColor: 'rgba(78,203,113,0.75)' },
];

const cardVariant = (delay) => ({
  hidden:  { opacity: 0, y: 45, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] } },
});

// Réservé à l'ADMIN : choisir n'importe quel type de service à gérer.
// Une entreprise normale est verrouillée sur son type → redirigée vers son dashboard.
export default function EntrepriseServices() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const vantaRef = useRef(null);
  const vantaInstance = useRef(null);

  useEffect(() => {
    if (user && !isAdmin) { navigate("/Entreprise", { replace: true }); return; }
    if (isAdmin && !vantaInstance.current) {
      vantaInstance.current = NET({
        el: vantaRef.current, THREE,
        mouseControls: true, touchControls: true, gyroControls: false,
        minHeight: 700.0, minWidth: 150.0, scale: 1.0, scaleMobile: 1.0,
        color: 0xffffff, backgroundColor: 0x26266d,
      });
    }
    return () => {
      if (vantaInstance.current) {
        vantaInstance.current.destroy();
        vantaInstance.current = null;
      }
    };
  }, [user, isAdmin, navigate]);

  if (!isAdmin) return null;

  return (
    <div ref={vantaRef} className="vanta-wrapper">
      <div className="navbar-overlay">
        <Navbar />
      </div>

      <div className="service2-content">
        <motion.div
          className="service2-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.5, ease: 'easeOut' } }}
        >
          <h2 className="gc-title">Administration — Services</h2>
          <p className="gc-subtitle">Sélectionnez le service à gérer (accès total)</p>
        </motion.div>

        <div className="client-cards service2-grid">
          {SERVICES.map((svc, i) => (
            <motion.div
              key={svc.id}
              className="client-card"
              variants={cardVariant(0.2 + i * 0.12)}
              initial="hidden"
              animate="visible"
              whileHover={{ scale: 1.04, y: -6, boxShadow: `0 32px 60px rgba(0,0,0,0.5), 0 0 30px ${svc.glowColor.replace('0.75', '0.4')}` }}
            >
              <motion.div
                className="orb"
                style={{ background: svc.orbGradient }}
                animate={{ boxShadow: [
                  `0 0 16px ${svc.glowColor.replace('0.75', '0.35')}`,
                  `0 0 36px ${svc.glowColor}`,
                  `0 0 16px ${svc.glowColor.replace('0.75', '0.35')}`,
                ] }}
                transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
              >
                {svc.icon}
              </motion.div>

              <h3 className="gc-title">{svc.title}</h3>
              <p className="gc-subtitle">{svc.desc}</p>

              <motion.button
                className="btn-submit"
                style={{ background: svc.orbGradient }}
                onClick={() => navigate(`/EntrepriseService/${svc.id}`)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Gérer
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
