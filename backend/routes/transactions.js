const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const protect  = require('../middleware/auth');  // Our security guard

// All routes here are PROTECTED — user must be logged in
// We apply the "protect" middleware to all routes in this file

// ─────────────────────────────────────────────
// ROUTE 1: GET /api/transactions
// Get all transactions for the logged-in user
// ─────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    // req.user.id = the user's ID from the JWT token (set by our middleware)
    const userId = req.user.id;

    // Optional filters from query string
    // e.g. /api/transactions?month=4&year=2026&type=expense
    const { month, year, type, category_id, limit = 50 } = req.query;

    // Build the query dynamically based on what filters were sent
    let query = `
      SELECT 
        t.id, t.type, t.amount, t.description, t.date, t.notes,
        c.name AS category_name, c.icon AS category_icon, c.color AS category_color,
        a.name AS account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ?
    `;
    // "?" is a parameter placeholder. We collect values in this array:
    const params = [userId];

    // Add optional filters only if they were provided
    if (month) { query += ' AND MONTH(t.date) = ?'; params.push(month); }
    if (year)  { query += ' AND YEAR(t.date) = ?';  params.push(year);  }
    if (type)  { query += ' AND t.type = ?';         params.push(type);  }
    if (category_id) { query += ' AND t.category_id = ?'; params.push(category_id); }

    // Order newest first, limit results
    query += ' ORDER BY t.date DESC LIMIT ?';
    params.push(parseInt(limit));

    const [transactions] = await db.query(query, params);
    res.json(transactions);

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// ROUTE 2: POST /api/transactions
// Add a new transaction
// ─────────────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { account_id, category_id, type, amount, description, date, notes } = req.body;

    // Validate required fields
    if (!account_id || !type || !amount || !date) {
      return res.status(400).json({ message: 'account_id, type, amount, and date are required.' });
    }

    // Insert the transaction
    const [result] = await db.query(
      `INSERT INTO transactions 
       (user_id, account_id, category_id, type, amount, description, date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, account_id, category_id || null, type, amount, description || '', date, notes || '']
    );

    // Update the account balance automatically
    // If income → add to balance. If expense → subtract from balance.
    const balanceChange = type === 'income' ? amount : -amount;
    await db.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [balanceChange, account_id, userId]
    );

    res.status(201).json({ message: 'Transaction added!', id: result.insertId });

  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// ROUTE 3: DELETE /api/transactions/:id
// Delete a transaction by its ID
// ─────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const txId   = req.params.id;  // req.params = values from the URL (the :id part)

    // First fetch the transaction to reverse the balance change
    const [rows] = await db.query(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?',
      [txId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const tx = rows[0];

    // Reverse the balance update
    const balanceChange = tx.type === 'income' ? -tx.amount : tx.amount;
    await db.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [balanceChange, tx.account_id]
    );

    // Now delete the transaction
    await db.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [txId, userId]);

    res.json({ message: 'Transaction deleted.' });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// ─────────────────────────────────────────────
// ROUTE 4: GET /api/transactions/summary
// Get income/expense totals for dashboard cards
// ─────────────────────────────────────────────
router.get('/summary', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    // ── QUERY 1 ──────────────────────────────────────────────────────────────
    // Get total income and total expense for this month
    // GROUP BY type means we get one row for "income" and one row for "expense"
    const [rows] = await db.query(
      `SELECT 
        type,
        SUM(amount) AS total          -- SUM adds up all amounts grouped by type
       FROM transactions
       WHERE user_id = ?
         AND MONTH(date) = ?
         AND YEAR(date)  = ?
       GROUP BY type`,               
      [userId, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
    );

    // Convert array of rows into a clean object
    // e.g. [ {type:'income', total:50000}, {type:'expense', total:20000} ]
    // becomes → { income: 50000, expense: 20000 }
    const summary = { income: 0, expense: 0 };
    rows.forEach(row => { summary[row.type] = parseFloat(row.total); });
    summary.savings = summary.income - summary.expense;
    // At this point savings = income - ALL expenses (including goal contributions)
    // That is correct — money sent to goals IS money leaving your savings

    // ── QUERY 2 (NEW) ────────────────────────────────────────────────────────
    // Find how much of this month's expenses specifically went to goals.
    // We identify goal contributions by their description starting with "Goal:"
    // e.g. "Goal: Trip to Goa", "Goal: New Laptop"
    // COALESCE means: if SUM is NULL (no rows found), return 0 instead of NULL
    const [[goalRow]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS goal_contributions
       FROM transactions
       WHERE user_id = ?
         AND type = 'expense'
         AND description LIKE 'Goal:%'
         AND MONTH(date) = ?
         AND YEAR(date)  = ?`,
      [userId, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
    );
    // [[goalRow]] — the double destructure is because db.query returns [rows, fields]
    // and we only have 1 row here, so we grab it directly

    // ── SEND RESPONSE ────────────────────────────────────────────────────────
    // Now we send back 4 numbers instead of 3:
    // income, expense, savings (= income - expense), goal_contributions (subset of expense)
    res.json({
      income:             summary.income,
      expense:            summary.expense,
      savings:            summary.savings,
      goal_contributions: parseFloat(goalRow.goal_contributions), // ← NEW
    });

  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/transactions/report?from_date=&to_date=&category_id=
router.get('/report', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { from_date, to_date, category_ids } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({ message: 'from_date and to_date are required.' });
    }

    let query = `
      SELECT 
        t.id, t.type, t.amount, t.description, t.date,
        c.name AS category_name, c.icon AS category_icon,
        a.name AS account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      WHERE t.user_id = ?
        AND DATE(t.date) >= ? 
        AND DATE(t.date) <= ?
    `;
    const params = [userId, from_date, to_date];

    // category_ids comes as "1,2,3" — split into array
    if (category_ids) {
      const idArray = category_ids.split(',').map(id => parseInt(id));
      query += ` AND t.category_id IN (${idArray.map(() => '?').join(',')})`;
      params.push(...idArray);
    }

    query += ' ORDER BY t.date DESC';

    const [transactions] = await db.query(query, params);

    const summary = { income: 0, expense: 0, savings: 0 };
    transactions.forEach(t => {
      if (t.type === 'income') summary.income += parseFloat(t.amount);
      else summary.expense += parseFloat(t.amount);
    });
    summary.savings = summary.income - summary.expense;

    const categoryMap = {};
    transactions.forEach(t => {
      const name = t.category_name || 'Uncategorized';
      if (!categoryMap[name]) categoryMap[name] = 0;
      categoryMap[name] += parseFloat(t.amount);
    });
    const categoryData = Object.entries(categoryMap).map(([name, total]) => ({ name, total }));

    res.json({ transactions, summary, categoryData });

  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;