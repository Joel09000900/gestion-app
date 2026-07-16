
import Navbar from '../Navbar/Navbar';
import './EntrepriseAccueil.scss';
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import NET from "vanta/dist/vanta.net.min";
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AiOutlineShop } from 'react-icons/ai';

const ORB_PULSE = {
  animate: {
    boxShadow: [
      '0 0 16px rgba(123,110,246,0.35)',
      '0 0 36px rgba(123,110,246,0.75)',
      '0 0 16px rgba(123,110,246,0.35)',
    ],
  },
  transition: { repeat: Infinity, duration: 2.6, ease: 'easeInOut' },
};

const card = (delay) => ({
  hidden:  { opacity: 0, y: 45, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { delay, duration: 0.65, ease: [0.16, 1, 0.3, 1] },
  },
});

export default function EntrepriseAccueil() {
  const vantaInstance = useRef(null);
  const vantaRef = useRef(null);
  const navigate = useNavigate();

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

  return (
    <>
      <div ref={vantaRef} className="vanta-wrapper">

        <div className="navbar-overlay">
          <Navbar />
        </div>

        <div className="client-cards">

          {/* ── Interface Entreprise ── */}
          <motion.div
            className="client-card"
            variants={card(0.2)}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.04, y: -6,
              boxShadow: '0 32px 60px rgba(0,0,0,0.5), 0 0 30px rgba(123,110,246,0.3)',
            }}
          >
            <motion.div
              className="orb"
              animate={ORB_PULSE.animate}
              transition={ORB_PULSE.transition}
            >
              <AiOutlineShop size={28} color="#fff" />
            </motion.div>

            <h3 className="gc-title">Interface Entreprise</h3>
            <p className="gc-subtitle">Gérez la file d'attente et appelez les clients</p>

            <motion.button
              className="btn-submit"
              onClick={() => navigate('/Entreprise')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Confirmer
            </motion.button>
          </motion.div>

        </div>
      </div>
    </>
  );
}
