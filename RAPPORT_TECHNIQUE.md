# Rapport Technique — Projet Jeloft (Système de File d'Attente)

**Mise à jour** : 8 juillet 2026
**Stack** : React 18 · Node.js/Express · Prisma · Neon (PostgreSQL) · Socket.io · Framer Motion · Vanta.js

---

## 1. Vue d'ensemble

Jeloft est une application de gestion de file d'attente pour commerces de proximité (coiffure, tresses, pressing, lavage auto, agences immobilières). Un client prend un ticket numéroté pour un service précis ; l'entreprise gère sa file en temps réel (appel, traitement, absence).

```
jojo/
├── FrontEnd/   ← SPA React (Vercel, port 3000 en dev)
├── BackEnd/    ← API REST + WebSocket (Render, port 5000 en dev)
└── RAPPORT_TECHNIQUE.md
```

**Base de données et temps réel sont la seule source de vérité** : chaque écran (client, entreprise, admin) lit l'état via l'API REST puis se synchronise en direct via Socket.io. Il n'existe plus de state local (`localStorage`/Context) faisant office de source de vérité.

### Schéma de communication

```
Navigateur (React)
   │  HTTP/REST (fetch + JWT)         │  WebSocket (socket.io-client)
   ▼                                  ▼
API Express  ──── Prisma ORM ──── Neon PostgreSQL (cloud)
      │
      └── Socket.io : relaie les événements ticket:* à tous les clients connectés
```

Détail du déploiement (Vercel/Render/Neon, variables d'environnement, CORS) : voir `DEPLOIEMENT.md`.

---

## 2. Modèle de données (Prisma)

```
User
├── id, nom, email (unique), password (bcrypt), avatar?
├── role : CLIENT | ENTREPRISE | ADMIN
└── entreprise? (1-1) · tickets (1-N)

Entreprise
├── id, nom, description?, type? (coiffure | tresseuses | pressings | lavage-auto | residence)
├── lat/lng (position sur carte), avatar?
├── userId (FK User, unique, onDelete: Cascade)
└── services (1-N)

Service
├── id, nom, prefixe (A/B/C…), icone (emoji), description, compteur (Int)
├── entrepriseId (FK Entreprise, onDelete: Cascade)
├── tickets (1-N)
└── @@unique([entrepriseId, prefixe])

Ticket
├── id, numero (ex. "A-7"), statut, guichet?, devant (Int), attente (Int, minutes)
├── serviceId (FK Service — pas de cascade, un service avec tickets est protégé)
├── userId (FK User)
└── actions (1-N, historique)

Action
├── id, type, guichet?, ticketId (FK Ticket, onDelete: Cascade), createdAt
```

**Énumérations**
```
Role         : CLIENT | ENTREPRISE | ADMIN
StatutTicket : EN_ATTENTE_VALIDATION | ATTENTE | APPELE | TRAITE | ABSENT
TypeAction   : EMIS | VALIDE | REFUSE | ACTION_APPELE | ACTION_TRAITE | ACTION_ABSENT
```

`compteur` sur `Service` est incrémenté atomiquement à chaque ticket pris (`prisma.service.update({ data: { compteur: { increment: 1 } } })`) : le numéro (`{prefixe}-{compteur}`) est unique et monotone, jamais réutilisé même si un ticket est supprimé.

---

## 3. Catalogue de services

Le catalogue (nom, préfixe, emoji, description par type d'entreprise) est défini **une seule fois** : `BackEnd/src/data/servicesCatalog.js` (`SERVICES_BY_TYPE`).

- À l'inscription d'une entreprise (`auth.controller.js`), ses services sont créés en base à partir de ce catalogue (`services: { create: SERVICES_BY_TYPE[type] }`).
- Le dashboard entreprise (`Entreprise.jsx`) ne détient plus sa propre copie : il récupère le catalogue via `GET /api/services/catalogue/:type` (route publique) et l'utilise pour compléter automatiquement les services manquants d'un compte existant (ex. après un ajout de service au catalogue).
- Les prix affichés côté client (`ServicePage.jsx`, objet `PRICES`) restent une donnée front séparée — le modèle `Service` n'a pas de champ prix en base. Un prix peut être fixe (`5000`) ou une fourchette (`[3000, 5000]`), affiché via `fmtPrix()`.

Modifier un service existant en base après un changement de catalogue nécessite un script ponctuel (voir `BackEnd/sync-service-icons.js` et `BackEnd/migrate-tresseuses-services.js` comme exemples) : le catalogue ne réécrit jamais les lignes déjà créées.

---

## 4. Authentification & rôles

JWT (7 jours), payload `{ id, role }`, signé avec `JWT_SECRET`.

| Route | Méthode | Auth | Description |
|---|---|---|---|
| `/api/auth/inscription` | POST | Non | Crée un compte (`CLIENT` ou `ENTREPRISE` + `type`) |
| `/api/auth/connexion` | POST | Non | Retourne `{ token, user }` |
| `/api/auth/me` | GET | JWT | Profil connecté |
| `/api/auth/avatar` | PATCH | JWT | Met à jour l'avatar (base64) |
| `/api/auth/compte` | DELETE | JWT | Suppression définitive du compte + données liées |

Le rôle `ADMIN` ne peut pas être créé depuis le formulaire d'inscription — voir `prisma/seed.js` (compte admin par défaut, à changer après la première connexion).

⚠️ **Point de vigilance non corrigé** : `auth.controller.js` fait `role: role.toUpperCase()` sans whitelist stricte sur les valeurs acceptées avant insertion. Un appel direct à l'API avec `"role":"admin"` peut créer un compte `ADMIN`. Priorité P0 pour une prochaine session.

### Protection des routes front — `PrivateRoute.jsx`

```jsx
<Route path="/Entreprise" element={
  <PrivateRoute roles={['ENTREPRISE', 'ADMIN']}><Entreprise /></PrivateRoute>
} />
```

| Route | Non connecté | CLIENT | ENTREPRISE | ADMIN |
|---|:---:|:---:|:---:|:---:|
| `/`, `/inscription`, `/connexion` | ✅ | ✅ | ✅ | ✅ |
| `/Client`, `/DashbordClient`, `/service/*` | ❌ | ✅ | ❌ | ✅ |
| `/Entreprise`, `/EntrepriseAccueil`, `/EntrepriseServices` | ❌ | ❌ | ✅ | ✅ |
| `/Administrateur` | ❌ | ❌ | ❌ | ✅ |

Un rôle non autorisé est redirigé vers son propre espace (pas une erreur 403 générique) ; un utilisateur non connecté est redirigé vers `/connexion`.

---

## 5. Flux ticket

```
Client : POST /api/tickets { serviceId }
  → statut initial EN_ATTENTE_VALIDATION, numero = "{prefixe}-{compteur}"
  → socket.emit("ticket:nouveau", ticket)   (émis côté client après succès API)

Entreprise : PATCH /api/tickets/:id/valider  → statut ATTENTE
             PATCH /api/tickets/:id/refuser  → statut ABSENT
             PATCH /api/tickets/:id/appeler  { guichet } → statut APPELE
             PATCH /api/tickets/:id/terminer { statut: TRAITE | ABSENT }
```

Chaque transition écrit une `Action` (historique). `GET /api/tickets/file/:serviceId` (public, sans auth) renvoie la file active (`ATTENTE`/`APPELE`) d'un service — c'est ce que consomme la page client pour afficher la position en direct.

---

## 6. Temps réel — Socket.io

`BackEnd/src/socket.js` : une seule salle globale (`jeloft:queue`). Un client qui se connecte rejoint la salle (`join:queue`) ; le token JWT est optionnel côté socket (accès anonyme autorisé pour la file publique).

**Le serveur ne déclenche aucun événement lui-même** : il **relaie** les événements émis par un client vers tous les autres membres de la salle (`socket.to('jeloft:queue').emit(event, data)`), après que l'appel REST correspondant a réussi côté émetteur.

```
ticket:nouveau · ticket:valide · ticket:refuse
ticket:appele  · ticket:traite · ticket:absent
```

Les pages `ServicePage.jsx` (client) et `Entreprise.jsx` s'abonnent à ces événements pour rafraîchir file/stats sans recharger la page, avec un polling de secours (10s) en complément.

---

## 7. Structure du backend

```
BackEnd/
├── prisma/
│   ├── schema.prisma
│   ├── seed.js          ← compte ADMIN par défaut (idempotent)
│   └── seed.mjs         ← données de démo (3 entreprises + services)
├── src/
│   ├── index.js         ← point d'entrée HTTP + init Socket.io
│   ├── socket.js         ← relais d'événements temps réel
│   ├── app.js            ← Express + CORS
│   ├── data/
│   │   └── servicesCatalog.js  ← catalogue de services, source unique
│   ├── middlewares/auth.middleware.js
│   ├── controllers/ (auth, tickets, services, entreprises)
│   └── routes/      (auth, tickets, services, entreprises)
├── reset-password.js               ← utilitaire admin (réinitialise un mot de passe)
├── sync-service-icons.js           ← resynchronise icone/nom des services existants
└── migrate-tresseuses-services.js  ← exemple de migration de catalogue en place
```

### Endpoints principaux

| Ressource | Route | Méthode | Auth |
|---|---|---|---|
| Services | `/api/services` | GET | Non |
| | `/api/services/catalogue/:type` | GET | Non |
| | `/api/services/:entrepriseId` | GET | Non |
| | `/api/services` | POST | JWT (ENTREPRISE) |
| | `/api/services/:id` | DELETE | JWT (ENTREPRISE/ADMIN) |
| Entreprises | `/api/entreprises?type=` | GET | Non |
| | `/api/entreprises/moi` | GET | JWT (ENTREPRISE) |
| | `/api/entreprises/stats` | GET | JWT (ENTREPRISE/ADMIN) |
| | `/api/entreprises/tickets` | GET | JWT (ENTREPRISE/ADMIN) |
| | `/api/entreprises/avatar`, `/profil` | PATCH | JWT (ENTREPRISE) |
| Tickets | `/api/tickets` | POST | JWT |
| | `/api/tickets/mes-tickets` | GET | JWT |
| | `/api/tickets/file/:serviceId` | GET | Non |
| | `/api/tickets/:id/valider`\|`/refuser`\|`/appeler`\|`/terminer` | PATCH | JWT (ENTREPRISE/ADMIN) |
| | `/api/tickets/all` | GET | JWT (ADMIN) |

---

## 8. Structure du frontend (extrait)

```
FrontEnd/src/
├── App.js                       ← routes + PrivateRoute
├── api.js                       ← wrapper fetch (JWT auto)
├── context/AuthContext.jsx      ← session utilisateur
├── context/SocketContext.jsx    ← connexion socket.io globale
├── components/PrivateRoute.jsx
├── PAGES/
│   ├── Inscription.js, Connexion.js
│   ├── PClient/                 ← espace client (dashboard, prise de ticket)
│   ├── PEntreprise/             ← espace entreprise (file, stats, profil)
│   ├── PAdministrator/          ← vue admin globale
│   ├── Services/ServicePage.jsx ← page générique service (Coiffeur/Tresseuses/…)
│   └── Navbar/
```

---

## 9. Points de vigilance connus (dette technique)

- **Sécurité P0** : whitelist manquante sur `role` à l'inscription (§4).
- **QR code de suivi de ticket** (`ServicePage.jsx`) non fonctionnel en pratique : l'URL encodée n'inclut ni l'entreprise ni le service, et le scan ne restaure pas le panneau de suivi (state React perdu au rechargement). À reprendre.
- **Prix des services** hardcodés côté front (`PRICES` dans `ServicePage.jsx`), sans champ dédié en base — toute évolution de prix se fait dans le code, pas depuis un dashboard.
- Absence de rate limiting et de politique de mot de passe (longueur minimale, complexité) à l'inscription/connexion.
- Événements Socket.io non revérifiés côté serveur (le relais fait confiance au payload émis par le client).

---

## 10. Démarrage local

```bash
# Backend
cd BackEnd
npm install
npm run db:push       # synchronise le schéma Prisma → Neon
npm run dev            # http://localhost:5000

# Frontend
cd FrontEnd
npm install
npm start               # http://localhost:3000
```

Variables d'environnement : voir `DEPLOIEMENT.md` (Backend : `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL` ; Frontend : `REACT_APP_API_URL`, `REACT_APP_SOCKET_URL`).
