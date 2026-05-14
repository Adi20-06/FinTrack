const express  = require('express');
const router   = express.Router();       // Router = a mini Express app for grouping routes
const bcrypt   = require('bcryptjs');    // For hashing passwords
const jwt      = require('jsonwebtoken');
const db       = require('../db');       // Our database connection
require('dotenv').config();

// ─────────────────────────────────────────────
// ROUTE 1: POST /api/auth/register
// Called when a new user signs up
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    console.log('📩 Register request received:', req.body);
    
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    console.log('🔍 Checking if email exists...');
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Email already registered.' });
    }

    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('💾 Inserting user into database...');
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    console.log('🎟️ Creating token...');
const token = jwt.sign(
  { id: result.insertId, email },
  'myfinanceapp_super_secret_key_2026',
  { expiresIn: '7d' }
);

    console.log('✅ Registration successful!');
    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: { id: result.insertId, name, email }
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
});
// ─────────────────────────────────────────────
// ROUTE 2: POST /api/auth/login
// Called when user logs in
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user by email
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    // If no user found with that email
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Compare the password they typed with the hashed version in the DB
    // bcrypt.compare() does this safely
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Create a new token for this session
const token = jwt.sign(
  { id: user.id, email: user.email },
  'myfinanceapp_super_secret_key_2026',
  { expiresIn: '7d' }
);

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, currency: user.currency }
    });

  } catch (error) {
     console.error('Register error FULL:', error);  // Change this line
  res.status(500).json({ message: 'Server error. Please try again.'  });
  }
});

module.exports = router;