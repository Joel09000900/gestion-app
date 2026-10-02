
import Navbar from '../Navbar/Navbar';
import './Client.scss';
import React, {  } from "react";
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AiOutlineIdcard, AiOutlineAppstore } from 'react-icons/ai';
import { useVanta } from '../../hooks/useVanta';

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

export default function Client() {
  // Fond anime Vanta : couleurs pilotees par le theme (cf. useVanta).
  const vantaRef = useVanta();
  const navigate  = useNavigate();


  return (
    <>
      <div ref={vantaRef} className="vanta-wrapper">

        <div className="navbar-overlay">
          <Navbar />
        </div>

        <div className="client-cards">

          {/* ── Interface Usager ── */}
          <motion.div
            className="client-card InterfaceUsager"
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
              <AiOutlineIdcard size={28} color="#fff" />
            </motion.div>

            <h3 className="gc-title">Interface Usager</h3>
            <p className="gc-subtitle">Prise de tickets</p>

            <motion.button
              className="btn-submit"
              onClick={() => navigate('/Client2')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Confirmer
            </motion.button>
          </motion.div>

          {/* ── Services ── */}
          <motion.div
            className="client-card Service"
            variants={card(0.35)}
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
              <AiOutlineAppstore size={28} color="#fff" />
            </motion.div>

            <h3 className="gc-title">Services</h3>
            <p className="gc-subtitle">Sélectionner le service</p>

            <motion.button
              className="btn-submit"
              onClick={() => navigate('/Service2')}
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
