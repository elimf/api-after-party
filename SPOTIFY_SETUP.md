# Spotify Web Playback SDK Setup

## Requis

1. **Compte Spotify Premium** - Le Web Playback SDK nécessite un compte Premium actif
2. **Spotify Developer App** - Configuré avec vos Client ID et Client Secret
3. **Scope OAuth approprié** - Incluez `streaming` dans les scopes

## Configuration

### Scopes OAuth
```
playlist-read-private
playlist-read-collaborative
streaming
user-read-private
user-read-email
```

### Variables d'environnement backend
```
SPOTIFY_CLIENT_ID=votre_client_id
SPOTIFY_CLIENT_SECRET=votre_client_secret
SPOTIFY_CALLBACK_URL=http://localhost:4000/auth/spotify/callback
```

## Flux Blindtest avec Spotify

1. **User Playlist Selection** → Backend récupère les tracks via `/playlists/{id}/tracks`
2. **Track URIs** → Les questions contiennent `spotifyUri` au lieu de `mediaUrl`
3. **Web Playback SDK** → Frontend initialise le lecteur avec le token Spotify
4. **Playback** → Chaque question joue la piste pendant 30 secondes via le SDK

## Limitations

### 🎵 Spotify Premium Requis
- Le Web Playback SDK ne peut jouer de la musique que si l'utilisateur a un compte Spotify Premium
- Les utilisateurs Free verront un message d'erreur: "Spotify Premium requis"

### 🔗 Redirection Spotify
- L'utilisateur est redirigé vers Spotify pour l'authentification OAuth
- Le callback retourne `spotifyId` et les tokens d'accès

### ⏱️ Durée d'écoute
- Chaque piste joue automatiquement pendant 30 secondes
- La musique s'arrête quand le timer s'écoule

## Tester Localement

1. Démarrez le backend: `npm run dev`
2. Démarrez le frontend: `npm start`
3. Connectez-vous à Spotify via le bouton "Mes playlists Spotify"
4. Sélectionnez une playlist et démarrez un Blindtest

## Architecture

```
Frontend (React)
  ├─ useSpotifyAuth → État d'authentification
  ├─ useSpotifyPlayer → Gestion du Web Playback SDK
  └─ QuizQuestion → Affichage et playback

Backend (Node.js/Express)
  ├─ /auth/spotify/authorize → Redirection OAuth
  ├─ /auth/spotify/callback → Échange de code pour token
  ├─ /auth/spotify/token → Récupère le token actuel (avec refresh)
  ├─ /auth/spotify/playlists → Liste les playlists de l'utilisateur
  └─ /auth/spotify/associate → Associe Spotify au compte utilisateur
```
