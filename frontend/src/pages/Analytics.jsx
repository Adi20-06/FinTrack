import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { StatCardSkeleton } from '../components/Skeleton';
import './Analytics.css';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const VIBRANT_COLORS = [
  '#6366F1', '#10B981', '#F43F5E', '#F59E0B', 
  '#0EA5E9', '#D946EF', '#8B5CF6', '#EC4899'
];

const tooltipStyle = {
  contentStyle: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    color: '#f8fafc',
  }
};

const Analytics = () => {
  const currentYear = new Date().getFullYear();
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [catMonth, setCatMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => { fetchAll(); }, [selectedYear, catMonth]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [sumRes, monRes, catRes] = await Promise.all([
        api.get('/analytics/summary'),
        api.get(`/analytics/monthly?year=${selectedYear}`),
        api.get(`/analytics/categories?month=${catMonth}&year=${selectedYear}`),
      ]);
      setSummary(sumRes.data);
      setMonthly(monRes.data.map((d, i) => ({ ...d, name: MONTH_LABELS[i] })));
      setCategories(catRes.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // Calculate percentage for the custom progress bars
  const maxSpend = categories.length > 0 ? Math.max(...categories.map(c => c.total)) : 0;

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">Visualizing your financial health</p>
        </div>
        <select className="year-select" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="summary-grid">
        <div className="card income-border">
          <div className="s-label">Income</div>
          <div className="s-value text-green">{fmt(summary?.total_income)}</div>
        </div>
        <div className="card expense-border">
          <div className="s-label">Expenses</div>
          <div className="s-value text-red">{fmt(summary?.total_expense)}</div>
        </div>
        <div className="card savings-border">
          <div className="s-label">Savings Rate</div>
          <div className="s-value text-blue">{Math.round(((summary?.total_income - summary?.total_expense) / (summary?.total_income || 1)) * 100)}%</div>
        </div>
        <div className="card trans-border">
          <div className="s-label">Total Trans.</div>
          <div className="s-value">{summary?.total_transactions}</div>
        </div>
      </div>

      {/* TREND CHART */}
      <div className="card chart-card main-chart-box">
        <div className="card-header">
          <span className="card-title">Cash Flow Trend</span>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthly}>
              <defs>
                <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip {...tooltipStyle} formatter={(v) => fmt(v)} />
              <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} fill="url(#colorInc)" />
              <Area type="monotone" dataKey="expense" stroke="#F43F5E" strokeWidth={3} fill="url(#colorExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="two-col-grid">
        {/* SPENDING BY CATEGORY (CHART REMOVED) */}
        <div className="card chart-card">
          <div className="card-header">
            <span className="card-title">Spending by Category</span>
            <select className="mini-select" value={catMonth} onChange={(e) => setCatMonth(e.target.value)}>
              {MONTH_LABELS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          
          <div className="category-list-container">
            {categories.length > 0 ? categories.map((c, i) => (
              <div className="cat-row" key={i}>
                <div className="cat-row-info">
                  <span className="cat-name">{c.icon} {c.name}</span>
                  <span className="cat-amount">{fmt(c.total)}</span>
                </div>
                <div className="progress-bg">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${(c.total / maxSpend) * 100}%`,
                      backgroundColor: VIBRANT_COLORS[i % VIBRANT_COLORS.length]
                    }} 
                  />
                </div>
              </div>
            )) : <p className="empty">No expenses this month</p>}
          </div>
        </div>

        {/* SAVINGS BAR CHART */}
        <div className="card chart-card">
          <div className="card-header">
            <span className="card-title">Monthly Savings</span>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthly.map(d => ({ name: d.name, val: d.income - d.expense }))}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip {...tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                  {monthly.map((d, i) => (
                    <Cell key={i} fill={(d.income - d.expense) >= 0 ? '#10B981' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;