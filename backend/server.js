require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes        = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes      = require('./routes/budgets');
const goalRoutes        = require('./routes/goals');
const accountRoutes     = require('./routes/accounts');
const categoryRoutes    = require('./routes/categories');
const analyticsRoutes   = require('./routes/analytics');  // NEW

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth',         authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets',      budgetRoutes);
app.use('/api/goals',        goalRoutes);
app.use('/api/accounts',     accountRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/analytics',    analyticsRoutes);  // NEW

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Finance Tracker API is running!' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});