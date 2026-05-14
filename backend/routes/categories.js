const express = require('express');
const router  = express.Router();
const db      = require('../db');
const protect = require('../middleware/auth');

// GET /api/categories — return all categories
router.get('/', protect, async (req, res) => {
  try {
    const [categories] = await db.query(
      'SELECT * FROM categories ORDER BY type, name'
    );
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;