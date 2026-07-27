import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import { SpotifyConnector } from '../core/music-connectors/spotifyConnector';

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';

const spotifyConnector = new SpotifyConnector(
  process.env.SPOTIFY_CLIENT_ID || '',
  process.env.SPOTIFY_CLIENT_SECRET || ''
);

const SPOTIFY_CALLBACK_URL = process.env.SPOTIFY_CALLBACK_URL || 'http://localhost:4000/auth/spotify/callback';

router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Vérifier si l'utilisateur existe déjà
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    // Hash le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Insérer l'utilisateur
    await query(
      'INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)',
      [userId, email, username, passwordHash]
    );

    // Générer JWT
    const token = jwt.sign({ id: userId, email }, SECRET_KEY, { expiresIn: '30d' });

    res.status(201).json({
      message: 'User created successfully',
      user: { id: userId, email, username },
      token
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    // Récupérer l'utilisateur
    const result = await query(
      'SELECT id, email, username, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Générer JWT
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '30d' });

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, username: user.username },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Spotify OAuth Routes
router.get('/spotify/authorize', (req, res) => {
  try {
    const state = uuidv4();
    const authorizeUrl = spotifyConnector.getAuthorizeUrl(state, SPOTIFY_CALLBACK_URL);

    // Store state in session for later verification (in production, use session store)
    res.redirect(authorizeUrl);
  } catch (error) {
    console.error('Spotify authorize error:', error);
    res.status(500).json({ error: 'Failed to initiate Spotify authorization' });
  }
});

router.get('/spotify/callback', async (req, res) => {
  const { code, error, state } = req.query;

  try {
    if (error) {
      return res.status(400).json({ error: `Spotify authorization failed: ${error}` });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Exchange code for token
    const tokenData = await spotifyConnector.exchangeCodeForToken(code, SPOTIFY_CALLBACK_URL);

    // Get user profile from Spotify
    const userProfile = await spotifyConnector.getUserProfile(tokenData.accessToken);

    // Store Spotify data temporarily and redirect to frontend
    // Frontend will send these tokens with user's JWT to associate
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const spotifyData = encodeURIComponent(JSON.stringify({
      spotify_id: userProfile.id,
      spotify_access_token: tokenData.accessToken,
      spotify_refresh_token: tokenData.refreshToken,
      spotify_expires_at: new Date(Date.now() + tokenData.expiresIn * 1000).toISOString(),
    }));

    res.redirect(`${frontendUrl}/?spotify_data=${spotifyData}`);
    return;

  } catch (error) {
    console.error('Spotify callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/?spotify_error=authorization_failed`);
  }
});

// Get user's Spotify playlists
router.get('/spotify/playlists', async (req, res) => {
  try {
    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    const token = authHeader.slice(7);

    // Verify and decode JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.id;

    // Get user's Spotify tokens from database
    const result = await query(
      'SELECT spotify_access_token, spotify_refresh_token, spotify_expires_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].spotify_access_token) {
      return res.status(400).json({ error: 'Spotify not connected' });
    }

    const spotifyAccessToken = result.rows[0].spotify_access_token;

    // Fetch playlists from Spotify
    const playlists = await spotifyConnector.getUserPlaylists(spotifyAccessToken, 50);

    res.json({
      playlists: playlists.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        image: p.images?.[0]?.url,
      }))
    });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Associate Spotify to currently logged-in user
router.post('/spotify/associate', async (req, res) => {
  try {
    const { spotify_id, spotify_access_token, spotify_refresh_token, spotify_expires_at } = req.body;

    // Get JWT token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    const token = authHeader.slice(7);

    // Verify and decode JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, SECRET_KEY);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.id;

    // Update user with Spotify data
    await query(
      `UPDATE users
       SET spotify_id = $1,
           spotify_access_token = $2,
           spotify_refresh_token = $3,
           spotify_expires_at = $4,
           updated_at = NOW()
       WHERE id = $5`,
      [spotify_id, spotify_access_token, spotify_refresh_token, spotify_expires_at, userId]
    );

    res.json({
      message: 'Spotify account associated successfully',
      spotify_id,
      user_id: userId
    });
  } catch (error) {
    console.error('Spotify association error:', error);
    res.status(500).json({ error: 'Failed to associate Spotify account' });
  }
});

export default router;