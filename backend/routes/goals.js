const express = require('express');
const router  = express.Router();
const db      = require('../db');
const protect = require('../middleware/auth');

// GET all goals
router.get('/', protect, async (req, res) => {
  try {
    const [goals] = await db.query(
      'SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(goals);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST — Create a new goal
router.post('/', protect, async (req, res) => {
  try {
    const { name, target_amount, deadline, icon } = req.body;
    const [result] = await db.query(
      'INSERT INTO goals (user_id, name, target_amount, deadline, icon) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name, target_amount, deadline || null, icon || '🎯']
    );
    res.status(201).json({ message: 'Goal created!', id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PUT — Edit a goal
router.put('/:id', protect, async (req, res) => {
  try {
    const { name, target_amount, deadline, icon } = req.body;
    const userId = req.user.id;
    const goalId = req.params.id;

    const [rows] = await db.query(
      'SELECT id FROM goals WHERE id = ? AND user_id = ?',
      [goalId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Goal not found.' });
    }

    await db.query(
      `UPDATE goals SET name = ?, target_amount = ?, deadline = ?, icon = ?
       WHERE id = ? AND user_id = ?`,
      [name, target_amount, deadline || null, icon, goalId, userId]
    );
    res.json({ message: 'Goal updated!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

// PATCH /:id/contribute
// Adds money to a goal AND creates an expense transaction
// so the dashboard net savings is automatically reduced
router.patch('/:id/contribute', protect, async (req, res) => {
  const { amount, account_id } = req.body;
  const userId = req.user.id;
  const goalId = req.params.id;

  if (!amount || !account_id) {
    return res.status(400).json({ message: 'Amount and account are required.' });
  }

  // Use a DB connection so we can do multiple queries safely
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();  // Start transaction — if anything fails, roll everything back

    // 1. Fetch the goal to get its name
    const [goalRows] = await conn.query(
      'SELECT * FROM goals WHERE id = ? AND user_id = ?',
      [goalId, userId]
    );
    if (goalRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Goal not found.' });
    }
    const goal = goalRows[0];

    // 2. Update saved_amount on the goal
    const newSaved = parseFloat(goal.saved_amount) + parseFloat(amount);
    const newStatus = newSaved >= parseFloat(goal.target_amount) ? 'completed' : 'active';

    await conn.query(
      'UPDATE goals SET saved_amount = ?, status = ? WHERE id = ? AND user_id = ?',
      [newSaved, newStatus, goalId, userId]
    );

    // 3. Create an expense transaction so dashboard reflects it
    await conn.query(
      `INSERT INTO transactions (user_id, account_id, type, amount, description, date)
       VALUES (?, ?, 'expense', ?, ?, CURDATE())`,
      [userId, account_id, amount, `🎯 Goal: ${goal.name}`]
    );

    // 4. Deduct from account balance
    await conn.query(
      'UPDATE accounts SET balance = balance - ? WHERE id = ? AND user_id = ?',
      [amount, account_id, userId]
    );

    await conn.commit();  // Everything worked — save all changes
    res.json({ message: 'Contribution added!', completed: newStatus === 'completed' });

  } catch (error) {
    await conn.rollback();  // Something failed — undo everything
    console.error('Contribute error:', error);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    conn.release();  // Return connection to the pool
  }
});

// PATCH /:id/withdraw
// Removes money from a goal AND creates an income transaction
// so the dashboard net savings is automatically increased back
router.patch('/:id/withdraw', protect, async (req, res) => {
  const { amount, account_id } = req.body;
  const userId = req.user.id;
  const goalId = req.params.id;

  if (!amount || !account_id) {
    return res.status(400).json({ message: 'Amount and account are required.' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Fetch the goal
    const [goalRows] = await conn.query(
      'SELECT * FROM goals WHERE id = ? AND user_id = ?',
      [goalId, userId]
    );
    if (goalRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Goal not found.' });
    }
    const goal = goalRows[0];

    // 2. Make sure they're not withdrawing more than what's saved
    if (parseFloat(amount) > parseFloat(goal.saved_amount)) {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot withdraw more than saved amount (₹${goal.saved_amount}).` });
    }

    // 3. Update saved_amount and set status back to active if needed
    const newSaved = parseFloat(goal.saved_amount) - parseFloat(amount);
    await conn.query(
      'UPDATE goals SET saved_amount = ?, status = IF(? < target_amount, "active", status) WHERE id = ? AND user_id = ?',
      [newSaved, newSaved, goalId, userId]
    );

    // 4. Create an income transaction so dashboard reflects it
    await conn.query(
      `INSERT INTO transactions (user_id, account_id, type, amount, description, date)
       VALUES (?, ?, 'income', ?, ?, CURDATE())`,
      [userId, account_id, amount, `↩️ Goal Withdrawal: ${goal.name}`]
    );

    // 5. Add back to account balance
    await conn.query(
      'UPDATE accounts SET balance = balance + ? WHERE id = ? AND user_id = ?',
      [amount, account_id, userId]
    );

    await conn.commit();
    res.json({ message: 'Withdrawal successful!' });

  } catch (error) {
    await conn.rollback();
    console.error('Withdraw error:', error);
    res.status(500).json({ message: 'Server error.' });
  } finally {
    conn.release();
  }
});

// DELETE — Delete a goal
router.delete('/:id', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;

    const [rows] = await db.query(
      'SELECT id FROM goals WHERE id = ? AND user_id = ?',
      [goalId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Goal not found.' });
    }

    await db.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
    res.json({ message: 'Goal deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;