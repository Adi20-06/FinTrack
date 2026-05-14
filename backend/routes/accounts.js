const express = require('express');
const router  = express.Router();
const db      = require('../db');
const protect = require('../middleware/auth');

// GET all accounts for this user
router.get('/', protect, async (req, res) => {
  try {
    const [accounts] = await db.query(
      'SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST — Create a new account
router.post('/', protect, async (req, res) => {
  try {
    const { name, type, balance, color } = req.body;
    const [result] = await db.query(
      'INSERT INTO accounts (user_id, name, type, balance, color) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name, type || 'bank', balance || 0, color || '#6C63FF']
    );
    res.status(201).json({ message: 'Account created!', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;