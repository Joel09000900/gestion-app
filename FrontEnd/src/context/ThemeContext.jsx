import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';

// Thème de l'interface : 'nuit' (défaut, apparence historique du projet) ou
// 'jour' (noir et blanc inversés — cf. theme.css).
//
// Le thème est porté par l'attribut data-theme sur <html> : une seule feuille
// de style suffit, et les composants n'ont pas à connaître les couleurs.

const CLE = 'jeloft:theme';
const THEMES = ['nuit', 'jour'];

function themeInitial() {
  try {
    const enregistre = localStorage.getItem(CLE);
    if (THEMES.includes(enregistre)) return enregistre;
  } catch {
    /* localStorage indisponible (navigation privée stricte) → défaut */
  }
  return 'nuit';
}

// Appliqué dès l'import, avant le premier rendu de React : sans cela, un
// utilisateur en mode jour verrait un flash noir le temps du montage.
function appliquer(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
appliquer(themeInitial());

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(themeInitial);

  useEffect(() => {
    appliquer(theme);
    try {
      localStorage.setItem(CLE, theme);
    } catch {
      /* préférence non persistée — l'affichage reste correct pour la session */
    }
  }, [theme]);

  const basculer = useCallback(
    () => setTheme((t) => (t === 'nuit' ? 'jour' : 'nuit')),
    []
  );

  return (
    <ThemeContext.Provider value={{ theme, basculer }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Repli hors provider : évite de faire planter un composant monté seul
// (test unitaire, story isolée) pour une simple question de couleurs.
export function useTheme() {
  return useContext(ThemeContext) ?? { theme: 'nuit', basculer: () => {} };
}
