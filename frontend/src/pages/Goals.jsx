import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, PiggyBank, MinusCircle } from 'lucide-react';
import './Goals.css';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const ICONS = ['🎯','🏖️','💻','🏠','🚗','✈️','💍','📚','🏥','💰','🎓','🎮'];

const Goals = () => {
  const [goals,    setGoals]    = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  // Contribute modal state
  const [contribGoal, setContribGoal] = useState(null);
  const [contribForm, setContribForm] = useState({ amount: '', account_id: '' });

  // Withdraw modal state
  const [withdrawGoal, setWithdrawGoal] = useState(null);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', account_id: '' });

  const [form, setForm] = useState({
    name: '', target_amount: '', deadline: '', icon: '🎯',
  });

  useEffect(() => {
    fetchGoals();
    fetchAccounts();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/goals');
      setGoals(res.data);
    } catch (err) {
      toast.error('Failed to load goals.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      setAccounts(res.data);
    } catch (err) { console.error(err); }
  };

  // ── CREATE ──────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/goals', form);
      toast.success('Goal created! 🎯');
      setShowForm(false);
      setForm({ name:'', target_amount:'', deadline:'', icon:'🎯' });
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create goal.');
    }
  };

  // ── CONTRIBUTE ───────────────────────────────────────
  const handleContribute = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/goals/${contribGoal.id}/contribute`, {
        amount:     parseFloat(contribForm.amount),
        account_id: contribForm.account_id,
      });
      toast.success(res.data.completed
        ? `Goal "${contribGoal.name}" completed! 🎉`
        : 'Contribution added! 💰'
      );
      setContribGoal(null);
      setContribForm({ amount: '', account_id: '' });
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add contribution.');
    }
  };

  // ── WITHDRAW ─────────────────────────────────────────
  const handleWithdraw = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/goals/${withdrawGoal.id}/withdraw`, {
        amount:     parseFloat(withdrawForm.amount),
        account_id: withdrawForm.account_id,
      });
      toast.success('Withdrawal successful! ↩️');
      setWithdrawGoal(null);
      setWithdrawForm({ amount: '', account_id: '' });
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw.');
    }
  };

  // ── EDIT ─────────────────────────────────────────────
  const startEdit = (goal) => {
    setEditGoal({
      id:            goal.id,
      name:          goal.name,
      target_amount: goal.target_amount,
      deadline:      goal.deadline ? goal.deadline.split('T')[0] : '',
      icon:          goal.icon,
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/goals/${editGoal.id}`, editGoal);
      toast.success('Goal updated!');
      setEditGoal(null);
      fetchGoals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update goal.');
    }
  };

  // ── DELETE ───────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return;
    try {
      await api.delete(`/goals/${id}`);
      toast.success('Goal deleted.');
      fetchGoals();
    } catch (err) {
      toast.error('Failed to delete goal.');
    }
  };

  const active    = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed');

  // Reusable account selector section used in both modals
  const AccountSelector = ({ value, onChange }) => (
    <div className="form-group" style={{marginBottom:'16px'}}>
      <label>From / To Account</label>
      <select value={value} onChange={onChange} required>
        <option value="">Select account</option>
        {accounts.map(a => (
          <option key={a.id} value={a.id}>
            {a.name} — {fmt(a.balance)}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="goals-page">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Savings Goals</h1>
          <p className="page-sub">Set targets and track your progress</p>
        </div>
        <button className="btn primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={15}/> New Goal
        </button>
      </div>

      {/* CREATE FORM */}
      {showForm && (
        <div className="card form-card">
          <h3 className="form-title">Create New Goal</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{marginBottom:'16px'}}>
              <label>Pick an Icon</label>
              <div className="icon-picker">
                {ICONS.map(ic => (
                  <button key={ic} type="button"
                    className={`icon-btn ${form.icon === ic ? 'selected' : ''}`}
                    onClick={() => setForm({...form, icon: ic})}
                  >{ic}</button>
                ))}
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{gridColumn:'1/-1'}}>
                <label>Goal Name</label>
                <input placeholder="e.g. Goa Trip, MacBook Pro..."
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label>Target Amount (₹)</label>
                <input type="number" placeholder="e.g. 50000" min="1"
                  value={form.target_amount}
                  onChange={e => setForm({...form, target_amount: e.target.value})} required/>
              </div>
              <div className="form-group">
                <label>Deadline (optional)</label>
                <input type="date" value={form.deadline}
                  onChange={e => setForm({...form, deadline: e.target.value})}/>
              </div>
            </div>
            <div className="form-actions" style={{marginTop:'16px'}}>
              <button type="submit" className="btn primary">Create Goal</button>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ── CONTRIBUTE MODAL ── */}
      {contribGoal && (
        <div className="modal-overlay" onClick={() => setContribGoal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="form-title" style={{margin:0}}>Add Money</h3>
                <p style={{fontSize:'12px', color:'var(--muted)', marginTop:'3px'}}>
                  {contribGoal.icon} {contribGoal.name} — {fmt(contribGoal.saved_amount)} / {fmt(contribGoal.target_amount)}
                </p>
              </div>
              <button className="action-btn cancel" onClick={() => setContribGoal(null)}>
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={handleContribute}>
              <AccountSelector
                value={contribForm.account_id}
                onChange={e => setContribForm({...contribForm, account_id: e.target.value})}
              />
              <div className="form-group" style={{marginBottom:'16px'}}>
                <label>Amount to Add (₹)</label>
                <input type="number" placeholder="e.g. 5000" min="1"
                  value={contribForm.amount}
                  onChange={e => setContribForm({...contribForm, amount: e.target.value})}
                  required autoFocus/>
              </div>
              <p className="modal-note">
                💡 This will show as an expense in your transactions and reduce your net savings.
              </p>
              <div className="form-actions">
                <button type="submit" className="btn primary">Add Money</button>
                <button type="button" className="btn" onClick={() => setContribGoal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── WITHDRAW MODAL ── */}
      {withdrawGoal && (
        <div className="modal-overlay" onClick={() => setWithdrawGoal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="form-title" style={{margin:0}}>Withdraw Money</h3>
                <p style={{fontSize:'12px', color:'var(--muted)', marginTop:'3px'}}>
                  {withdrawGoal.icon} {withdrawGoal.name} — Saved: {fmt(withdrawGoal.saved_amount)}
                </p>
              </div>
              <button className="action-btn cancel" onClick={() => setWithdrawGoal(null)}>
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={handleWithdraw}>
              <AccountSelector
                value={withdrawForm.account_id}
                onChange={e => setWithdrawForm({...withdrawForm, account_id: e.target.value})}
              />
              <div className="form-group" style={{marginBottom:'16px'}}>
                <label>Amount to Withdraw (₹) — Max: {fmt(withdrawGoal.saved_amount)}</label>
                <input type="number" placeholder="e.g. 2000" min="1"
                  max={withdrawGoal.saved_amount}
                  value={withdrawForm.amount}
                  onChange={e => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                  required autoFocus/>
              </div>
              <p className="modal-note">
                ↩️ This will show as income in your transactions and increase your net savings.
              </p>
              <div className="form-actions">
                <button type="submit" className="btn danger">Withdraw</button>
                <button type="button" className="btn" onClick={() => setWithdrawGoal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editGoal && (
        <div className="modal-overlay" onClick={() => setEditGoal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="form-title" style={{margin:0}}>Edit Goal</h3>
              <button className="action-btn cancel" onClick={() => setEditGoal(null)}>
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-group" style={{marginBottom:'16px'}}>
                <label>Icon</label>
                <div className="icon-picker">
                  {ICONS.map(ic => (
                    <button key={ic} type="button"
                      className={`icon-btn ${editGoal.icon === ic ? 'selected' : ''}`}
                      onClick={() => setEditGoal({...editGoal, icon: ic})}
                    >{ic}</button>
                  ))}
                </div>
              </div>
              <div className="form-grid" style={{marginBottom:'16px'}}>
                <div className="form-group" style={{gridColumn:'1/-1'}}>
                  <label>Goal Name</label>
                  <input value={editGoal.name}
                    onChange={e => setEditGoal({...editGoal, name: e.target.value})} required/>
                </div>
                <div className="form-group">
                  <label>Target Amount (₹)</label>
                  <input type="number" min="1" value={editGoal.target_amount}
                    onChange={e => setEditGoal({...editGoal, target_amount: e.target.value})} required/>
                </div>
                <div className="form-group">
                  <label>Deadline</label>
                  <input type="date" value={editGoal.deadline}
                    onChange={e => setEditGoal({...editGoal, deadline: e.target.value})}/>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn primary">Save Changes</button>
                <button type="button" className="btn" onClick={() => setEditGoal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GOALS LIST */}
      {loading ? (
        <p className="empty">Loading goals...</p>
      ) : goals.length === 0 ? (
        <div className="empty-state">
          <PiggyBank size={48} color="var(--muted)" style={{marginBottom:'12px'}}/>
          <p>No goals yet. Create your first savings goal!</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <h2 className="section-title">Active Goals</h2>
              <div className="goals-grid">
                {active.map(g => {
                  const pct       = Math.min(100, Math.round((parseFloat(g.saved_amount) / parseFloat(g.target_amount)) * 100));
                  const remaining = Math.max(0, parseFloat(g.target_amount) - parseFloat(g.saved_amount));
                  return (
                    <div className="goal-card card" key={g.id}>
                      <div className="goal-card-header">
                        <div className="goal-emoji">{g.icon}</div>
                        <div className="goal-card-info">
                          <div className="goal-card-name">{g.name}</div>
                          {g.deadline && (
                            <div className="goal-deadline">
                              by {new Date(g.deadline).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}
                            </div>
                          )}
                        </div>
                        <div className="ring-wrap">
                          <svg width="52" height="52" viewBox="0 0 52 52">
                            <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                            <circle cx="26" cy="26" r="20" fill="none"
                              stroke={pct >= 100 ? 'var(--accent2)' : 'var(--accent)'}
                              strokeWidth="5"
                              strokeDasharray={`${2 * Math.PI * 20}`}
                              strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct/100)}`}
                              strokeLinecap="round"
                              transform="rotate(-90 26 26)"
                            />
                          </svg>
                          <div className="ring-pct">{pct}%</div>
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="goal-actions">
                        <button className="action-btn edit" onClick={() => startEdit(g)}>
                          <Pencil size={13}/> Edit
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(g.id)}>
                          <Trash2 size={13}/> Delete
                        </button>
                      </div>

                      <div className="bar-track" style={{marginBottom:'10px'}}>
                        <div className="bar-fill" style={{
                          width:`${pct}%`,
                          background: pct >= 100 ? 'var(--accent2)' : 'var(--accent)'
                        }}/>
                      </div>

                      <div className="goal-amounts">
                        <div>
                          <div className="amt-label">Saved</div>
                          <div className="amt-value" style={{color:'var(--accent2)'}}>{fmt(g.saved_amount)}</div>
                        </div>
                        <div style={{textAlign:'center'}}>
                          <div className="amt-label">Remaining</div>
                          <div className="amt-value" style={{color:'var(--amber)'}}>{fmt(remaining)}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div className="amt-label">Target</div>
                          <div className="amt-value">{fmt(g.target_amount)}</div>
                        </div>
                      </div>

                      {/* ADD MONEY + WITHDRAW buttons */}
                      <div className="contrib-row">
                        <button className="btn primary contrib-btn" onClick={() => setContribGoal(g)}>
                          + Add Money
                        </button>
                        <button className="btn contrib-btn withdraw-btn"
                          onClick={() => setWithdrawGoal(g)}
                          disabled={parseFloat(g.saved_amount) <= 0}
                        >
                          <MinusCircle size={14}/> Withdraw
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {completed.length > 0 && (
            <>
              <h2 className="section-title" style={{marginTop:'28px'}}>Completed 🎉</h2>
              <div className="goals-grid">
                {completed.map(g => (
                  <div className="goal-card card completed-card" key={g.id}>
                    <div className="goal-card-header">
                      <div className="goal-emoji">{g.icon}</div>
                      <div className="goal-card-info">
                        <div className="goal-card-name">{g.name}</div>
                        <div className="goal-deadline" style={{color:'var(--accent2)'}}>Goal achieved! ✓</div>
                      </div>
                      <span className="pill up">100%</span>
                    </div>
                    <div className="goal-actions">
                      <button className="action-btn delete" onClick={() => handleDelete(g.id)}>
                        <Trash2 size={13}/> Delete
                      </button>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{width:'100%', background:'var(--accent2)'}}/>
                    </div>
                    <div style={{marginTop:'8px', fontSize:'12px', color:'var(--muted)'}}>
                      {fmt(g.target_amount)} saved
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Goals;