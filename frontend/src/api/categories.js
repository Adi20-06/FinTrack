const express = require('express');
const router  = express.Router();
const db      = require('../db');
const protect = require('../middleware/auth');

// Get all categories (system + user's own)
router.get('/', protect, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY type, name',
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;