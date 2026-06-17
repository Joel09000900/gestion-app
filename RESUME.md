o# Résumé des modifications — Projet Jeloft

## Compte Admin
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@jeloft.com | Admin1234! | ADMIN |

---

## 1. Page intermédiaire Espace Entreprise

**Problème :** Le bouton "Espace Entreprise" sur l'accueil renvoyait directement au dashboard.

**Solution :** Création d'une page intermédiaire `EntrepriseAccueil` avec 2 blocs (comme la page Client).

### Fichiers créés
- `src/PAGES/PEntreprise/EntrepriseAccueil.jsx`
- `src/PAGES/PEntreprise/EntrepriseAccueil.scss`

### Fichiers modifiés
- `src/PAGES/acceuil.js` → lien "Gérer →" pointe vers `/EntrepriseAccueil`
- `src/App.js` → route `/EntrepriseAccueil` ajoutée

### Navigation
```
Accueil → Espace Entreprise → /EntrepriseAccueil
    ├── Interface Entreprise → /Entreprise
    └── Services             → /EntrepriseServices
```

---

## 2. Page Services Entreprise

**Problème :** La route `/EntrepriseServices` n'existait pas.

**Solution :** Création d'une page `EntrepriseServices` avec 3 blocs colorés.

### Fichiers créés
- `src/PAGES/PEntreprise/EntrepriseServices.jsx`
- `src/PAGES/PEntreprise/EntrepriseServices.scss`

### Fichiers modifiés
- `src/App.js` → route `/EntrepriseServices` ajoutée

### Blocs
| Bloc | Couleur | Route cible |
|------|---------|-------------|
| Coiffure / Barber | Violet | `/EntrepriseService/coiffure` |
| Tresseuses | Rose | `/EntrepriseService/tresseuses` |
| Pressings | Turquoise | `/EntrepriseService/pressings` |

---

## 3. Dashboard Entreprise par service

**Problème :** Le dashboard `Entreprise.jsx` était générique, sans filtrage par service.

**Solution :** Lecture du paramètre URL (`useParams`) pour filtrer les données par service.

### Fichiers modifiés
- `src/PAGES/PEntreprise/Entreprise.jsx`
  - Ajout de `useParams()` → lit `serviceId` depuis l'URL
  - Appels API filtrés : `/entreprises/tickets?service=coiffure`
  - En-tête affiche le nom du service sélectionné
- `src/App.js` → route `/EntrepriseService/:serviceId` ajoutée

### Mapping des noms
| URL param | Nom affiché |
|-----------|-------------|
| `coiffure` | Coiffure / Barber |
| `tresseuses` | Tresseuses |
| `pressings` | Pressings |

---

## 4. Synchronisation tickets Client → Entreprise

**Problème :** Les tickets créés côté client (localStorage) n'apparaissaient pas dans le dashboard entreprise (qui lit l'API backend).

**Solution :** Les pages client fetchent les services depuis le backend au montage pour récupérer les `serviceId`, puis les passent à `addTicket()` qui déclenche automatiquement la sync backend (logique déjà présente dans `QueueContext`).

### Fichiers modifiés
- `src/PAGES/Services/Coiffeur.jsx`
- `src/PAGES/Services/Tresseuses.jsx`
- `src/PAGES/Services/Pressing.jsx`

### Flux de synchronisation
```
Client prend un ticket
  │
  ├─ 1. GET /services → récupère { nom → id } depuis le backend
  ├─ 2. addTicket({ ..., serviceId: X }) → mise à jour locale immédiate
  └─ 3. POST /tickets { serviceId: X } → ticket créé en base de données
                    ↓
  Dashboard Entreprise (polling /entreprises/tickets toutes les 10s)
                    ↓
            ticket apparaît dans la file
```

### Point backend important
Le endpoint `GET /services` doit retourner `[{ id, nom }]` avec des noms
correspondant exactement aux sous-services frontend :
- "Coupe homme", "Coupe enfant", "Coloration"
- "Tresses simples", "Tresses africaines", "Entretien tresses"
- "Lavage express", "Lavage normal", "Repassage", "Nettoyage sec"

---

## Architecture finale des routes Entreprise

```
/EntrepriseAccueil              ← page de choix (ENTREPRISE / ADMIN)
/EntrepriseServices             ← sélection du service (ENTREPRISE / ADMIN)
/EntrepriseService/coiffure     ← dashboard filtré coiffure
/EntrepriseService/tresseuses   ← dashboard filtré tresseuses
/EntrepriseService/pressings    ← dashboard filtré pressings
/Entreprise                     ← dashboard global (toutes services)
```
