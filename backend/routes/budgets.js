const express = require('express');
const router  = express.Router();
const db      = require('../db');
const protect = require('../middleware/auth');

// GET /api/budgets?month=4&year=2026
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const [budgets] = await db.query(
      `SELECT 
        b.id, b.amount AS budget_limit, b.month, b.year,
        c.name AS category_name, c.icon, c.color,
        COALESCE(
          (SELECT SUM(t.amount) 
           FROM transactions t 
           WHERE t.user_id = b.user_id 
             AND t.category_id = b.category_id
             AND t.type = 'expense'
             AND MONTH(t.date) = b.month 
             AND YEAR(t.date)  = b.year),
          0
        ) AS spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.month = ? AND b.year = ?`,
      [userId, month, year]
    );
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/budgets — Create or update
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, amount, month, year } = req.body;

    await db.query(
      `INSERT INTO budgets (user_id, category_id, amount, month, year)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      [userId, category_id, amount, month, year]
    );
    res.status(201).json({ message: 'Budget saved!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT /api/budgets/:id — Edit a budget's amount
router.put('/:id', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const userId     = req.user.id;
    const budgetId   = req.params.id;

    // Make sure this budget belongs to the logged-in user
    const [rows] = await db.query(
      'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
      [budgetId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Budget not found.' });
    }

    await db.query(
      'UPDATE budgets SET amount = ? WHERE id = ? AND user_id = ?',
      [amount, budgetId, userId]
    );
    res.json({ message: 'Budget updated!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// DELETE /api/budgets/:id — Delete a budget
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId   = req.user.id;
    const budgetId = req.params.id;

    const [rows] = await db.query(
      'SELECT id FROM budgets WHERE id = ? AND user_id = ?',
      [budgetId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Budget not found.' });
    }

    await db.query(
      'DELETE FROM budgets WHERE id = ? AND user_id = ?',
      [budgetId, userId]
    );
    res.json({ message: 'Budget deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;