import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';

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

export default router;