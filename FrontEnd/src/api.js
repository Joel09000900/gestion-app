const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  // Le corps n'est pas toujours du JSON valide (413, 502, 204, erreur proxy…).
  // On lit en texte d'abord pour ne pas masquer le vrai statut HTTP.
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { /* corps non-JSON */ }
  }

  if (!res.ok) {
    // Token périmé/invalide sur une requête authentifiée → on purge la session
    // et on renvoie vers la connexion plutôt que d'afficher une page vide silencieuse.
    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined' && window.location.pathname !== '/connexion') {
        window.location.assign('/connexion');
      }
    }
    const message =
      data?.message ||
      (res.status === 413 ? 'Fichier trop volumineux' : null) ||
      `Erreur ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  get:    (path)       => request(path),
  post:   (path, body) => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body) => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)       => request(path, { method: 'DELETE' }),
};
