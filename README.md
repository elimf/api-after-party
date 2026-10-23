# After Party - API Backend

Serveur Express + WebSocket en TypeScript pour le jeu multijoueur **After Party**. Il constitue le cœur du système : moteur de jeu, gestion des salons, calcul des scores, et intégration musicale.

Ce projet fait partie du monorepo `game/` avec [`after-party`](../after-party) en frontend.

## 🎮 Fonctionnalités

| Module | Description |
|---|---|
| **Authentification** | Inscription/connexion via JWT, hachage des mots de passe avec bcryptjs. |
| **Salons temps-réel** | Création/rejoindre/quitter des salons, synchronisation des utilisateurs, chat. |
| **Quiz Classique** | Génération de questions depuis `questions/`, minuterie, attribution de points selon rapidité, fin de partie et classement. |
| **Blindtest (iTunes)** | Récupération d'extraits audio 30s via [iTunes Search API](https://affiliate.itunes.apple.com/resources/documentation/itunes-store-web-service-search-api/) (sans clé). Configuration par artistes prédéfinis, genre, pays ou thème/playlist. Génération automatique de QCM avec distracteurs. |
| **Petit Bac** | Lettre aléatoire, saisie des réponses par catégorie, fin de manche à l'unanimité ou timeout, validation automatique, détection de réponses identiques, calcul des points. |

## 🛠 Stack technique

| Outil | Usage |
|---|---|
| [Node.js](https://nodejs.org/) + [TypeScript](https://www.typescriptlang.org/) | Runtime & typage |
| [Express](https://expressjs.com/) | API REST |
| [ws](https://github.com/websockets/ws) | Serveur WebSocket |
| [PostgreSQL](https://www.postgresql.org/) (compatible [Neon](https://neon.tech/)) | Base de données |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | Authentification JWT |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Hachage mots de passe |
| [axios](https://axios-http.com/) | Appels vers APIs externes (iTunes) |
| [cors](https://github.com/expressjs/cors) | CORS |

## 📁 Architecture

```text
api-after-party/
├── server.ts                # Point d'entrée (Express + HTTP + WebSocket, init DB)
├── src/
│   ├── core/
│   │   ├── game-engine/     # Moteur de jeu isolé (Quiz, Blindtest)
│   │   ├── music-connectors/# Connecteurs musique (iTunes)
│   │   ├── realtime-room/   # Gestion des salons et utilisateurs connectés
│   │   └── shared/          # Logique partagée
│   ├── handlers/            # Handlers WebSocket par domaine
│   │   ├── websocketHandlers.ts # Orchestration/routage des messages
│   │   ├── roomHandler.ts       # Salons
│   │   ├── quizHandler.ts       # Quiz/Blindtest
│   │   └── bacGameHandler.ts    # Petit Bac
│   ├── routes/              # Routes REST (auth, health)
│   ├── db/                  # Pool PostgreSQL, migrations, init
│   ├── types/               # Types partagés (contrat WebSocket/API)
│   └── utils/               # Utilitaires
└── questions/               # Questions JSON pour le Quiz Classique
```

**Principes** : logique métier isolée dans `core/` (game-engine), handlers WebSocket découplés, types centralisés dans `src/types/index.ts`.

## 🔌 Contrat WebSocket

Le contrat est défini dans [`src/types/index.ts`](src/types/index.ts). Il est **critique** : avant tout changement de message/état, vérifier l'impact côté frontend ([`after-party/src/hooks/useWebSocket.js`](../after-party/src/hooks/useWebSocket.js)).

Types principaux :
- `UserConncted`, `Room`, `Message`
- `Quiz`, `Question`, `QuizResults`, `UserResult`
- `BacGame`, `BacPhase`, `BacResponse`, `BacRoundSummary`, `BacCategorySummary`, `BacRanking`

Les **bonnes réponses** ne sont jamais envoyées aux joueurs avant la fin du temps imparti. **Le calcul des points est exclusivement côté serveur**.

## 🚀 Démarrage rapide

### Prérequis

- Node.js >= 16
- PostgreSQL (local ou [Neon](https://neon.tech/))

### Installation

```bash
npm install
```

### Configuration

Créez un fichier `.env` à la racine :

```env
PORT=3000
FRONTEND_URL=http://localhost:3001
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=postgresql://user:password@host:port/database
```

### Base de données

```bash
# Initialiser/migrer la base de données
npm run migrate
```

### Lancement

```bash
# Développement (ts-node-dev)
npm run start:dev

# Production
npm start

# Build TypeScript (vérifie le typage)
npm run build
```

Le serveur est accessible sur [http://localhost:3000](http://localhost:3000) et le WebSocket sur le même port.

### Endpoints REST

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/auth/register` | Inscription |
| `POST` | `/auth/login` | Connexion (retourne un token JWT) |

## 🎵 Blindtest - Intégration iTunes

L'API iTunes Search est utilisée sans authentification :
- Endpoint : `https://itunes.apple.com/search`
- Paramètres typiques : `term`, `entity=song`, `limit`, `country`
- Utilisation des `previewUrl` (extraits 30s) pour le lecteur côté frontend
- Génération de QCM avec distracteurs à partir des résultats

## 🧭 Règles de développement

1. **Analyse transversale** : Avant modification, vérifier le contrat dans `src/types/index.ts` et l'impact sur `after-party/src/hooks/useWebSocket.js`.
2. **Backend first** : Appliquer les changements côté `api-after-party` en premier. Exécuter `npm run build` pour s'assurer qu'il n'y a aucune erreur TypeScript.
3. **Frontend second** : Mettre à jour formulaires/composants dans `after-party` en fonction du nouveau contrat.
4. **Sécurité** : Ne jamais exposer les bonnes réponses avant la fin du temps imparti. Tout calcul de score doit rester côté serveur.
5. **Modularité** : Isoler la logique du jeu dans `core/game-engine/`, séparer handlers WS et routes REST.
6. **Pas de migration non justifiée** : Ne pas modifier le schéma DB sans proposer une migration propre.
