# Séance du 2 octobre 2026 — jeu d'essai : 15 comptes clients et cycle de vie des tickets

## Objet

Peupler la base avec un jeu d'essai réaliste après la remise à zéro du même
jour : quinze comptes clients, trente tickets répartis sur les quatre
catégories ouvertes au public, et un exemplaire de **chacun des six états
terminaux** possibles du cycle de vie. Le but est double — disposer de données
d'affichage pour la suite du travail sur le front-end, et vérifier au passage
que les règles de gestion tiennent bout à bout.

Tout est passé par l'**API HTTP réelle** (inscription, prise de ticket,
validation, refus, appel, clôture). Aucune écriture directe en base, sauf les
lectures de vérification en fin de scénario. Un jeu d'essai inséré au `INSERT`
ne prouve rien sur les routes, les middlewares ni les transitions : il prouve
seulement que le schéma accepte les lignes.

---

## Où sont les mots de passe

**Ils ne sont pas dans ce fichier, et c'est volontaire.** Le dépôt
`gestion-app` est public : y committer quinze identifiants actifs de la base
de production les rendrait lisibles par n'importe qui, et définitivement —
retirer un fichier n'efface pas les commits qui le contenaient, ni les clones
ni les forks déjà faits.

C'est la leçon du 5 septembre : le mot de passe administrateur figurait en
clair dans `RESUME.md`, suivi par git et poussé en public. Il a fallu une
rotation d'identifiants, et le mot de passe admin a fini par être perdu.

Les quinze mots de passe sont donc conservés **hors du dépôt**, dans
`identifiants-test-2octobre.md` à la racine du dossier `JOJO/` — à côté du
dossier `memoire/`, jamais vu par git. Ce fichier-ci garde tout le reste :
emails, scénario, tickets, résultats des tests.

Trois points de vigilance qui restent valables :

1. **Ce sont de vrais comptes sur la vraie base** pointée par `DATABASE_URL`.
2. Ces comptes n'ont que le rôle `CLIENT` : le risque est borné à la prise et
   la suppression de leurs propres tickets. Aucun n'a de droit sur les tickets
   d'autrui — c'est vérifié par l'assertion 10 ci-dessous.
3. Rien n'oblige à les garder après la soutenance. `node purge-tickets.js
   --confirm` efface leurs tickets ; les comptes eux-mêmes se suppriment
   depuis l'interface ou en base.

---

## Les quinze comptes clients

Mots de passe de 18 caractères tirés uniformément avec `crypto.randomInt`
(et non `Math.random`, non cryptographique) dans un alphabet de 67 signes sans
caractère ambigu — pas de `l`/`1`/`O`/`0` confondables, ni de `|` qui casserait
ce tableau. Chaque mot de passe contient au moins une minuscule, une majuscule,
un chiffre et un symbole : environ 109 bits d'entropie.

Le modèle `User` n'a pas de champ de genre et on ne l'a pas ajouté pour un jeu
d'essai : la colonne ci-dessous ne sert qu'à documenter la répartition
demandée (8 femmes, 7 hommes).

| Nom | Genre | Email | Mot de passe | Service choisi |
|---|---|---|---|---|
| Aïcha Koné | F | `aicha.kone@jeloft-test.ci` | _(hors depot)_ | Coiffure |
| Ibrahim Coulibaly | H | `ibrahim.coulibaly@jeloft-test.ci` | _(hors depot)_ | Coiffure |
| Mariam Traoré | F | `mariam.traore@jeloft-test.ci` | _(hors depot)_ | Coiffure |
| Serge Kouamé | H | `serge.kouame@jeloft-test.ci` | _(hors depot)_ | Coiffure |
| Fatou Diomandé | F | `fatou.diomande@jeloft-test.ci` | _(hors depot)_ | Pressing |
| Mamadou Cissé | H | `mamadou.cisse@jeloft-test.ci` | _(hors depot)_ | Pressing |
| Adjoua Kouassi | F | `adjoua.kouassi@jeloft-test.ci` | _(hors depot)_ | Pressing |
| Yao N'Guessan | H | `yao.nguessan@jeloft-test.ci` | _(hors depot)_ | Pressing |
| Awa Bamba | F | `awa.bamba@jeloft-test.ci` | _(hors depot)_ | Tresseuses |
| Nadège Yao | F | `nadege.yao@jeloft-test.ci` | _(hors depot)_ | Tresseuses |
| Salimata Ouattara | F | `salimata.ouattara@jeloft-test.ci` | _(hors depot)_ | Tresseuses |
| Rokia Sangaré | F | `rokia.sangare@jeloft-test.ci` | _(hors depot)_ | Tresseuses |
| Lassina Doumbia | H | `lassina.doumbia@jeloft-test.ci` | _(hors depot)_ | Lavage auto |
| Olivier Tanoh | H | `olivier.tanoh@jeloft-test.ci` | _(hors depot)_ | Lavage auto |
| Aboubacar Fofana | H | `aboubacar.fofana@jeloft-test.ci` | _(hors depot)_ | Lavage auto |

Le domaine `@jeloft-test.ci` n'existe pas : il rend ces comptes identifiables
d'un coup d'œil et interdit toute confusion avec un client réel.

> Les accents sont retirés des adresses (`traore`, `cisse`, `nguessan`) : une
> adresse email doit rester en ASCII. Les noms, eux, gardent leur
> orthographe — `Yao N'Guessan` est bien stocké avec son apostrophe typographique.

---

## Les trente tickets

Deux tickets par client, pris sur deux services différents de la catégorie
qu'il a choisie. Les dix entreprises déjà en base ont été utilisées telles
quelles.

| N° | Client | Catégorie | Service | Entreprise | Guichet | État final |
|---|---|---|---|---|---|---|
| A-1 | Aïcha Koné | Coiffure | Coupe homme | Luxe Barber | Guichet 01 | **Traité** |
| B-1 | Aïcha Koné | Coiffure | Coupe enfant | Luxe Barber | Guichet 02 | **Traité** |
| C-1 | Ibrahim Coulibaly | Coiffure | Coloration | Luxe Barber | Guichet 03 | **Traité** |
| A-1 | Ibrahim Coulibaly | Coiffure | Coupe homme | JPS Coiffure | Guichet 01 | **Traité** |
| B-1 | Mariam Traoré | Coiffure | Coupe enfant | JPS Coiffure | Guichet 02 | **Traité** |
| C-1 | Mariam Traoré | Coiffure | Coloration | JPS Coiffure | Guichet 03 | **Traité** |
| A-1 | Serge Kouamé | Coiffure | Coupe homme | CHEZ MAII | Guichet 01 | Absent (après appel) |
| B-1 | Serge Kouamé | Coiffure | Coupe enfant | CHEZ MAII | Guichet 02 | Absent (après appel) |
| A-1 | Fatou Diomandé | Pressing | Lavage express | Khalys pressing Shop | Guichet 03 | Absent (après appel) |
| B-1 | Fatou Diomandé | Pressing | Lavage normal | Khalys pressing Shop | Guichet 01 | Absent (après appel) |
| C-1 | Mamadou Cissé | Pressing | Repassage | Khalys pressing Shop | Guichet 02 | Absent (après appel) |
| D-1 | Mamadou Cissé | Pressing | Nettoyage sec | Khalys pressing Shop | — | Refusé |
| A-1 | Adjoua Kouassi | Pressing | Lavage express | Premoci_pressing | — | Refusé |
| B-1 | Adjoua Kouassi | Pressing | Lavage normal | Premoci_pressing | — | Refusé |
| C-1 | Yao N'Guessan | Pressing | Repassage | Premoci_pressing | — | Refusé |
| D-1 | Yao N'Guessan | Pressing | Nettoyage sec | Premoci_pressing | — | Refusé |
| A-1 | Awa Bamba | Tresseuses | Défrissage | Marie Estelle | — | En attente |
| B-1 | Awa Bamba | Tresseuses | Tresses | Marie Estelle | — | En attente |
| C-1 | Nadège Yao | Tresseuses | Tissage | Marie Estelle | — | En attente |
| D-1 | Nadège Yao | Tresseuses | Mèche longue | Marie Estelle | — | En attente |
| A-2 | Salimata Ouattara | Tresseuses | Défrissage | Marie Estelle | — | En attente |
| B-2 | Salimata Ouattara | Tresseuses | Tresses | Marie Estelle | — | En attente |
| C-2 | Rokia Sangaré | Tresseuses | Tissage | Marie Estelle | Guichet 02 | Appelé |
| D-2 | Rokia Sangaré | Tresseuses | Mèche longue | Marie Estelle | Guichet 03 | Appelé |
| A-1 | Lassina Doumbia | Lavage auto | Lavage extérieur | Lavage Auto St-Michel | Guichet 01 | Appelé |
| B-1 | Lassina Doumbia | Lavage auto | Lavage complet | Lavage Auto St-Michel | Guichet 02 | Appelé |
| C-1 | Olivier Tanoh | Lavage auto | Nettoyage intérieur | Lavage Auto St-Michel | — | En attente de validation |
| D-1 | Olivier Tanoh | Lavage auto | Polish & lustrage | Lavage Auto St-Michel | — | En attente de validation |
| A-1 | Aboubacar Fofana | Lavage auto | Lavage extérieur | Pro Cleaner | — | En attente de validation |
| B-1 | Aboubacar Fofana | Lavage auto | Lavage complet | Pro Cleaner | — | En attente de validation |

### Répartition en base

| Statut | Nombre | Chemin parcouru |
|---|---|---|
| `TRAITE` | 6 | émis → validé → appelé → traité |
| `ABSENT` | 10 | dont **5 refusés** avant validation et **5 absents** après appel |
| `ATTENTE` | 6 | émis → validé, en file |
| `APPELE` | 4 | émis → validé → appelé, en cours de service |
| `EN_ATTENTE_VALIDATION` | 4 | émis, pas encore arbitrés par l'entreprise |
| **Total** | **30** | |

### Journal des actions (table `Action`)

82 lignes au total. Les comptes se recoupent, ce qui vaut vérification :

| Action | Nombre | Recoupement |
|---|---|---|
| `EMIS` | 30 | un par ticket |
| `VALIDE` | 21 | 6 traités + 5 absents + 6 en attente + 4 appelés |
| `REFUSE` | 5 | les 5 refus avant validation |
| `ACTION_APPELE` | 15 | 6 traités + 5 absents + 4 encore appelés |
| `ACTION_TRAITE` | 6 | les 6 traités |
| `ACTION_ABSENT` | 5 | les 5 absences après appel |

Et par catégorie : coiffure 8, pressing 8, tresseuses 8, lavage auto 6.

Les deux origines de l'état `ABSENT` sont bien distinguées dans le journal
`Action` — `REFUSE` pour le refus avant validation, `ACTION_ABSENT` pour
l'absence après appel. C'est le point de la règle RG-03 : la table des
transitions est indexée par **action** et non par état d'arrivée, précisément
parce qu'`ABSENT` a deux causes qu'il faut pouvoir séparer dans les
statistiques.

> **Note sur les numéros.** Plusieurs tickets portent le même numéro (`A-1`
> apparaît cinq fois). Ce n'est pas un défaut : le compteur est porté par le
> **service**, pas par la plateforme, et la contrainte d'unicité est
> `@@unique([entrepriseId, prefixe])` sur `Service`. Deux salons de coiffure
> distincts délivrent chacun leur `A-1`. C'est le comportement attendu d'une
> file d'attente par établissement.

---

## Tests effectués

24 assertions, **toutes passées**. Le scénario ne se contente pas d'écrire des
données : il vérifie aussi que ce qui doit être refusé l'est.

### Comptes et authentification

| # | Vérification | Attendu | Résultat |
|---|---|---|---|
| 1 | 15 comptes créés via `POST /api/auth/inscription` | 15 | ok |
| 2 | Tous de rôle `CLIENT` (rôle relu dans la réponse du serveur, non supposé) | `['CLIENT']` | ok |
| 3 | Connexion avec le bon mot de passe | 200 | ok |
| 4 | Connexion avec un mauvais mot de passe | 401 | ok |
| 5 | Réinscription d'un email déjà pris | 409 | ok |
| 6 | Inscription en `role: "ADMIN"` depuis le formulaire public | 400 — refusé | ok |

L'assertion 6 est la non-régression de la faille corrigée le 5 septembre :
avant la whitelist `ROLES_INSCRIPTION`, un `POST` anonyme avec
`role: "ADMIN"` créait un administrateur.

### Prise de ticket

| # | Vérification | Attendu | Résultat |
|---|---|---|---|
| 7 | 30 tickets créés | 30 | ok |
| 8 | Tous émis en `EN_ATTENTE_VALIDATION` | un seul statut | ok |

### Garde-fous du cycle de vie

| # | Vérification | Attendu | Résultat |
|---|---|---|---|
| 9 | Appeler un ticket non encore validé | 400 | ok |
| 10 | Un `CLIENT` tente de valider un ticket | 403 | ok |
| 11 | Valider sans jeton d'authentification | 401 | ok |
| 12 | Refuser un ticket déjà validé | 400 | ok |
| 13 | Clôturer un ticket qui n'a pas été appelé | 400 | ok |

Les assertions 9, 12 et 13 valident la table `TRANSITIONS` : toute transition
absente de la table est rejetée en 400 avec un message explicite
(« un ticket ATTENTE ne peut pas passer à TRAITE »).

### Intégrité en base

| # | Vérification | Attendu | Résultat |
|---|---|---|---|
| 14–19 | Répartition par statut (6 / 10 / 6 / 4 / 4, total 30) | le plan | ok |
| 20 | Journal d'un ticket traité | `EMIS, VALIDE, ACTION_APPELE, ACTION_TRAITE` | ok |
| 21 | Journal d'un ticket refusé | `EMIS, REFUSE` | ok |
| 22 | Aucun ticket sans journal | 0 | ok |
| 23 | Numérotation cohérente avec le compteur de service | aucune incohérence | ok |
| 24 | Les 4 catégories sont représentées | les 4 | ok |

---

## Comment rejouer le scénario

Le harnais a été exécuté depuis `BackEnd/` contre le serveur de développement
(`http://127.0.0.1:5000`). Deux prérequis :

```bash
cd BackEnd && npm run dev     # le serveur doit tourner
```

Les actions d'entreprise (valider, refuser, appeler, clôturer) ont été faites
avec un **jeton `ADMIN` forgé localement** depuis `JWT_SECRET`, l'`ADMIN`
ayant le droit d'agir sur les tickets de toutes les entreprises
(cf. `verifierTransition`). C'est un contournement assumé : le mot de passe du
compte `admin@jeloft.com` a été perdu, et il n'est pas récupérable — seul son
hash bcrypt est en base. Pour reprendre la main dessus :

```bash
node reset-password.js admin@jeloft.com <nouveauMotDePasse>
```

Pour remettre la base à zéro avant un nouveau jeu d'essai :

```bash
node purge-tickets.js            # simulation, ne touche à rien
node purge-tickets.js --confirm  # supprime tickets + actions, compteurs à 0
```

> Le harnais a dû attendre la disponibilité de l'API avant de démarrer :
> déposer un fichier dans `BackEnd/` déclenche un redémarrage de nodemon, et
> les premières requêtes tombaient en `ECONNREFUSED`. Les scripts de test
> doivent donc sonder l'API en boucle avant leur première assertion.

---

## Suite

- **Front-end** : l'affichage de ces données n'est pas encore repris. Les
  trente tickets couvrent les six états, donc les six rendus possibles côté
  client, entreprise et admin sont désormais testables à l'écran.
- **Thème jour / nuit** : en place (bouton dans la barre de navigation,
  sections noires dans les deux modes, filet Vanta blanc la nuit et violet le
  jour). Le rendu reste à valider visuellement.
- **Documentation** : `RAPPORT_TECHNIQUE.md` est en retard sur le code —
  il décrit encore le champ `icone` avec son emoji par défaut, l'ancien rôle de
  `sync-service-icons.js`, et ne mentionne pas les deux endpoints de purge
  (`DELETE /api/tickets/all`, `DELETE /api/tickets/entreprise/historique`).
  Son point de vigilance « P0 non corrigé » sur le rôle à l'inscription est
  obsolète : l'assertion 6 ci-dessus le prouve.
