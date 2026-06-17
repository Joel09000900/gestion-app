# 🚀 Déploiement de Jeloft (hébergement gratuit)

Checklist pas-à-pas pour mettre Jeloft en ligne. Architecture :

| Brique | Hébergeur | URL obtenue (exemple) |
|---|---|---|
| Base de données | **NeonDB** (déjà en place) | — |
| Backend (Express + Socket.io + Prisma) | **Render** — Web Service free | `https://jeloft-api.onrender.com` |
| Frontend (React CRA) | **Vercel** — free | `https://jeloft.vercel.app` |

> ⚠️ **Pourquoi pas tout sur Vercel ?** Le backend utilise **Socket.io** (WebSocket persistant) : impossible en serverless. Il lui faut un vrai process Node → Render (ou Koyeb).

---

## 0. Prérequis — pousser le code sur GitHub

Le projet doit être sur GitHub (Render et Vercel déploient depuis un repo git).

```bash
cd jeloft
git init
git add .
git commit -m "Prep hébergement"
git remote add origin https://github.com/<utilisateur>/jeloft.git
git branch -M main
git push -u origin main
```

✅ **Avant de committer**, vérifier que `git status` ne montre **aucun fichier `.env`** (seulement les `.env.example`). Les secrets (mot de passe Neon, JWT) ne doivent JAMAIS être sur GitHub — ils se mettent dans les dashboards d'hébergement.

---

## 1. Backend → Render

1. [render.com](https://render.com) → **New** → **Web Service** → connecter le repo GitHub.
2. Réglages :
   - **Root Directory** : `BackEnd`
   - **Build Command** : `npm install`  *(le `postinstall` lance `prisma generate` automatiquement)*
   - **Start Command** : `npm start`
   - **Instance Type** : Free
3. **Environment Variables** :

   | Clé | Valeur |
   |---|---|
   | `DATABASE_URL` | la chaîne de connexion NeonDB |
   | `JWT_SECRET` | une **nouvelle** chaîne aléatoire forte (`openssl rand -hex 32`) |
   | `CLIENT_URL` | (provisoire) `http://localhost:3000` — sera mis à jour à l'étape 3 |

   *(ne pas définir `PORT` : Render l'injecte, et le code lit `process.env.PORT`.)*
4. **Create Web Service** → attendre le build. Noter l'URL : `https://<nom>.onrender.com`.
5. Test : ouvrir `https://<nom>.onrender.com/api/health` → doit renvoyer `{"status":"ok"}`.

---

## 2. Frontend → Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → importer le repo.
2. Réglages :
   - **Root Directory** : `FrontEnd`
   - Framework : **Create React App** (détecté automatiquement)
3. **Environment Variables** :

   | Clé | Valeur |
   |---|---|
   | `REACT_APP_API_URL` | `https://<nom>.onrender.com/api` |
   | `REACT_APP_SOCKET_URL` | `https://<nom>.onrender.com` |
   | `DISABLE_ESLINT_PLUGIN` | `true` |

4. **Deploy** → noter l'URL : `https://<projet>.vercel.app`.

---

## 3. Boucler le CORS

Retourner sur **Render** → Environment → mettre :

```
CLIENT_URL = https://<projet>.vercel.app
```

→ **Manual Deploy / Save** (Render redéploie). Sans ça, le navigateur bloque les appels API et le socket (erreur CORS).

---

## 4. Vérification finale

1. Ouvrir l'URL Vercel.
2. Créer un compte **entreprise** (choisir un type) → se connecter → le dashboard apparaît.
3. Dans un autre onglet, compte **client** → prendre un ticket sur ce type.
4. Côté entreprise : le ticket arrive en temps réel (socket) → valider → côté client la position se met à jour.

Si le temps réel marche entre deux onglets : **tout est bon.**

---

## ⚠️ Pièges connus

| Symptôme | Cause / solution |
|---|---|
| Le build Vercel échoue sur des warnings | `DISABLE_ESLINT_PLUGIN=true` doit être dans les env vars Vercel (CRA + `CI=true` transforment les warnings en erreurs). |
| Premier accès très lent (~50 s) | **Cold start** Render free : le service s'endort après 15 min. Pour la démo : ouvrir l'URL ~1 min avant, ou créer un ping **UptimeRobot** (gratuit) toutes les 10 min sur `/api/health`. |
| Erreur CORS dans la console | `CLIENT_URL` (Render) ≠ URL réelle du front. Corriger et redéployer. |
| `PrismaClientInitializationError` au démarrage | `prisma generate` non exécuté → vérifier le `postinstall`, ou Build Command = `npm install && npx prisma generate`. |
| 404 en rafraîchissant une page (ex. `/DashbordClient`) | Routing SPA : `vercel.json` (Vercel) ou `public/_redirects` (Netlify) doit être présent — ils le sont déjà. |
| Socket ne se connecte pas | Vérifier `REACT_APP_SOCKET_URL` (sans `/api`) et que Render n'a pas bloqué les WebSocket (OK par défaut). |

---

## Variante : Netlify au lieu de Vercel

Même principe (Root `FrontEnd`, Build `npm run build`, Publish `build`, mêmes env vars). Le fichier `public/_redirects` gère déjà le routing SPA.

## Variante : Koyeb au lieu de Render

[koyeb.com](https://koyeb.com) — service web free qui **ne s'endort pas** (pas de cold start). Mêmes réglages que Render (Root `BackEnd`, build/start identiques, mêmes env vars).

---

## Rappel — changement de schéma Prisma

Render n'exécute **pas** de migration. Si tu modifies `schema.prisma`, lance **en local** :

```bash
cd BackEnd
npx prisma db push      # applique le schéma sur NeonDB
npx prisma generate     # régénère le client (backend arrêté sous Windows)
```
puis commit + push (le redeploy reprendra le client à jour).
