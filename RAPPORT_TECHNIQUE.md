# Rapport Technique — Projet Jeloft (Système de File d'Attente)

**Date** : 28 mai 2026  
**Stack** : React · Node.js · Express · Prisma · Neon (PostgreSQL)

---

## 1. Architecture Générale

```
jojo/
├── FrontEnd/          ← Application React (port 3000)
├── BackEnd/           ← API REST Node/Express (port 5000)
└── RAPPORT_TECHNIQUE.md
```

### Schéma de communication

```
Navigateur (React)
      │
      │  HTTP/REST (fetch + JWT)
      ▼
API Express  ──── Prisma ORM ──── Neon PostgreSQL (cloud)
(localhost:5000)
```

---

## 2. Problèmes résolus en début de session

### 2.1 package.json manquant (FrontEnd)
**Problème** : `npm error ENOENT: no such file or directory, package.json`  
**Cause** : Le fichier `package.json` avait été supprimé. Seul le dossier `node_modules` existait avec un lock file vide.  
**Solution** : Recréation manuelle du `package.json` avec les dépendances détectées depuis le code source.

### 2.2 Dépendances manquantes
**Problème** : `Module not found: Can't resolve 'three' / 'vanta' / 'framer-motion' / 'react-icons' / 'sass'`  
**Solution** : Installation des dépendances manquantes :
```bash
npm install three vanta framer-motion react-icons sass
```

### 2.3 Conflit ESLint / node_modules corrompu
**Problème** : Webpack mélange les chemins `frontend` (minuscules) et `FrontEnd` (majuscules) à cause d'une installation incohérente sur Windows.  
**Solution** : Suppression complète de `node_modules` et réinstallation propre depuis zéro. Ajout de `.env` avec `DISABLE_ESLINT_PLUGIN=true`.

---

## 3. Mise en place du Backend

### 3.1 Structure créée

```
BackEnd/
├── prisma/
│   └── schema.prisma          ← Modèles de données
├── src/
│   ├── index.js               ← Point d'entrée (port 5000)
│   ├── app.js                 ← Express + CORS
│   ├── middlewares/
│   │   └── auth.middleware.js ← Vérification JWT + rôles
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── tickets.controller.js
│   │   ├── services.controller.js
│   │   └── entreprises.controller.js
│   └── routes/
│       ├── auth.routes.js
│       ├── tickets.routes.js
│       ├── services.routes.js
│       └── entreprises.routes.js
├── .env                       ← DATABASE_URL + JWT_SECRET
├── .gitignore
└── package.json
```

### 3.2 Dépendances backend

| Package | Rôle |
|---------|------|
| `express` | Serveur HTTP |
| `@prisma/client` | ORM pour PostgreSQL |
| `bcryptjs` | Hachage des mots de passe |
| `jsonwebtoken` | Authentification JWT |
| `cors` | Autoriser les requêtes du frontend |
| `dotenv` | Variables d'environnement |

### 3.3 Connexion à Neon (PostgreSQL cloud)

1. Renseigner l'URL dans `BackEnd/.env` :
   ```
   DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
   JWT_SECRET="votre_secret"
   PORT=5000
   ```
2. Pousser le schéma vers la base :
   ```bash
   npm run db:push
   ```
3. Générer le client Prisma :
   ```bash
   npm run db:generate
   ```

---

## 4. Schéma de base de données (Prisma)

### 4.1 Modèles

```
User
├── id        (cuid, PK)
├── nom       (String)
├── email     (String, unique)
├── password  (String, haché bcrypt)
├── role      (CLIENT | ENTREPRISE | ADMIN)
└── createdAt / updatedAt

Entreprise
├── id        (cuid, PK)
├── nom       (String)
├── userId    (FK → User, unique)
└── services  → [Service]

Service
├── id           (cuid, PK)
├── nom          (String)
├── prefixe      (String : A, B, C, D...)
├── icone        (String emoji)
├── description  (String)
├── entrepriseId (FK → Entreprise)
└── tickets      → [Ticket]

Ticket
├── id        (cuid, PK)
├── numero    (String : ex. A-1, B-3)
├── statut    (ATTENTE | APPELE | TRAITE | ABSENT)
├── guichet   (String?, optionnel)
├── devant    (Int : nb de personnes devant)
├── attente   (Int : minutes estimées)
├── serviceId (FK → Service)
├── userId    (FK → User)
└── actions   → [Action]

Action
├── id        (cuid, PK)
├── type      (EMIS | APPELE | TRAITE | ABSENT)
├── guichet   (String?, optionnel)
├── ticketId  (FK → Ticket)
└── createdAt
```

### 4.2 Énumérations

```
Role         : CLIENT | ENTREPRISE | ADMIN
StatutTicket : ATTENTE | APPELE | TRAITE | ABSENT
TypeAction   : EMIS | APPELE | TRAITE | ABSENT
```

---

## 5. API REST — Endpoints

### Authentification (`/api/auth`)

| Méthode | Route | Description | Auth requise |
|---------|-------|-------------|--------------|
| POST | `/api/auth/inscription` | Créer un compte (client ou entreprise) | Non |
| POST | `/api/auth/connexion` | Se connecter → retourne un JWT | Non |
| GET  | `/api/auth/me` | Récupérer le profil connecté | JWT |

**Exemple inscription** :
```json
POST /api/auth/inscription
{
  "nom": "Jean Dupont",
  "email": "jean@example.com",
  "password": "motdepasse123",
  "role": "client"
}
→ { "token": "eyJ...", "user": { "id": "...", "nom": "Jean Dupont", "role": "CLIENT" } }
```

### Tickets (`/api/tickets`)

| Méthode | Route | Description | Auth requise |
|---------|-------|-------------|--------------|
| POST   | `/api/tickets` | Prendre un ticket | JWT (CLIENT) |
| GET    | `/api/tickets/mes-tickets` | Voir ses propres tickets | JWT |
| GET    | `/api/tickets/file/:serviceId` | File d'attente en direct | Non |
| PATCH  | `/api/tickets/:id/appeler` | Appeler un ticket au guichet | JWT (ENTREPRISE/ADMIN) |
| PATCH  | `/api/tickets/:id/terminer` | Marquer traité ou absent | JWT (ENTREPRISE/ADMIN) |

### Services (`/api/services`)

| Méthode | Route | Description | Auth requise |
|---------|-------|-------------|--------------|
| GET    | `/api/services` | Tous les services (public) | Non |
| GET    | `/api/services/:entrepriseId` | Services d'une entreprise | Non |
| POST   | `/api/services` | Créer un service | JWT (ENTREPRISE) |
| DELETE | `/api/services/:id` | Supprimer un service | JWT (ENTREPRISE/ADMIN) |

### Entreprise (`/api/entreprises`)

| Méthode | Route | Description | Auth requise |
|---------|-------|-------------|--------------|
| GET | `/api/entreprises/moi` | Dashboard de l'entreprise connectée | JWT (ENTREPRISE) |
| GET | `/api/entreprises/stats` | Statistiques (total, traités, absents...) | JWT (ENTREPRISE/ADMIN) |
| GET | `/api/entreprises/tickets` | Tous les tickets de l'entreprise | JWT (ENTREPRISE/ADMIN) |

---

## 6. Modifications apportées au Frontend

### 6.1 Nouveaux fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/api.js` | Utilitaire centralisé pour tous les appels HTTP (fetch + JWT automatique) |
| `src/context/AuthContext.jsx` | Contexte React global : utilisateur connecté, login, logout |

### 6.2 `src/App.js`

**Modification** : Ajout de `<AuthProvider>` autour de toute l'application pour rendre l'état d'authentification accessible partout.

```jsx
// Avant
<QueueProvider>...</QueueProvider>

// Après
<AuthProvider>
  <QueueProvider>...</QueueProvider>
</AuthProvider>
```

### 6.3 `src/PAGES/Inscription.js`

**Modifications** :
- Ajout de l'import `useNavigate`, `api`, `useAuth`
- Ajout du champ **mot de passe** dans le formulaire (champ manquant)
- `handleSubmit` passe de `console.log` à un vrai appel `POST /api/auth/inscription`
- Affichage des erreurs API sous le formulaire
- Redirection automatique après inscription :
  - Rôle `client` → `/Client`
  - Rôle `entreprise` → `/Entreprise`

### 6.4 `src/PAGES/Connexion.js`

**Modifications** :
- Ajout de l'import `useNavigate`, `api`, `useAuth`
- `handleSubmit` passe de `console.log` à un vrai appel `POST /api/auth/connexion`
- Sauvegarde du JWT et des infos utilisateur dans `localStorage`
- Affichage des erreurs API (mauvais identifiants, etc.)
- Redirection automatique après connexion :
  - `ADMIN` → `/Administrateur`
  - `ENTREPRISE` → `/Entreprise`
  - `CLIENT` → `/Client`

### 6.5 `src/context/QueueContext.jsx`

**Modifications** :
- `addTicket` : mise à jour locale immédiate + sync asynchrone avec `POST /api/tickets` si l'utilisateur est connecté. Stocke le `dbId` (ID Neon) dans le ticket local pour les opérations suivantes.
- `callTicket` : sync avec `PATCH /api/tickets/:dbId/appeler`
- `markTraite` : sync avec `PATCH /api/tickets/:dbId/terminer` `{ statut: "TRAITE" }`
- `markAbsent` : sync avec `PATCH /api/tickets/:dbId/terminer` `{ statut: "ABSENT" }`
- **Stratégie** : Le local state reste la source de vérité pour l'affichage (temps réel), le backend est synchronisé en arrière-plan. Si l'API échoue, l'interface continue de fonctionner.

### 6.6 `src/PAGES/PClient/DashbordClient.jsx`

**Modifications** :
- Les services ne sont plus 100% hardcodés. Au montage, `GET /api/services` est appelé pour charger les vrais services depuis la base de données.
- Si l'API retourne des services, ils remplacent les services par défaut avec leurs vrais IDs (`serviceId`).
- Si l'API échoue ou renvoie une liste vide, le fallback sur les services hardcodés est maintenu (l'app reste fonctionnelle).
- `handleGetTicket` passe désormais le `serviceId` réel au ticket créé.

### 6.7 `src/PAGES/PEntreprise/Entreprise.jsx`

**Modifications majeures** :
- Suppression de toutes les données fictives (`INITIAL_QUEUE`, `INITIAL_CURRENT`, etc.)
- Au montage : chargement depuis `GET /api/entreprises/stats` et `GET /api/entreprises/tickets`
- **Refresh automatique** toutes les 10 secondes pour afficher la file en temps réel
- Nom et initiales de l'agent récupérés depuis l'utilisateur connecté (`useAuth`)
- `handleNext` → `PATCH /api/tickets/:id/appeler`
- `handleTraite` → `PATCH /api/tickets/:id/terminer { statut: "TRAITE" }`
- `handleAbsent` → `PATCH /api/tickets/:id/terminer { statut: "ABSENT" }`
- En cas d'échec API, les actions restent fonctionnelles localement (avec avertissement console)

---

## 7. Flux utilisateur complet

### Client
```
1. /inscription  → POST /api/auth/inscription → JWT sauvegardé
2. /connexion    → POST /api/auth/connexion   → redirigé vers /Client
3. /Client       → Choix interface ou services
4. /DashbordClient → Charge services depuis API
5. Clic "Obtenir ticket" → POST /api/tickets → ticket en base Neon
```

### Entreprise
```
1. /inscription  → Compte créé avec rôle ENTREPRISE
2. /connexion    → Redirigé vers /Entreprise
3. /Entreprise   → Charge file depuis API (refresh 10s)
4. "Appeler suivant" → PATCH /api/tickets/:id/appeler
5. "Traité / Absent" → PATCH /api/tickets/:id/terminer
```

---

## 8. Commandes de démarrage

```bash
# Backend
cd BackEnd
npm run dev          # Démarre sur http://localhost:5000

# Frontend
cd FrontEnd
npm start            # Démarre sur http://localhost:3000

# Prisma (base de données)
npm run db:push      # Synchroniser le schéma avec Neon
npm run db:studio    # Interface visuelle Prisma Studio
npm run db:generate  # Régénérer le client Prisma
```

---

## 9. Variables d'environnement requises

**`BackEnd/.env`**
```
DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
JWT_SECRET="votre_secret_fort"
PORT=5000
```

**`FrontEnd/.env`**
```
DISABLE_ESLINT_PLUGIN=true
```

---

## 10. Points d'amélioration futurs

- Ajouter un système de **refresh token** (JWT expire après 7 jours)
- **WebSocket** (Socket.io) pour un push temps réel de la file d'attente côté client
- Page de création de services pour les entreprises depuis l'interface
- Pagination sur l'historique des tickets dans l'admin

---

## 11. Sécurité et contrôle d'accès par rôle

### 11.1 Contexte

Après la mise en place de l'authentification, une deuxième phase a consisté à protéger les routes et l'interface selon le rôle de l'utilisateur connecté.

### 11.2 Nouveau fichier : `src/components/PrivateRoute.jsx`

Composant React qui enveloppe chaque route protégée. Il effectue deux vérifications :

1. **Utilisateur connecté ?** → sinon redirige vers `/connexion`
2. **Rôle autorisé ?** → sinon redirige vers la page d'accueil de son propre espace

```jsx
// Exemple d'utilisation dans App.js
<Route path="/Entreprise" element={
  <PrivateRoute roles={['ENTREPRISE', 'ADMIN']}>
    <Entreprise />
  </PrivateRoute>
} />
```

**Tableau des redirections en cas d'accès non autorisé :**

| Rôle | Redirigé vers |
|------|--------------|
| CLIENT essayant d'accéder à `/Entreprise` | `/Client` |
| CLIENT essayant d'accéder à `/Administrateur` | `/Client` |
| ENTREPRISE essayant d'accéder à `/Administrateur` | `/Entreprise` |
| Non connecté sur n'importe quelle route protégée | `/connexion` |

### 11.3 Matrice des droits d'accès

| Route | Non connecté | CLIENT | ENTREPRISE | ADMIN |
|-------|:---:|:---:|:---:|:---:|
| `/`, `/inscription`, `/connexion` | ✅ | ✅ | ✅ | ✅ |
| `/Client`, `/DashbordClient`, `/Service2` | ❌ | ✅ | ❌ | ✅ |
| `/service/coiffure`, `/tresseuses`, `/pressings` | ❌ | ✅ | ❌ | ✅ |
| `/Entreprise` | ❌ | ❌ | ✅ | ✅ |
| `/Administrateur` | ❌ | ❌ | ❌ | ✅ |

### 11.4 Modifications `src/App.js`

Toutes les routes ont été enveloppées dans `<PrivateRoute roles={[...]}>` avec les rôles autorisés correspondants. Les routes `/`, `/inscription` et `/connexion` restent publiques.

---

## 12. Expérience utilisateur — Navbar et Accueil adaptatifs

### 12.1 Navbar (`src/PAGES/Navbar/Navbar.jsx`)

**Avant** : les boutons Connexion et Inscription étaient toujours affichés.

**Après** : la navbar s'adapte dynamiquement à l'état de connexion.

| État | Contenu affiché à droite |
|------|--------------------------|
| Non connecté | Boutons **Connexion** + **Inscription** |
| Connecté | Nom de l'utilisateur + badge du rôle + bouton **Déconnexion** |

Le bouton Déconnexion efface le JWT et les données utilisateur du `localStorage`, puis redirige vers `/`.

**Styles ajoutés dans `Navbar.scss`** :
- `.nav-user` : conteneur glassmorphism pour le profil
- `.nav-user__name` : nom en blanc gras
- `.nav-user__role` : badge coloré avec le rôle (Client / Entreprise / Admin)

### 12.2 Accueil (`src/PAGES/acceuil.js`)

Les trois cartes (Espace Client, Espace Entreprise, Administration) sont maintenant filtrées selon le rôle :

| Rôle | Espace Client | Espace Entreprise | Administration |
|------|:---:|:---:|:---:|
| Non connecté | ✅ | ✅ | ✅ |
| CLIENT | ✅ | ❌ | ❌ |
| ENTREPRISE | ❌ | ✅ | ❌ |
| ADMIN | ✅ | ✅ | ✅ |

**Implémentation** : trois variables booléennes calculées depuis `user.role` contrôlent le rendu conditionnel de chaque carte.

### 12.3 Redirection post-authentification

**Avant** : après inscription/connexion, l'utilisateur était redirigé directement vers son espace (`/Client`, `/Entreprise` ou `/Administrateur`) selon son rôle.

**Après** : dans les deux cas, l'utilisateur est redirigé vers l'**accueil** (`/`). Il voit alors uniquement les cartes correspondant à son rôle et choisit lui-même où aller.

---

## 13. Compte Administrateur

### 13.1 Problème

L'inscription ne propose que les rôles `client` et `entreprise`. Il n'y a pas d'interface pour créer un compte `ADMIN` (voulu pour la sécurité).

### 13.2 Solution — Script de seed

Fichier créé : `BackEnd/prisma/seed.js`

Ce script crée un compte admin par défaut s'il n'existe pas encore en base.

```bash
cd BackEnd
node prisma/seed.js
```

**Identifiants créés :**

| Champ | Valeur |
|-------|--------|
| Email | `admin@jeloft.com` |
| Mot de passe | `admin1234` |
| Rôle | `ADMIN` |

Le script est **idempotent** : si le compte existe déjà, il affiche un message et ne crée rien. Il peut être relancé sans risque à tout moment.

### 13.3 Alternative — Prisma Studio

```bash
npm run db:studio   # Ouvre http://localhost:5555
```
Permet de modifier manuellement le champ `role` d'un utilisateur existant de `CLIENT` à `ADMIN` via l'interface visuelle.

---

## 14. Flux utilisateur mis à jour

### Client
```
1. /inscription → choisit "Client" → POST /api/auth/inscription
2. Redirigé vers / (accueil) → voit uniquement "Espace Client"
3. Clique "Accéder" → /Client → /DashbordClient
4. Prend un ticket → POST /api/tickets → enregistré en base Neon
```

### Entreprise
```
1. /inscription → choisit "Entreprise" → POST /api/auth/inscription
2. Redirigé vers / (accueil) → voit uniquement "Espace Entreprise"
3. Clique "Gérer" → /Entreprise → charge la file depuis l'API (refresh 10s)
4. Appelle/traite/marque absent → PATCH /api/tickets/:id/...
```

### Admin
```
1. Connexion avec admin@jeloft.com / admin1234
2. Redirigé vers / (accueil) → voit les 3 cartes
3. Accès libre à tous les espaces
```

### Accès non autorisé
```
Un CLIENT tape /Entreprise dans l'URL
→ PrivateRoute détecte role=CLIENT, roles requis=[ENTREPRISE, ADMIN]
→ Redirigé automatiquement vers /Client
```
