require('dotenv').config();

const express = require('express');
const cors    = require('cors');

// Import rate limiters
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');

const authRoutes        = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const budgetRoutes      = require('./routes/budgets');
const goalRoutes        = require('./routes/goals');
const accountRoutes     = require('./routes/accounts');
const categoryRoutes    = require('./routes/categories');
const analyticsRoutes   = require('./routes/analytics');

const app = express();

app.use(cors({
  origin:      process.env.FRONTEND_URL || '*',
  credentials: true,
}));

app.use(express.json());

// ── APPLY GENERAL LIMITER TO ALL ROUTES ──────────────
// This runs before every single request
app.use(generalLimiter);

// ── APPLY STRICT AUTH LIMITER TO LOGIN/REGISTER ──────
// This runs BEFORE the auth routes, adding an extra layer
app.use('/api/auth/login',    authLimiter);
app.use('/api/auth/register', authLimiter);

// ── ROUTES ────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets',      budgetRoutes);
app.use('/api/goals',        goalRoutes);
app.use('/api/accounts',     accountRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/analytics',    analyticsRoutes);

// ── HEALTH CHECK ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Finance Tracker API is running!' });
});

// ── 404 HANDLER ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// ── START SERVER ──────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;