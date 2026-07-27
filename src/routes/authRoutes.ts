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
  const { code, error } = req.query;

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

    // Check if user already exists
    const existingUser = await query(
      'SELECT id, email, username FROM users WHERE spotify_id = $1',
      [userProfile.id]
    );

    let userId: string;
    let token: string;

    if (existingUser.rows.length > 0) {
      // Update existing user with new token
      userId = existingUser.rows[0].id;

      const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

      await query(
        `UPDATE users
         SET spotify_access_token = $1,
             spotify_refresh_token = $2,
             spotify_expires_at = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [tokenData.accessToken, tokenData.refreshToken || null, expiresAt, userId]
      );
    } else {
      // Create new user
      userId = uuidv4();
      const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000);

      await query(
        `INSERT INTO users (id, email, username, spotify_id, spotify_access_token, spotify_refresh_token, spotify_expires_at, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          userProfile.external_urls?.spotify || `spotify-${userProfile.id}@example.com`,
          userProfile.display_name || `spotify_${userProfile.id}`,
          userProfile.id,
          tokenData.accessToken,
          tokenData.refreshToken || null,
          expiresAt,
          'spotify-oauth' // Placeholder, user authenticated via Spotify
        ]
      );
    }

    // Generate JWT token for our app
    token = jwt.sign({ id: userId, email: userProfile.id }, SECRET_KEY, { expiresIn: '30d' });

    // Redirect to frontend with token in query string
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login?token=${token}&spotify_user=${userProfile.display_name}`);
  } catch (error) {
    console.error('Spotify callback error:', error);
    res.status(500).json({ error: 'Spotify authentication failed' });
  }
});

export default router;