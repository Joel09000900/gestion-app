# Modifications — Synchronisation Tickets Client ↔ Entreprise

## Problème identifié
Le dashboard entreprise lisait les tickets depuis l'API backend (DB vide).
L'admin voyait les tickets car il lisait QueueContext (localStorage).
La DB ne contenait aucun service, donc l'API retournait toujours une liste vide.

---

## Correction principale — `Entreprise.jsx`

**Fichier :** `src/PAGES/PEntreprise/Entreprise.jsx`

### Ce qui a changé
- Suppression de `chargerDonnees` (polling API toutes les 10s)
- Ajout de `useQueue` → lecture directe depuis QueueContext
- Ajout de `useMemo` pour calculer la file, l'historique et les stats en temps réel
- Ajout de `PAGE_KEY_MAP` pour relier l'URL au `pageKey` de QueueContext

### Mapping service URL → pageKey
| URL param | pageKey QueueContext |
|-----------|---------------------|
| `coiffure` | `"coiffeur"` |
| `tresseuses` | `"tresseuses"` |
| `pressings` | `"pressing"` |

### Actions mises à jour
| Action | Effet QueueContext | Effet client |
|--------|-------------------|--------------|
| Appeler le suivant | `callTicket(id, guichet)` | Statut → "Appelé" |
| Traité | `markTraite(id)` | Statut → "Traité" |
| Absent | `markAbsent(id)` | Statut → "Absent" |

L'API reste appelée en arrière-plan si le ticket possède un `dbId` (sync DB optionnelle).

---

## Flux de synchronisation final

```
Client prend un ticket (ex: Coiffeur → Coupe homme)
  └─ QueueContext : { pageKey: "coiffeur", statut: "attente" }

Entreprise ouvre /EntrepriseService/coiffure
  └─ Lit QueueContext filtré sur pageKey "coiffeur"
  └─ Voit le ticket apparaître immédiatement

Entreprise clique "Appeler le suivant"
  └─ callTicket() → statut "appele" dans QueueContext
  └─ Client voit "Appelé" en temps réel

Entreprise clique "Traité" ou "Absent"
  └─ markTraite() / markAbsent() → statut mis à jour
  └─ Ticket passe dans l'historique du dashboard
```

---

## Seed base de données — `prisma/seed.mjs`

**Problème :** Tables Service, Ticket et Action vides → `serviceId` toujours null → tickets jamais envoyés au backend.

**Fichier créé :** `BackEnd/prisma/seed.mjs`  
**Commande :** `node prisma/seed.mjs`

### Services créés (10 au total)

| Service | Préfixe | Entreprise |
|---------|---------|-----------|
| Coupe homme | A | joj |
| Coupe enfant | B | joj |
| Coloration | C | joj |
| Tresses simples | A | jojo8 |
| Tresses africaines | B | jojo8 |
| Entretien tresses | C | jojo8 |
| Lavage express | A | henoc |
| Lavage normal | B | henoc |
| Repassage | C | henoc |
| Nettoyage sec | D | henoc |

### Attribution entreprise ↔ service
| Compte entreprise | Email | Catégorie |
|------------------|-------|-----------|
| joj | henocjoelsay@gmail.com | Coiffure |
| jojo8 | Henocsayp@gmail.com | Tresseuses |
| henoc | henocsay0@gmail.com | Pressing |

### Flux complet après seed
```
Client connecté → Coiffeur page
  └─ GET /services → serviceIdMap["Coupe homme"] = ID en base
  └─ Prend ticket → POST /tickets { serviceId } → Ticket + Action créés en DB ✓

Entreprise joj → /EntrepriseService/coiffure
  └─ Voit le ticket via QueueContext (temps réel)
  └─ Ticket aussi en DB pour persistance
```

---

## Compte administrateur

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@jeloft.com | Admin1234! | ADMIN |

Mot de passe réinitialisé directement en base NeonDB via Prisma.

---

## Récapitulatif de tous les fichiers modifiés (session complète)

| Fichier | Type | Modification |
|---------|------|-------------|
| `src/PAGES/acceuil.js` | Modifié | Lien "Gérer" → `/EntrepriseAccueil` |
| `src/App.js` | Modifié | Ajout routes entreprise |
| `src/PAGES/PEntreprise/EntrepriseAccueil.jsx` | Créé | Page intermédiaire (2 blocs) |
| `src/PAGES/PEntreprise/EntrepriseAccueil.scss` | Créé | Styles glassmorphism |
| `src/PAGES/PEntreprise/EntrepriseServices.jsx` | Créé | Page 3 blocs services |
| `src/PAGES/PEntreprise/EntrepriseServices.scss` | Créé | Styles grille services |
| `src/PAGES/PEntreprise/Entreprise.jsx` | Modifié | Sync QueueContext + filtre par service |
| `src/PAGES/Services/Coiffeur.jsx` | Modifié | Fetch `/services` + `serviceId` dans ticket |
| `src/PAGES/Services/Tresseuses.jsx` | Modifié | Fetch `/services` + `serviceId` dans ticket |
| `src/PAGES/Services/Pressing.jsx` | Modifié | Fetch `/services` + `serviceId` dans ticket |
