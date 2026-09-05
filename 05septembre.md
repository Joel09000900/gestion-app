# Jeloft — récapitulatif complet de l'application

**Date : 5 septembre 2026.** Document de référence destiné à alimenter le mémoire.

Il décrit l'application **telle qu'elle est**, pas telle qu'elle est visée. Chaque
affirmation ci-dessous a été vérifiée dans le code le 5 septembre 2026. Les
fonctionnalités absentes sont signalées comme telles — c'est précisément l'écart
entre l'écrit et le code que l'audit du 1ᵉʳ septembre reprochait au mémoire.

---

## 1. Identité du projet

| | |
|---|---|
| **Nom** | Jeloft |
| **Objet** | Application web de gestion des files d'attente pour prestataires de services de proximité |
| **Terrain** | Côte d'Ivoire — secteur informel et semi-formel (salons, pressings, lavage auto) |
| **Dépôt** | `github.com/Joel09000900/gestion-app` |
| **Front déployé** | `https://gestion-app-pi.vercel.app` (Vercel) |
| **Back déployé** | `https://gestion-app-g2qu.onrender.com` (Render) |
| **Base** | PostgreSQL hébergée sur NeonDB |
| **Historique** | 33 commits, messages conventionnés (Feat, Fix, Refactor, Chore) |
| **Volume** | Back-end 891 lignes JS · Front-end 4 323 lignes JS/JSX, hors feuilles de style |

**Problème traité.** Chez un prestataire de proximité, la file d'attente est
physique : le client doit être présent pour tenir sa place. Il perd du temps, ne
sait pas combien de personnes le précèdent, et le prestataire n'a aucune trace de
son activité. Jeloft dématérialise le ticket, rend la position visible et
journalise chaque étape.

---

## 2. Architecture générale

Architecture **trois tiers** classique, avec un canal temps réel en parallèle du
canal HTTP.

```
┌──────────────────────┐        HTTP / JSON (JWT)        ┌──────────────────────┐
│   Navigateur         │ ──────────────────────────────► │   API Express        │
│   React 18 (CRA)     │                                 │   4 contrôleurs      │
│                      │ ◄────────────────────────────── │   4 fichiers routes  │
│   - Client           │        Socket.IO (descendant)   │   1 middleware       │
│   - Entreprise       │ ◄────────────────────────────── │   1 module socket    │
│   - Administrateur   │                                 └──────────┬───────────┘
└──────────────────────┘                                            │ Prisma 5
                                                                    ▼
                                                         ┌──────────────────────┐
                                                         │  PostgreSQL (Neon)   │
                                                         │  5 tables, 3 énums   │
                                                         └──────────────────────┘
```

Le serveur HTTP et le serveur Socket.IO **partagent le même serveur Node**
(`createServer(app)` dans `src/index.js`, puis `initSocket(httpServer)`) : un
seul port, une seule origine CORS à déclarer.

### Arborescence du back-end

```
BackEnd/src/
├── index.js                       point d'entrée, serveur HTTP + Socket.IO
├── app.js                         application Express, CORS, montage des routes
├── socket.js                      initialisation Socket.IO + fonction diffuser()
├── middlewares/
│   └── auth.middleware.js         requireAuth (JWT) et requireRole (rôles)
├── routes/
│   ├── auth.routes.js
│   ├── tickets.routes.js
│   ├── services.routes.js
│   └── entreprises.routes.js
├── controllers/
│   ├── auth.controller.js         inscription, connexion, profil, suppression
│   ├── tickets.controller.js      cycle de vie complet du ticket
│   ├── services.controller.js     catalogue et services d'une entreprise
│   └── entreprises.controller.js  profil, tickets, statistiques
└── data/
    └── servicesCatalog.js         catalogue par type d'activité
```

### Arborescence du front-end

```
FrontEnd/src/
├── index.js · App.js              point d'entrée et routage
├── api.js                         couche d'appel HTTP (fetch + JWT + gestion 401)
├── context/
│   ├── AuthContext.jsx            session utilisateur (localStorage)
│   └── SocketContext.jsx          connexion Socket.IO partagée
├── components/
│   ├── PrivateRoute.jsx           garde de route par rôle
│   └── ReservationModal.jsx
└── PAGES/
    ├── acceuil.js                 page d'accueil publique
    ├── Connexion.js · Inscription.js
    ├── Navbar/
    ├── PClient/                   Client, Client2, Service2, DashbordClient
    ├── PEntreprise/               EntrepriseAccueil, Entreprise
    ├── PAdministrator/            PAdmin
    └── Services/                  ServicePage + 6 enveloppes par catégorie
```

---

## 3. Pile technologique — versions réelles

| Couche | Technologie | Version |
|---|---|---|
| Interface | React | 18.2 |
| | react-router-dom | 6.22 |
| | Create React App (react-scripts) | 5.0.1 |
| | Sass | 1.100 |
| Animation / 3D | framer-motion | 12.40 |
| | three + vanta | 0.184 / 0.5.24 |
| Visualisation | recharts | 3.9.2 |
| Cartographie | leaflet + react-leaflet | 1.9.4 / 4.2.1 |
| Divers UI | react-icons, qrcode.react, bootstrap | 5.6 / 4.2 / 5.3 |
| Serveur | Node.js + Express | Express 4.21 |
| Temps réel | Socket.IO (serveur et client) | 4.8.3 |
| ORM | Prisma | 5.22 |
| Base | PostgreSQL (NeonDB) | — |
| Authentification | jsonwebtoken | 9.0.2 |
| Hachage | bcryptjs | 2.4.3 |

---

## 4. Modèle de données

Cinq entités, trois énumérations. Le schéma est dans `BackEnd/prisma/schema.prisma`.

### Énumérations

| Énumération | Valeurs |
|---|---|
| `Role` | `CLIENT`, `ENTREPRISE`, `ADMIN` |
| `StatutTicket` | `EN_ATTENTE_VALIDATION`, `ATTENTE`, `APPELE`, `TRAITE`, `ABSENT` |
| `TypeAction` | `EMIS`, `VALIDE`, `REFUSE`, `ACTION_APPELE`, `ACTION_TRAITE`, `ACTION_ABSENT` |

### Entités

**`User`** — `id` (cuid), `nom`, `email` (unique), `password` (haché), `role`
(défaut `CLIENT`), `avatar`, `createdAt`, `updatedAt`.
Relations : `entreprise` (0..1), `tickets` (0..*).

**`Entreprise`** — `id`, `nom`, `description`, `type`, `lat`, `lng`, `avatar`,
`userId` **`@unique`**, horodatages.
Relations : `user` (1, `onDelete: Cascade`), `services` (0..*).

> La contrainte `userId @unique` est la clé du contrôle de propriété : c'est par
> ce lien que le serveur détermine si un ticket relève de l'entreprise connectée.
> Elle impose une cardinalité **User 1 → 0..1 Entreprise**.

**`Service`** — `id`, `nom`, `prefixe`, `icone` (défaut `🏦`), `description`,
`compteur` (défaut 0), `entrepriseId`.
Relations : `entreprise` (1, cascade), `tickets` (0..*).
Contrainte : **`@@unique([entrepriseId, prefixe])`** — un préfixe est unique au
sein d'une entreprise.

**`Ticket`** — `id`, `numero`, `statut` (défaut `ATTENTE`), `guichet`, `devant`,
`attente`, `serviceId`, `userId`, horodatages.
Relations : `service` (1), `user` (1), `actions` (0..*).

**`Action`** — `id`, `type`, `guichet`, `ticketId`, `createdAt`.
Relation : `ticket` (1, `onDelete: Cascade`).

C'est la table du **journal d'audit** : chaque changement d'état y écrit une ligne.

### Points d'attention sur le schéma

- `Ticket.statut` a pour valeur par défaut `ATTENTE`, alors que le cycle commence
  à `EN_ATTENTE_VALIDATION`. Sans effet aujourd'hui (le contrôleur force la valeur
  à la création), mais toute création qui omettrait le champ contournerait
  silencieusement l'étape de validation.
- `Ticket.serviceId` et `Ticket.userId` n'ont **pas** de `onDelete: Cascade` :
  la suppression d'un compte impose donc de supprimer les tickets d'abord, ce que
  fait `supprimerCompte` dans une transaction.

---

## 5. Règles de gestion

| Réf. | Règle | État au 5 sept. 2026 |
|---|---|---|
| **RG-01** | Chaque ticket porte un numéro unique par service | **Implémentée** |
| **RG-02** | La numérotation est atomique et monotone | **Implémentée** |
| **RG-03** | Le ticket suit un cycle d'états strict ; toute transition non prévue est rejetée | **Implémentée le 5 septembre** |
| **RG-04** | Un client n'agit que sur ses propres tickets | **Implémentée** |
| **RG-05** | Une entreprise n'agit que sur les tickets de ses services | **Implémentée** |
| **RG-06** | Chaque transition est journalisée dans `Action` | **Implémentée** |
| **RG-07** | La file publique d'un service est consultable sans authentification ; aucune action ne l'est | **Implémentée** |

### RG-01 / RG-02 — numérotation atomique

```js
const updatedService = await prisma.service.update({
  where: { id: serviceId },
  data: { compteur: { increment: 1 } },
});
const numero = `${service.prefixe}-${updatedService.compteur}`;
```

Prisma traduit `{ increment: 1 }` par un `UPDATE … SET compteur = compteur + 1
RETURNING` exécuté par PostgreSQL en une seule instruction. Le serveur ne lit
jamais le compteur pour le réécrire : deux prises simultanées ne peuvent pas
obtenir le même numéro. La contrainte `@@unique([entrepriseId, prefixe])`
complète le dispositif côté schéma.

C'est le point le plus solide du dossier, et il se démontre en séance.

### RG-03 — cycle de vie du ticket

```
EN_ATTENTE_VALIDATION ──valider──► ATTENTE ──appeler──► APPELE ──terminer──► TRAITE
         │                                                         └────────► ABSENT
         └──refuser──────────────────────────────────────────────────────────► ABSENT
```

Depuis le 5 septembre, la règle est appliquée par le serveur. La table des
transitions est déclarée en tête de `tickets.controller.js` :

```js
const TRANSITIONS = {
  valider:  { depuis: ['EN_ATTENTE_VALIDATION'], vers: 'ATTENTE' },
  refuser:  { depuis: ['EN_ATTENTE_VALIDATION'], vers: 'ABSENT' },
  appeler:  { depuis: ['ATTENTE'],               vers: 'APPELE' },
  terminer: { depuis: ['APPELE'] },   // état d'arrivée fourni par la requête
};
```

Un contrôle unique, `verifierTransition()`, est appelé en tête des quatre
handlers. Il charge le ticket, vérifie le droit d'agir, puis la légalité de la
transition, et répond lui-même en 404 ou 400 le cas échéant :

```
PATCH /api/tickets/:id/valider   sur un ticket TRAITE  → 400
PATCH /api/tickets/:id/appeler   sur un ticket clôturé → 400
```

Message renvoyé : `Transition impossible : un ticket TRAITE ne peut pas passer à ATTENTE.`

> **Note pour le mémoire.** Avant cette date, aucune des quatre fonctions ne
> lisait l'état courant avant de le modifier : un ticket déjà traité pouvait
> repasser en attente. C'était l'écart critique C4 de l'audit.

### RG-04 / RG-05 — contrôle de propriété

Le contrôle horizontal est appliqué à **trois endroits distincts**, par trois
mécanismes différents :

1. **Tickets** — `verifierTransition()` construit une clause qui remonte du
   ticket jusqu'au compte propriétaire de l'entreprise :
   ```js
   { id: ticketId, service: { entreprise: { userId: user.id } } }
   ```
   Un ticket d'une autre entreprise est traité comme **inexistant** et renvoie
   404, ce qui évite de révéler son existence. L'`ADMIN` n'est pas restreint.

2. **Services** — `supprimerService` vérifie la propriété avant suppression.

3. **Tickets du client** — `supprimerTicket` utilise
   `deleteMany({ where: { id, userId } })` : l'accès indirect est impossible
   **par construction** plutôt que par vérification préalable.

### RG-06 — journal d'audit

Chaque transition écrit sa ligne `Action` **dans la même opération Prisma** que
la mise à jour du ticket :

```js
await prisma.ticket.update({
  where: { id },
  data: {
    statut: 'APPELE',
    guichet,
    actions: { create: { type: 'ACTION_APPELE', guichet } },
  },
});
```

Un changement d'état ne peut donc pas être journalisé à moitié. Les statistiques
de l'entreprise dérivent réellement de cette table (§ 9).

---

## 6. Inventaire complet de l'API

Base : `/api`. La colonne « Accès » indique le middleware appliqué.

### Authentification — `/api/auth`

| Méthode | Chemin | Accès | Rôle |
|---|---|---|---|
| POST | `/inscription` | public | Crée un compte `CLIENT` ou `ENTREPRISE` |
| POST | `/connexion` | public | Renvoie le jeton et l'utilisateur |
| GET | `/me` | authentifié | Profil du compte connecté |
| PATCH | `/avatar` | authentifié | Met à jour l'avatar (base64) |
| DELETE | `/compte` | authentifié | Suppression définitive du compte et de ses données |

### Tickets — `/api/tickets`

| Méthode | Chemin | Accès |
|---|---|---|
| POST | `/` | authentifié — le client prend un ticket |
| GET | `/mes-tickets` | authentifié — ses tickets |
| GET | `/all` | **ADMIN** — tous les tickets de la plateforme |
| GET | `/file/:serviceId` | **public** — file d'un service (RG-07) |
| DELETE | `/historique` | authentifié — purge son historique |
| DELETE | `/:id` | authentifié — son propre ticket |
| PATCH | `/:id/valider` | ENTREPRISE, ADMIN |
| PATCH | `/:id/refuser` | ENTREPRISE, ADMIN |
| PATCH | `/:id/appeler` | ENTREPRISE, ADMIN |
| PATCH | `/:id/terminer` | ENTREPRISE, ADMIN |

### Services — `/api/services`

| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/` | public — tous les services de la plateforme |
| GET | `/catalogue/:type` | public — catalogue type d'activité |
| GET | `/:entrepriseId` | public — services d'une entreprise |
| POST | `/` | ENTREPRISE — créer un service |
| DELETE | `/:id` | ENTREPRISE, ADMIN |

### Entreprises — `/api/entreprises`

| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/?type=` | public — liste, filtrable par type |
| GET | `/moi` | ENTREPRISE — son profil et ses services |
| GET | `/stats` | ENTREPRISE, ADMIN — statistiques (§ 9) |
| GET | `/tickets` | ENTREPRISE, ADMIN — ses tickets |
| PATCH | `/avatar` | ENTREPRISE |
| PATCH | `/profil` | ENTREPRISE — nom, description, coordonnées GPS |

### Divers

| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/api/health` | public — sonde de disponibilité |

**Total : 27 points d'accès.**

> **Correction à porter dans l'Annexe B du mémoire.** L'annexe décrit un
> `GET /api/entreprises/:id` qui n'existe pas ; les routes réelles sont `/moi`,
> `/stats` et `/tickets`, toutes déduites du jeton. Elle décrit `GET /api/services`
> comme listant les services d'une entreprise, alors qu'il renvoie ceux de toute
> la plateforme. Et `PATCH /api/tickets/:id/refuser` y est absente.

---

## 7. Authentification et contrôle d'accès

### Chaîne d'authentification

1. **Inscription** — le mot de passe est haché par bcrypt, **coût 10**.
   Le rôle demandé est validé contre une liste blanche (voir ci-dessous).
   Si le rôle est `ENTREPRISE`, l'entreprise est créée dans la foulée avec son
   catalogue de services pré-rempli selon le type choisi.
2. **Connexion** — comparaison bcrypt, puis émission d'un **JWT de 7 jours**
   portant `{ id, role }`.
3. **Requêtes** — le front joint `Authorization: Bearer <token>`.
   `requireAuth` vérifie la signature et place le contenu dans `req.user`.
   `requireRole(...roles)` filtre ensuite par rôle.

### Contrôle vertical (par rôle)

`requireRole` est appliqué sur chaque route sensible — voir le tableau du § 6.

### Contrôle horizontal (par propriété)

Décrit au § 5, RG-04 / RG-05.

### Liste blanche des rôles à l'inscription — ajout du 5 septembre

```js
const ROLES_INSCRIPTION = ['CLIENT', 'ENTREPRISE'];
```

> **Faille corrigée le 5 septembre.** Jusqu'à cette date, le rôle était lu dans
> le corps de la requête et écrit tel quel en base :
> `role: role.toUpperCase()`. Un `POST /api/auth/inscription` **anonyme** avec
> `role: "ADMIN"` créait donc un compte administrateur. Et l'`ADMIN` n'est pas un
> simple lecteur : le contrôle de propriété le laisse appeler, valider, refuser et
> clôturer **n'importe quel ticket de n'importe quelle entreprise**. La faille
> avait été identifiée le 6 juillet 2026 et est restée ouverte deux mois.
> Elle n'était pas relevée par l'audit du 1ᵉʳ septembre, qui classait le domaine
> « Authentification et rôles » en conforme.

**Vérification en base, 5 septembre.** Un recensement des comptes de production a
été fait après correction : la base compte 19 comptes, dont **un seul de rôle
`ADMIN`** — `admin@jeloft.com`, créé le 28 mai 2026, soit le compte légitime
d'origine. Aucun compte administrateur n'a donc été créé par la faille pendant
les deux mois où elle était ouverte. C'est une réponse utile à préparer si le
jury pose la question de l'impact.

**Rotation des identifiants, 5 septembre.** Le mot de passe du compte
administrateur figurait en clair dans `RESUME.md`, fichier suivi par git et
poussé sur un dépôt public. Il a été remplacé par une valeur aléatoire de 20
caractères via `reset-password.js`, et le changement vérifié : l'ancien mot de
passe renvoie désormais 401, le nouveau ouvre une session.

> **Ce que la suppression du fichier ne fait pas.** Retirer `RESUME.md` du dépôt
> n'efface pas les commits qui le contenaient : la valeur reste lisible dans
> l'historique, dans les éventuels clones et forks, et dans les objets encore
> référencés côté GitHub. Réécrire l'historique (`git filter-repo`, force-push)
> ne règle pas non plus le fond — un secret publié doit être considéré comme
> compromis quoi qu'il arrive, et la réécriture casse tous les clones existants.
> **La rotation est le correctif ; la réécriture d'historique n'en est pas un.**

### Garde côté client

`PrivateRoute` redirige vers `/connexion` sans session, et renvoie vers l'espace
du rôle si le rôle ne correspond pas. Elle se fonde sur l'objet utilisateur
stocké dans `localStorage`, **modifiable par l'usager** — c'est une commodité
d'affichage, pas une sécurité. L'API applique les rôles indépendamment.

### Gestion des secrets

Le fichier `.env` n'est suivi par git à aucun niveau du dépôt ; seuls les
`.env.example` le sont, documentés, avec la recommandation `openssl rand -hex 32`
pour le secret JWT. Les `.gitignore` sont explicites et commentés.

---

## 8. Temps réel — architecture au 5 septembre

### Principe retenu

Le canal est **descendant seul** : le serveur diffuse, le navigateur écoute.
Aucun événement de ticket n'est accepté en entrée.

```
Agent clique « Appeler »
   │
   ├─► PATCH /api/tickets/:id/appeler      (HTTP, authentifié)
   │      └─► contrôle du droit et de la transition
   │      └─► UPDATE ticket + INSERT action  (une seule opération)
   │      └─► diffuser('ticket:appele', ticket)
   │             └─► io.to('jeloft:queue').emit(...)  ──► tous les navigateurs
   └─◄ réponse HTTP
```

### Les six événements diffusés

`ticket:nouveau` · `ticket:valide` · `ticket:refuse` · `ticket:appele` ·
`ticket:traite` · `ticket:absent`

### Charge utile

```js
{ ticketId, numero, statut, guichet, serviceId }
```

Le destinataire rappelle l'API pour le détail. **L'identité du porteur ne circule
plus** vers les autres navigateurs.

### Salle de diffusion

Une **salle unique**, `jeloft:queue`, rejointe par `socket.on('join:queue')` à la
connexion. Tous les navigateurs de toutes les entreprises y sont réunis.

### Authentification du canal

Optionnelle : un jeton absent est accepté (la file publique doit rester
consultable), un jeton présent mais invalide est rejeté.

> **Refonte du 5 septembre.** Avant cette date, l'émission partait du
> **navigateur de l'agent** après réception de la réponse HTTP, et `socket.js`
> se contentait de relayer les six événements sans aucune vérification. Un
> visiteur anonyme pouvait ouvrir la console de son navigateur et émettre
> `socket.emit("ticket:appele", { id: "…", guichet: "3" })` : le serveur relayait,
> et tous les écrans affichaient un appel qui n'avait pas eu lieu. La base n'était
> pas touchée, mais l'affichage de tous les usagers l'était — sur une application
> dont la promesse est l'équité de l'ordre de passage.
> C'étaient les écarts C1 et C2 de l'audit. La boucle de relais a été supprimée,
> et les six `emit` du front avec elle.

### Sondage de secours

En complément du canal temps réel, quatre écrans relancent un chargement
périodique : `DashbordClient` et `PAdmin` toutes les 12 secondes, `Entreprise`
et `ServicePage` toutes les 10 secondes.

C'est un filet de sécurité si un événement est perdu. **Il doit être assumé dans
le mémoire** : la justification du choix de Socket.IO contre le sondage
périodique repose notamment sur l'économie de données mobiles, et un client resté
une heure sur son tableau de bord émet environ 300 requêtes que le canal était
censé rendre inutiles.

---

## 9. Statistiques du prestataire

`GET /api/entreprises/stats` renvoie un objet complet, calculé à partir du
journal `Action` sur **60 jours de recul**.

| Indicateur | Calcul |
|---|---|
| `total`, `traites`, `absents`, `enAttente` | Comptages sur `Ticket` |
| `tauxAbsence` | `absents / (traites + absents)` |
| `parService` | `groupBy` sur `serviceId`, trié décroissant |
| `parJour` | Traités et absents par jour, **14 derniers jours** |
| `heuresPointe` | Répartition des `EMIS` sur les 24 heures |
| `attenteMoyenneMin` | Moyenne des écarts **`EMIS` → `ACTION_APPELE`** |
| `serviceMoyenMin` | Moyenne des écarts **`ACTION_APPELE` → `ACTION_TRAITE`** |

Les deux dernières lignes sont importantes pour le mémoire : ce sont des
**durées réellement mesurées**, pas des estimations. Elles font le lien avec la
Partie I : la journalisation des durées de service, annoncée comme ouvrant la
voie à une estimation dynamique du temps d'attente, est effectivement en place.

Côté interface, un onglet « Statistiques » de l'espace entreprise affiche trois
cartes d'indicateurs et trois graphiques `recharts` : activité sur 14 jours
(barres groupées traités / absents), services les plus demandés (barres
horizontales), heures de pointe.

**Limite connue.** Le taux d'absence agrège deux phénomènes de nature opposée :
le client qui ne s'est pas présenté et le prestataire qui a refusé le ticket —
les deux aboutissent au statut `ABSENT`. La distinction reste possible via le
journal (`REFUSE` contre `ACTION_ABSENT`), mais l'indicateur affiché ne la fait
pas.

---

## 10. Parcours utilisateurs

### Client

1. Inscription ou connexion.
2. `/Client` puis `/Service2` — grille des catégories de services.
3. `/service/:type` — liste des établissements de la catégorie, avec pour chacun
   ses services, le nombre de personnes en file et une estimation d'attente.
4. Prise de ticket → statut `EN_ATTENTE_VALIDATION`.
5. Le ticket émis affiche son numéro, un **QR code** (`/service/:type?t=numero`),
   sa position et l'heure de passage estimée.
6. `/DashbordClient` — suivi de ses tickets, historique, purge possible.

### Entreprise

1. Inscription avec choix d'un **type d'activité**, qui pré-remplit le catalogue
   de services — l'exploitant n'a aucune configuration technique à faire.
2. `/EntrepriseAccueil` puis `/Entreprise`.
3. Onglets : **file d'attente**, **historique**, **statistiques**.
4. Actions sur les tickets : valider, refuser, appeler au guichet, marquer traité
   ou absent.
5. Profil : nom, description, avatar, **position GPS** posée sur une carte Leaflet.

### Administrateur

1. `/Administrateur` — tableau de bord de la plateforme : total, traités,
   absents, en attente, appelés, en validation, taux de traitement et d'absence,
   attente moyenne, répartition par entreprise, activité horaire, derniers tickets.
2. Accès aux espaces client et entreprise, et aux **catégories réservées** (§ 11).

**Ce que l'administrateur ne fait pas.** Il ne valide **pas** les inscriptions
d'entreprises : aucun champ de statut ou d'approbation n'existe sur `Entreprise`,
une entreprise est active dès son inscription, et aucune route ne permet
d'approuver, suspendre ou supprimer un compte tiers. La seule route qui lui est
réservée dans tout le projet est `GET /api/tickets/all`.

> **Correction à porter dans le mémoire.** L'Annexe E déclare « Validation des
> inscriptions d'entreprises — Validé » et l'Annexe C.3 en fait son étape 2.
> Cette fonctionnalité n'existe ni en base, ni en API, ni à l'écran. C'était
> l'écart C5 de l'audit — les deux mentions doivent être retirées.

> **Seconde correction.** `GET /api/entreprises/stats` autorise bien le rôle
> `ADMIN`, mais son premier acte est de chercher l'entreprise rattachée au compte
> connecté. Un administrateur qui n'est pas lui-même une entreprise reçoit un
> **404**. Les statistiques globales de plateforme promises par BF-10 ne sont donc
> pas accessibles.

---

## 11. Catalogue des services

Le catalogue est déclaré côté serveur dans `BackEnd/src/data/servicesCatalog.js`
et copié en base à la création de chaque compte entreprise.

### Catégories ouvertes à l'inscription

| Type | Services (préfixe) |
|---|---|
| `coiffure` | Coupe homme (A), Coupe enfant (B), Coloration (C) |
| `tresseuses` | Défrissage (A), Tresses (B), Tissage (C), Mèche longue (D) |
| `pressings` | Lavage express (A), Lavage normal (B), Repassage (C), Nettoyage sec (D) |
| `lavage-auto` | Lavage extérieur (A), Lavage complet (B), Nettoyage intérieur (C), Polish & lustrage (D) |

### Catégories réservées à l'administrateur — ajout du 5 septembre

| Type | Services (préfixe) |
|---|---|
| `residence` | Visite de logement (A), Dépôt de dossier (B), État des lieux (C), Signature de bail (D) |
| `agence-waves` | Dépôt d'argent (A), Retrait d'argent (B), Ouverture de compte (C), Paiement de facture (D) |

Le cloisonnement est posé à trois niveaux :

```js
export const TYPES_ADMIN = ['residence', 'agence-waves'];
export const TYPES_INSCRIPTION = SERVICE_TYPES.filter((t) => !TYPES_ADMIN.includes(t));
```

1. **Serveur** — `auth.controller.js` valide le type d'inscription contre
   `TYPES_INSCRIPTION`. Une inscription en `residence` ou `agence-waves` reçoit
   un 400. Les catalogues restent servis par l'API pour l'administrateur, et les
   entreprises déjà inscrites sous ces types continuent de fonctionner.
2. **Routage** — `/service/residence` et `/service/agence-waves` sont en
   `roles={['ADMIN']}`.
3. **Interface** — les cartes portent un drapeau `adminSeulement` et sont
   filtrées par `useAuth()`. Un client voit quatre catégories, l'administrateur
   en voit six.

**Adaptation au terrain ivoirien.** Les émojis des services représentant des
personnes ont été choisis avec une teinte de peau noire (💇🏿‍♂️, 🧒🏿, 💆🏿‍♀️, 👩🏿‍🦱)
plutôt que le jaune par défaut. Le catalogue `agence-waves` reprend les
opérations réelles d'une agence de monnaie électronique.

### État réel des catégories en base — relevé du 5 septembre

| Type | Entreprises |
|---|---|
| `coiffure` | 3 — Luxe Barber, CHEZ MAII, JPS Coiffure |
| `pressings` | 3 — Pressing, Premoci_pressing, Khalys pressing Shop |
| `lavage-auto` | 3 — First Lavage, Pro Cleaner, Lavage Auto St-Michel |
| `tresseuses` | 1 — Marie Estelle |
| `residence` | **0** |
| `agence-waves` | **0** |

Les deux catégories réservées sont donc **sans contenu**, et l'inscription y
étant fermée, aucune entreprise ne peut s'y créer d'elle-même : l'administrateur
qui ouvre ces pages lit « Aucune agence disponible pour le moment ».

Ce n'est pas une conséquence des modifications du 5 septembre. `residence` a été
ajoutée au catalogue en juin (commit `468c7d3`) et **n'a jamais accueilli la
moindre entreprise** — c'est vraisemblablement la raison pour laquelle elle a été
retirée du parcours client : elle y apparaissait comme une catégorie vide.

Un script d'amorçage, `BackEnd/seed-categories-admin.js`, est prêt à créer une
entreprise de démonstration par catégorie réservée, avec son catalogue de
services. Il est idempotent (une catégorie déjà peuplée est laissée telle quelle)
et affiche les identifiants créés pour permettre de revenir en arrière. **Il n'a
pas été exécuté** : il écrit sur la base de production.

---

## 12. Ce qui a changé le 5 septembre 2026

Huit modifications, toutes vérifiées par exécution ou par compilation.

| # | Modification | Fichiers |
|---|---|---|
| 1 | **Escalade de rôle à l'inscription bloquée** — liste blanche `CLIENT` / `ENTREPRISE`, contrôlée avant tout accès à la base | `auth.controller.js` |
| 2 | **RG-03 appliquée** — table de transitions et contrôle unique `verifierTransition()` en tête des quatre handlers | `tickets.controller.js` |
| 3 | **Position corrigée** — le décompte `devant` exclut les tickets `EN_ATTENTE_VALIDATION`, dont une partie sera refusée | `tickets.controller.js` |
| 4 | **Émission déplacée côté serveur** — boucle de relais supprimée, fonction `diffuser()`, six `emit` retirés du front | `socket.js`, `tickets.controller.js`, `Entreprise.jsx`, `ServicePage.jsx` |
| 5 | **Catégories réservées à l'administrateur** — Résidence retirée du client et de l'inscription, Agence Waves créée | `servicesCatalog.js`, `auth.controller.js`, `App.js`, `Inscription.js`, `Service2.jsx`, `ServicePage.jsx`, `AgenceWaves.jsx/.css` |
| 6 | **Écran d'accueil animé supprimé** — la barre de chargement de 2,5 s puis 0,8 s de transition disparaissent ; `/` ouvre directement sur l'accueil | `App.js`, suppression de `SplashScreen.jsx` |
| 7 | **Mot de passe administrateur changé** — l'ancien figurait en clair dans `RESUME.md`, sur un dépôt public (§ 7) | base de production, via `reset-password.js` |
| 8 | **Script d'amorçage des catégories réservées** ajouté, non exécuté (§ 11) | `seed-categories-admin.js` |

Corrections mineures au passage : le message d'état vide accordait mal au féminin
(« Aucun agence immobilière »), et l'import `FaBuilding` devenu inutile dans
`Inscription.js` a été retiré.

### Vérifications effectuées

- `react-scripts build` avec `CI=true` (warnings traités en erreurs) : compilé
  sans erreur ni avertissement.
- Serveur démarré et interrogé : inscription `ADMIN` refusée en 400, inscription
  en `residence` et `agence-waves` refusées en 400, catalogues servis.
- Canal Socket.IO : un client anonyme émettant un faux `ticket:appele` n'est
  relayé à personne ; `diffuser()` appelé comme le fait un contrôleur atteint bien
  les navigateurs abonnés.
- Base de production interrogée en lecture : 19 comptes, un seul `ADMIN`,
  10 entreprises réparties sur quatre types, 28 tickets et 83 actions.
- Rotation du mot de passe administrateur confirmée : ancien mot de passe en
  401, nouveau en 200.
- **Non vérifié de bout en bout** : le refus 400 de RG-03 sur un ticket réel.
  Le `.env` local pointe sur la base de production, et le test aurait exigé d'y
  créer des données.

---

## 13. Limites connues

Cette section est destinée à alimenter la partie « Limites » du mémoire. Elle
recense ce que l'application **ne fait pas**, ou fait imparfaitement.

### Fonctionnelles

1. **L'estimation d'attente est un forfait.** `attente = devant × 7` minutes,
   calibré sur l'observation de terrain. La théorie des files d'attente exposée
   en Partie I n'a pas servi au dimensionnement — le secteur informel ne fournit
   pas de paramètres stables.
2. **La position et l'attente ne sont jamais recalculées.** Elles sont écrites en
   dur dans deux colonnes à la création du ticket, et aucune autre écriture ne les
   touche. Le client voit un nombre qui ne bouge pas pendant qu'il attend, alors
   que le temps réel rafraîchit le statut. L'Annexe C.1 promet pourtant que « la
   position se met à jour automatiquement à chaque client servi ».
3. **L'ouverture et la fermeture de file n'existent pas.** Ni `Service` ni
   `Entreprise` ne portent d'indicateur d'ouverture : une file est toujours
   ouverte, un ticket peut être pris à toute heure. Le cas d'utilisation figure
   pourtant dans le mémoire.
4. **La validation des inscriptions d'entreprises n'existe pas** (§ 10).
5. **Les statistiques globales de l'administrateur ne sont pas accessibles** (§ 10).
6. **La suppression d'un ticket par le client est physique**, sans statut
   `ANNULE` : l'historique et le journal d'audit perdent la trace.
7. **Refus et absence sont indiscernables** dans l'indicateur affiché (§ 9).
8. **Les deux catégories réservées à l'administrateur sont vides** et ne peuvent
   pas se remplir, l'inscription y étant fermée (§ 11). `residence` n'a jamais
   accueilli d'entreprise depuis sa création en juin.

### Techniques

9. **Salle de diffusion unique.** Tous les navigateurs de toutes les entreprises
   reçoivent tous les événements. Confidentialité commerciale entre prestataires
   concurrents, et trafic croissant avec le carré du nombre d'utilisateurs.
   Correctif : `socket.join('service:' + serviceId)` au lieu de la salle globale.
10. **Le contexte Socket lit le jeton une seule fois, au montage.** Après une
   connexion réussie, la socket reste anonyme jusqu'au rechargement de la page.
   Sans effet aujourd'hui puisque le canal est descendant seul, mais à traiter en
   même temps qu'un éventuel cloisonnement.
11. **Aucun test automatisé.** Le seul fichier présent, `FrontEnd/src/App.test.js`,
    est le gabarit livré par Create React App : il cherche un lien « learn react »
    qui n'existe pas et échouerait s'il était exécuté. La campagne de tests décrite
    au chapitre III a été menée **manuellement**, sous Postman pour l'API et dans
    le navigateur pour le bout en bout. Le mémoire doit le dire explicitement.
12. **Aucune limitation de débit** sur `/api/auth/connexion` : le service est
    ouvert à une attaque par force brute. `express-rate-limit` se pose en dix minutes.
13. **Aucune politique de mot de passe** : `"a"` est accepté à l'inscription.
14. **Aucune bibliothèque de validation d'entrée.** Les corps de requête sont
    déstructurés directement ; `updateEntrepriseProfile` passe `parseFloat` sans
    contrôle. Prisma protège de l'injection SQL — le risque est fonctionnel, pas
    critique.
15. **Fuite d'information en erreur.** Chaque réponse 500 renvoie `err.message`
    au client, ce qui expose des détails internes de la base.
16. **Aucune pagination** sur `GET /api/tickets/all` ni sur
    `GET /api/entreprises/tickets`. Sans conséquence en démonstration, bloquant à
    l'échelle.
17. **Avatars stockés en base64** dans des colonnes texte, avec
    `express.json({ limit: '5mb' })`. C'est un choix cohérent avec la contrainte
    de gratuité de l'infrastructure — à assumer plutôt qu'à subir en question.
18. **Code mort côté front.** Le répertoire `PAGES/PClient/DashbordClientContent/`
    (sept composants) n'est référencé nulle part et affiche des valeurs en dur
    — « 010 », « 38 % », « 5 personnes devant vous ». Ce sont des vestiges de la
    maquette initiale, et ce sont exactement les fichiers qu'un examinateur
    curieux ouvrira s'il cherche l'affichage de la position.
19. **`Ticket.statut` a une valeur par défaut incohérente** avec le cycle (§ 4).

### Documentaires

20. Le dossier `diagrammes/` livré contient la **version 1**, non conforme au
    code (classes `Guichet`, `FileAttente`, `Notification`, héritage `Utilisateur`,
    statuts `EN_ATTENTE` / `SERVI` / `ANNULE`). Les figures insérées dans le
    mémoire sont, elles, la version 2 conforme. Le dossier
    `diagrammes/v2-conformes-code` cité dans le mémoire n'existe pas.
21. `AVIS_JURY_ET_CORRECTIONS.md` (mai 2026) décrit une version antérieure du
    projet — état en `localStorage`, `QueueContext`, absence de back-end — et
    contredit frontalement le mémoire. À sortir du dossier remis.

---

## 14. Perspectives

À énoncer plutôt qu'à réaliser avant la soutenance.

1. **Estimation dynamique du temps d'attente** à partir des durées réelles déjà
   journalisées. L'infrastructure de données est en place (§ 9), ce qui rend la
   perspective crédible plutôt que théorique. C'est la perspective la plus forte
   du dossier.
2. **Cloisonnement des salles de diffusion** par service.
3. **Statut `ANNULE`** en remplacement de la suppression physique du ticket.
4. **Ouverture et fermeture de file** par le prestataire — un booléen sur
   `Service`, un contrôle dans `prendreTicket`, un interrupteur à l'écran. Répond
   à une réalité de terrain évidente : un salon ferme le soir.
5. **Tests automatisés** Jest + Supertest sur les cas d'API déjà décrits.
6. **Limitation de débit, politique de mot de passe, pagination** des vues
   d'administration.
7. **Notifications SMS ou canal USSD**, et installation en application
   progressive (PWA) — pertinents pour un terrain où le smartphone n'est pas
   universel.

---

## 15. État du dépôt au 5 septembre 2026

Le travail de la journée est commité et poussé sur `main`
(`35c5749..d9d9514`), portant le dépôt de 31 à 33 commits.

| Commit | Objet |
|---|---|
| `cbe8c64` | Code — sécurité de l'inscription, RG-03, émission temps réel côté serveur, statistiques, catégories réservées, suppression de l'écran de chargement |
| `d9d9514` | Documentation — le présent récapitulatif, notes de session de juillet, retrait de `RESUME.md` |

**Pourquoi un seul commit pour le code.** Les quatre lots de la journée se
croisent dans les mêmes fichiers — `auth.controller.js` porte à la fois la liste
blanche des rôles et la restriction des types d'inscription, `App.js` les routes
réservées et la suppression du splash, `ServicePage.jsx` le retrait des émissions
et la nouvelle catégorie, `Entreprise.jsx` l'onglet statistiques et le retrait
des émissions. Un découpage propre aurait demandé un `git add -p` interactif. Le
message de commit détaille les quatre lots séparément.

**Fichiers retirés du dépôt ce jour.**

- `RESUME.md` — daté de mai 2026, il décrivait un état du projet antérieur à la
  refonte back-end (persistance en `localStorage`, `QueueContext`, absence
  d'API), et contenait en clair les identifiants du compte administrateur.
  Deux copies existaient, à la racine de `Memoire` et dans `jojo` ; les deux ont
  été supprimées. Le présent document le remplace.
- `FrontEnd/src/PAGES/SplashScreen.jsx` — écran de chargement initial.

Les deux restent récupérables depuis l'historique git.

**Actions hors dépôt.** Le mot de passe du compte administrateur a été changé
en base de production (§ 7). Le script `seed-categories-admin.js` est versionné
mais **n'a pas été exécuté** (§ 11).

**Reste non commité** : rien. L'arbre de travail est propre à l'exception des
ajouts postérieurs à ces deux commits.

---

*Document établi le 5 septembre 2026 par lecture du code source. Chaque
affirmation est vérifiable dans le dépôt à cette date.*
