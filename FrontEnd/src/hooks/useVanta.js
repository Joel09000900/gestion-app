import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import NET from 'vanta/dist/vanta.net.min';
import { useTheme } from '../context/ThemeContext';

// Fond animé Vanta NET, partagé par les onze pages qui l'utilisaient chacune
// avec son propre useEffect dupliqué.
//
// Le filet est dessiné dans un canvas WebGL : ses couleurs ne viennent pas du
// CSS et ne peuvent donc pas suivre les variables de theme.css. Le hook lit le
// thème courant et recrée l'instance au basculement — Vanta n'offre pas de
// mise à jour de couleur fiable à chaud.

// Seule source de vérité des couleurs du filet : un seul endroit à changer.
// `color` = les traits et les points du réseau, `backgroundColor` = le fond.
const COULEURS = {
  // Filet blanc sur fond noir.
  nuit: { backgroundColor: 0x000000, color: 0xffffff },
  // Fond blanc, filet violet — le violet d'accent du projet (#8b7cf8, celui du
  // logo et des boutons pleins), qui reste lisible sur blanc.
  jour: { backgroundColor: 0xffffff, color: 0x8b7cf8 },
};

const DEFAUTS = {
  mouseControls: true,
  touchControls: true,
  gyroControls: false,
  minHeight: 800.0,
  minWidth: 150.0,
  scale: 1.0,
  scaleMobile: 1.0,
};

/**
 * Renvoie la ref à poser sur l'élément qui porte le fond.
 * `options` permet les réglages propres à une page (points, spacing, minHeight…).
 */
export function useVanta(options = {}) {
  const el = useRef(null);
  const instance = useRef(null);
  const { theme } = useTheme();

  // L'objet d'options est recréé à chaque rendu : on le fige par sa valeur,
  // sinon l'effet rejouerait en boucle et détruirait le canvas sans arrêt.
  const cleOptions = JSON.stringify(options);
  const reglages = useMemo(() => JSON.parse(cleOptions), [cleOptions]);

  useEffect(() => {
    const conteneur = el.current;
    if (!conteneur) return undefined;

    // Filet de sécurité : si un canvas Vanta a survécu à un démontage (double
    // invocation des effets en StrictMode, destroy() interrompu), deux filets
    // se superposeraient et l'ancien garderait les couleurs du thème précédent.
    conteneur.querySelectorAll('canvas.vanta-canvas').forEach((c) => c.remove());

    instance.current = NET({
      el: conteneur,
      THREE,
      ...DEFAUTS,
      ...COULEURS[theme === 'jour' ? 'jour' : 'nuit'],
      ...reglages,
    });

    return () => {
      instance.current?.destroy();
      instance.current = null;
    };
  }, [theme, reglages]);

  return el;
}
