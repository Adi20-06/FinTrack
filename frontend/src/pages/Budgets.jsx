import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import './Budgets.css';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const Budgets = () => {
  const now = new Date();
  const [budgets,    setBudgets]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [year,       setYear]       = useState(now.getFullYear());

  // Which budget is currently being edited? (stores its id)
  const [editingId,  setEditingId]  = useState(null);
  // The new amount typed in the edit input
  const [editAmount, setEditAmount] = useState('');

  const [form, setForm] = useState({ category_id: '', amount: '' });

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [month, year]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/budgets?month=${month}&year=${year}`);
      setBudgets(res.data);
    } catch (err) {
      toast.error('Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data.filter(c => c.type === 'expense'));
    } catch (err) { console.error(err); }
  };

  // ── CREATE ──────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/budgets', { ...form, month, year });
      toast.success('Budget saved!');
      setShowForm(false);
      setForm({ category_id: '', amount: '' });
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save budget.');
    }
  };

  // ── EDIT ─────────────────────────────────────────────
  // When user clicks the pencil icon, open inline edit for that card
  const startEdit = (budget) => {
    setEditingId(budget.id);
    setEditAmount(budget.budget_limit);  // Pre-fill with current amount
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
  };

  const handleEdit = async (id) => {
    if (!editAmount || editAmount <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }
    try {
      await api.put(`/budgets/${id}`, { amount: editAmount });
      toast.success('Budget updated!');
      cancelEdit();
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update budget.');
    }
  };

  // ── DELETE ───────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this budget?')) return;
    try {
      await api.delete(`/budgets/${id}`);
      toast.success('Budget deleted.');
      fetchBudgets();
    } catch (err) {
      toast.error('Failed to delete budget.');
    }
  };

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const totalBudget = budgets.reduce((s, b) => s + parseFloat(b.budget_limit), 0);
  const totalSpent  = budgets.reduce((s, b) => s + parseFloat(b.spent || 0),   0);

  return (
    <div className="budgets-page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-sub">Set spending limits for each category</p>
        </div>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={15}/> Set Budget
        </button>
      </div>

      {/* MONTH SELECTOR */}
      <div className="card filters-card">
        <div className="filters-row">
          <div className="form-group">
            <label>Month</label>
            <select value={month} onChange={e => setMonth(e.target.value)}>
              {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Year</label>
            <select value={year} onChange={e => setYear(e.target.value)}>
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ADD BUDGET FORM */}
      {showForm && (
        <div className="card form-card">
          <h3 className="form-title">New Budget</h3>
          <form onSubmit={handleSave} className="budget-form">
            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category_id}
                onChange={e => setForm({...form, category_id: e.target.value})}
                required
              >
                <option value="">Select category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Budget Limit (₹)</label>
              <input
                type="number" placeholder="e.g. 5000" min="1"
                value={form.amount}
                onChange={e => setForm({...form, amount: e.target.value})}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn primary">Save Budget</button>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* OVERALL SUMMARY */}
      <div className="budget-overview card">
        <div className="overview-item">
          <span className="overview-label">Total Budget</span>
          <span className="overview-value">{fmt(totalBudget)}</span>
        </div>
        <div className="overview-divider"/>
        <div className="overview-item">
          <span className="overview-label">Total Spent</span>
          <span className="overview-value" style={{color:'var(--red)'}}>{fmt(totalSpent)}</span>
        </div>
        <div className="overview-divider"/>
        <div className="overview-item">
          <span className="overview-label">Remaining</span>
          <span className="overview-value" style={{color:'var(--accent2)'}}>{fmt(totalBudget - totalSpent)}</span>
        </div>
      </div>

      {/* BUDGET CARDS */}
      {loading ? (
        <p className="empty">Loading budgets...</p>
      ) : budgets.length === 0 ? (
        <p className="empty">No budgets set for this month. Click "Set Budget" to add one!</p>
      ) : (
        <div className="budget-grid">
          {budgets.map(b => {
            const pct      = Math.min(100, Math.round((parseFloat(b.spent) / parseFloat(b.budget_limit)) * 100)) || 0;
            const over     = pct >= 100;
            const warn     = pct >= 80 && !over;
            const barColor = over ? 'var(--red)' : warn ? 'var(--amber)' : 'var(--accent2)';
            const isEditing = editingId === b.id;

            return (
              <div className="budget-card card" key={b.id}>

                {/* CARD HEADER */}
                <div className="bcard-header">
                  <div className="bcard-icon">{b.icon}</div>
                  <div className="bcard-info">
                    <div className="bcard-name">{b.category_name}</div>

                    {/* Show edit input OR normal amounts */}
                    {isEditing ? (
                      <div className="edit-inline">
                        <span className="rupee-prefix">₹</span>
                        <input
                          type="number" min="1"
                          className="edit-input"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div className="bcard-amounts">
                        <span style={{color: barColor}}>{fmt(b.spent)}</span>
                        <span className="bcard-limit"> / {fmt(b.budget_limit)}</span>
                      </div>
                    )}
                  </div>

                  {/* PILL */}
                  {!isEditing && over  && <span className="pill down">Over!</span>}
                  {!isEditing && warn  && <span className="pill warn">80%+</span>}

                  {/* ACTION BUTTONS */}
                  <div className="card-actions">
                    {isEditing ? (
                      <>
                        {/* Confirm edit */}
                        <button className="action-btn confirm" onClick={() => handleEdit(b.id)} title="Save">
                          <Check size={14}/>
                        </button>
                        {/* Cancel edit */}
                        <button className="action-btn cancel" onClick={cancelEdit} title="Cancel">
                          <X size={14}/>
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Edit */}
                        <button className="action-btn edit" onClick={() => startEdit(b)} title="Edit budget">
                          <Pencil size={14}/>
                        </button>
                        {/* Delete */}
                        <button className="action-btn delete" onClick={() => handleDelete(b.id)} title="Delete budget">
                          <Trash2 size={14}/>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="bar-track">
                  <div className="bar-fill" style={{width:`${pct}%`, background: barColor}}/>
                </div>

                <div className="bcard-footer">
                  <span>{pct}% used</span>
                  <span>{fmt(Math.max(0, parseFloat(b.budget_limit) - parseFloat(b.spent)))} left</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Budgets;