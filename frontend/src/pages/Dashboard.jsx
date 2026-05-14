import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import './Dashboard.css';

// Currency formatter — turns 82500 into ₹82,500
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const COLORS = ['#4FA3E0','#00D4A0','#f563ff','#FF5E7D','#FFB547','#9f7caa'];

const Dashboard = () => {
  const { user } = useAuth();
  const now = new Date();

  const [summary, setSummary] = useState({ income:0, expense:0, savings:0, goal_contributions:0 });
  const [transactions, setTransactions] = useState([]);
  const [budgets,      setBudgets]      = useState([]);
  const [goals,        setGoals]        = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      // Run all API calls at the same time (faster than one by one)
      const [sumRes, txRes, budRes, goalRes] = await Promise.all([
        api.get(`/transactions/summary?month=${now.getMonth()+1}&year=${now.getFullYear()}`),
        api.get(`/transactions?month=${now.getMonth()+1}&year=${now.getFullYear()}&limit=5`),
        api.get(`/budgets?month=${now.getMonth()+1}&year=${now.getFullYear()}`),
        api.get('/goals'),
      ]);
      setSummary(sumRes.data);
      setTransactions(txRes.data);
      setBudgets(budRes.data);
      setGoals(goalRes.data.filter(g => g.status === 'active').slice(0, 3));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Build pie chart data from budgets
  const pieData = budgets.map(b => ({
    name:  b.category_name,
    value: parseFloat(b.spent) || 0,
  })).filter(d => d.value > 0);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard">

      {/* TOPBAR */}
      <div className="dash-topbar">
        <div>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800 }}>Hi {user?.name} 👋</h1>
          <p className="dash-sub">
            {now.toLocaleDateString('en-IN', { month:'long', year:'numeric' })} overview
          </p>
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="stats-grid">
       {[
  { label:'Total Income',       value: fmt(summary.income),              color:'var(--accent2)', border:'var(--accent2)' },
  { label:'Total Expenses',     value: fmt(summary.expense),             color:'var(--red)',      border:'var(--red)'     },
  { label:'Net Savings',        value: fmt(summary.savings),             color:'var(--amber)',    border:'var(--amber)'   },
].map(card => (
          <div className="stat-card" key={card.label} style={{'--card-color': card.border}}>
            <div className="stat-label">{card.label}</div>
            <div className="stat-value" style={{color: card.color}}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* CHARTS ROW */}
      <div className="charts-row">

        {/* SPENDING PIE CHART */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Spending Breakdown</span>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none"/>
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{background:'#1a2236',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',fontSize:'12px'}}/>
                <Legend iconSize={10} wrapperStyle={{fontSize:'12px'}}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty">No spending data yet</p>
          )}
        </div>

        {/* BUDGET BAR CHART */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Budget Usage</span>
          </div>
          {budgets.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={budgets.map(b => ({
                name:   b.category_name,
                Spent:  parseFloat(b.spent) || 0,
                Budget: parseFloat(b.budget_limit),
              }))} margin={{top:0,right:0,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{fontSize:11,fill:'#7c8aaa'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#7c8aaa'}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+v/1000+'k'}/>
                <Tooltip formatter={(v)=>fmt(v)} contentStyle={{background:'#1a2236',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'8px',fontSize:'12px'}}/>
                <Legend iconSize={10} wrapperStyle={{fontSize:'12px'}}/>
                <Bar dataKey="Budget" fill="rgba(125, 255, 99, 0.73)" radius={[4,4,0,0]}/>
                <Bar dataKey="Spent"  fill="#ff6363"              radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty">No budgets set yet</p>
          )}
        </div>
      </div>

      {/* BOTTOM ROW */}
      <div className="bottom-row">

        {/* RECENT TRANSACTIONS */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Transactions</span>
          </div>
          {transactions.length > 0 ? (
            <div className="tx-list">
              {transactions.map(tx => (
                <div className="tx-item" key={tx.id}>
                  <div className="tx-icon">{tx.category_icon || '💰'}</div>
                  <div className="tx-info">
                    <div className="tx-name">{tx.description || tx.category_name}</div>
                    <div className="tx-cat">{tx.category_name} · {tx.account_name}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className={`tx-amount ${tx.type}`}>
                      {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                    </div>
                    <div className="tx-date">{new Date(tx.date).toLocaleDateString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty">No transactions yet. Add your first one!</p>
          )}
        </div>

        {/* GOALS */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Savings Goals</span>
          </div>
          {goals.length > 0 ? (
            <div className="goals-list">
              {goals.map(g => {
                const pct = Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
                return (
                  <div className="goal-item" key={g.id}>
                    <div className="goal-icon">{g.icon}</div>
                    <div className="goal-info">
                      <div className="goal-name">{g.name}</div>
                      <div className="goal-meta">
                        <span>{fmt(g.saved_amount)} / {fmt(g.target_amount)}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{width:`${pct}%`}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="empty">No goals yet. Create your first goal!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;