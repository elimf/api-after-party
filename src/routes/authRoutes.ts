import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { supabase } from '../../server';


const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';

router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;

  try {
    // 1. Vérifier si l'utilisateur existe déjà (email ou username)
    const { data: existingUser, error: searchError } = await supabase
      .from('users')
      .select('email, username')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    // 2. Hasher le mot de passe manuellement
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Insérer dans Supabase
    const { data, error: insertError } = await supabase
      .from('users')
      .insert([{ email, username, password: hashedPassword }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.status(201).json({ message: 'Utilisateur créé avec succès', userId: data.id });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création', error });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Récupérer l'utilisateur par email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    // 2. Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    // 3. Générer le Token (On utilise l'ID UUID de Supabase)
    const token = jwt.sign({ userId: user.uuid }, SECRET_KEY, { expiresIn: '9999y' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la connexion', error });
  }
});

export default router;