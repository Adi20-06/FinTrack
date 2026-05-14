const express = require('express');
const router  = express.Router();
const db      = require('../db');
const protect = require('../middleware/auth');

// GET /api/analytics/monthly?year=2026
// Returns 12 months of income vs expense for line chart
router.get('/monthly', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const year   = req.query.year || new Date().getFullYear();

    const [rows] = await db.query(
      `SELECT 
        MONTH(date)      AS month,
        type,
        SUM(amount)      AS total
       FROM transactions
       WHERE user_id = ? AND YEAR(date) = ?
       GROUP BY MONTH(date), type
       ORDER BY month`,
      [userId, year]
    );

    // Build array of 12 months, fill in zeros for missing months
    const months = Array.from({ length: 12 }, (_, i) => ({
      month:   i + 1,
      income:  0,
      expense: 0,
    }));

    rows.forEach(row => {
      const idx = row.month - 1;
      months[idx][row.type] = parseFloat(row.total);
    });

    res.json(months);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/analytics/categories?month=4&year=2026
// Category breakdown for pie/bar charts
router.get('/categories', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;

    const [rows] = await db.query(
      `SELECT 
        c.name, c.icon, c.color,
        SUM(t.amount) AS total
       FROM transactions t
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
         AND t.type = 'expense'
         AND MONTH(t.date) = ?
         AND YEAR(t.date)  = ?
       GROUP BY c.id
       ORDER BY total DESC`,
      [userId, month, year]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/analytics/yearly?year1=2025&year2=2026
// Year over year comparison
router.get('/yearly', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const year1  = req.query.year1 || new Date().getFullYear() - 1;
    const year2  = req.query.year2 || new Date().getFullYear();

    const fetchYear = async (year) => {
      const [rows] = await db.query(
        `SELECT MONTH(date) AS month, type, SUM(amount) AS total
         FROM transactions
         WHERE user_id = ? AND YEAR(date) = ?
         GROUP BY MONTH(date), type`,
        [userId, year]
      );
      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1, income: 0, expense: 0,
      }));
      rows.forEach(r => { months[r.month - 1][r.type] = parseFloat(r.total); });
      return months;
    };

    const [data1, data2] = await Promise.all([fetchYear(year1), fetchYear(year2)]);
    res.json({ year1: { year: year1, data: data1 }, year2: { year: year2, data: data2 } });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/analytics/summary
// All-time totals + net worth
router.get('/summary', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const [[totals]] = await db.query(
      `SELECT
        SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS total_income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense,
        COUNT(*) AS total_transactions
       FROM transactions WHERE user_id = ?`,
      [userId]
    );

    const [[netWorth]] = await db.query(
      `SELECT SUM(balance) AS net_worth FROM accounts WHERE user_id = ?`,
      [userId]
    );

    res.json({
      total_income:       parseFloat(totals.total_income  || 0),
      total_expense:      parseFloat(totals.total_expense || 0),
      total_transactions: totals.total_transactions,
      net_worth:          parseFloat(netWorth.net_worth   || 0),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;