import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Trash2, Plus, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Transactions.css';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

const Transactions = () => {
  const now = new Date();

  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    type: '',
  });

  // Download date range
  const [downloadRange, setDownloadRange] = useState({
    from: '',
    to: '',
  });

  // New transaction form state
  const [form, setForm] = useState({
    account_id: '',
    category_id: '',
    type: 'expense',
    amount: '',
    description: '',
    date: now.toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchTransactions();
    fetchAccountsAndCategories();
  }, [filters]);

  const fetchTransactions = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        month: filters.month,
        year: filters.year,
        ...(filters.type && { type: filters.type }),
        limit: 100,
      });

      const res = await api.get(`/transactions?${params}`);
      setTransactions(res.data);

    } catch (err) {
      toast.error('Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountsAndCategories = async () => {
    try {
      const [accRes, catRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/categories'),
      ]);

      setAccounts(accRes.data);
      setCategories(catRes.data);

    } catch (err) {
      console.error(err);
    }
  };

  const handleFormChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ── ADD TRANSACTION ───────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault();

    try {
      await api.post('/transactions', form);

      toast.success('Transaction added!');
      setShowForm(false);

      setForm({
        ...form,
        amount: '',
        description: '',
        notes: '',
      });

      fetchTransactions();

    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to add transaction.'
      );
    }
  };

  // ── DELETE TRANSACTION ────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;

    try {
      await api.delete(`/transactions/${id}`);

      toast.success('Transaction deleted.');
      fetchTransactions();

    } catch (err) {
      toast.error('Failed to delete.');
    }
  };

  // ── FILTER DOWNLOAD TRANSACTIONS ──────────────────────
  const getFilteredDownloadTransactions = () => {

    return transactions.filter(tx => {

      if (!downloadRange.from || !downloadRange.to) {
        return true;
      }

      const txDate = new Date(tx.date);
      const fromDate = new Date(downloadRange.from);
      const toDate = new Date(downloadRange.to);

      toDate.setHours(23, 59, 59, 999);

      return txDate >= fromDate && txDate <= toDate;
    });
  };

  // ── EXPORT CSV ────────────────────────────────────────
  const exportCSV = () => {

    const filteredTx = getFilteredDownloadTransactions();

    if (filteredTx.length === 0) {
      toast.error('No transactions to export.');
      return;
    }

    const headers = [
      'Date',
      'Type',
      'Amount',
      'Category',
      'Description',
      'Account',
    ];

    const rows = filteredTx.map(tx => [
      `\t${new Date(tx.date).toISOString().split('T')[0]}`,
      tx.type,
      Number(tx.amount),
      tx.category_name || '',
      tx.description || '',
      tx.account_name || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row =>
        row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob(
      [csvContent],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    const from = downloadRange.from || 'all';
    const to = downloadRange.to || 'all';

    link.download = `transactions_${from}_to_${to}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success('CSV exported!');
  };

  // ── EXPORT PDF ────────────────────────────────────────
  const exportPDF = () => {

    const filteredTx = getFilteredDownloadTransactions();

    if (filteredTx.length === 0) {
      toast.error('No transactions to export.');
      return;
    }

    const income = filteredTx
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + parseFloat(t.amount), 0);

    const expense = filteredTx
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + parseFloat(t.amount), 0);

    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');

    doc.text(
      'FinTrack Transaction Report',
      14,
      18
    );

    // Subtitle
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text(
      `Transactions: ${filteredTx.length}`,
      14,
      26
    );

    doc.text(
      `From: ${downloadRange.from || 'All'}   To: ${downloadRange.to || 'All'}`,
      14,
      32
    );

    // Summary
    doc.text(
      `Income: ${income}   Expense: ${expense}   Net: ${income - expense}`,
      14,
      38
    );

    // Table
    autoTable(doc, {
      startY: 45,

      head: [[
        'Date',
        'Type',
        'Amount',
        'Category',
        'Description',
        'Account',
      ]],

      body: filteredTx.map(tx => [
        new Date(tx.date).toLocaleDateString('en-IN'),
        tx.type,
        Number(tx.amount),
        tx.category_name || '',
        tx.description || '',
        tx.account_name || '',
      ]),

      headStyles: {
        fillColor: [108, 99, 255],
        fontSize: 9,
      },

      bodyStyles: {
        fontSize: 8,
      },

      alternateRowStyles: {
        fillColor: [245, 247, 252],
      },
    });

    const from = downloadRange.from || 'all';
    const to = downloadRange.to || 'all';

    doc.save(
      `transactions_${from}_to_${to}.pdf`
    );

    toast.success('PDF exported!');
  };

  // Filter categories by selected type
  const filteredCategories = categories.filter(
    c => c.type === form.type
  );

  // Totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr',
    'May', 'Jun', 'Jul', 'Aug',
    'Sep', 'Oct', 'Nov', 'Dec'
  ];

  return (
    <div className="tx-page page-enter">

      {/* ── HEADER ── */}
      <div className="page-header">

        <div>
          <h1 className="page-title">
            Transactions
          </h1>

          <p className="page-sub">
            Track every rupee in and out
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >

          {/* DOWNLOAD DATE RANGE */}
          <input
            type="date"
            value={downloadRange.from}
            onChange={(e) =>
              setDownloadRange({
                ...downloadRange,
                from: e.target.value
              })
            }
          />

          <input
            type="date"
            value={downloadRange.to}
            onChange={(e) =>
              setDownloadRange({
                ...downloadRange,
                to: e.target.value
              })
            }
          />

          <button
            className="btn"
            onClick={exportCSV}
          >
            <Download size={14} /> CSV
          </button>

          <button
            className="btn"
            onClick={exportPDF}
          >
            <Download size={14} /> PDF
          </button>

          <button
            className="btn primary"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus size={15} />
            Add Transaction
          </button>

        </div>
      </div>

      {/* ── ADD TRANSACTION FORM ── */}
      {showForm && (
        <div className="card form-card">

          <h3 className="form-title">
            New Transaction
          </h3>

          <form
            onSubmit={handleAdd}
            className="tx-form"
          >

            {/* Type Toggle */}
            <div className="type-toggle">

              {['expense', 'income'].map(t => (

                <button
                  key={t}
                  type="button"
                  className={`type-btn ${
                    form.type === t
                      ? 'active-' + t
                      : ''
                  }`}
                  onClick={() =>
                    setForm({
                      ...form,
                      type: t,
                      category_id: ''
                    })
                  }
                >
                  {t === 'income'
                    ? '↑ Income'
                    : '↓ Expense'}
                </button>

              ))}

            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>Amount (₹)</label>

                <input
                  name="amount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Date</label>

                <input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Account</label>

                <select
                  name="account_id"
                  value={form.account_id}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">
                    Select account
                  </option>

                  {accounts.map(a => (
                    <option
                      key={a.id}
                      value={a.id}
                    >
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Category</label>

                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleFormChange}
                >
                  <option value="">
                    Select category
                  </option>

                  {filteredCategories.map(c => (
                    <option
                      key={c.id}
                      value={c.id}
                    >
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className="form-group"
                style={{ gridColumn: '1 / -1' }}
              >
                <label>Description</label>

                <input
                  name="description"
                  placeholder="e.g. D-Mart groceries"
                  value={form.description}
                  onChange={handleFormChange}
                />
              </div>

              <div
                className="form-group"
                style={{ gridColumn: '1 / -1' }}
              >
                <label>Notes (optional)</label>

                <input
                  name="notes"
                  placeholder="Any extra notes..."
                  value={form.notes}
                  onChange={handleFormChange}
                />
              </div>

            </div>

            <div className="form-actions">

              <button
                type="submit"
                className="btn primary"
              >
                Add Transaction
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>

            </div>

          </form>
        </div>
      )}

      {/* ── SUMMARY CHIPS ── */}
      <div className="tx-summary">

        <div className="summary-chip green">
          <span>Income</span>
          <strong>{fmt(totalIncome)}</strong>
        </div>

        <div className="summary-chip red">
          <span>Expenses</span>
          <strong>{fmt(totalExpense)}</strong>
        </div>

        <div className="summary-chip amber">
          <span>Net</span>
          <strong>{fmt(totalIncome - totalExpense)}</strong>
        </div>

      </div>

      {/* ── FILTERS ── */}
      <div className="card filters-card">

        <div className="filters-row">

          <div
            className="form-group"
            style={{ minWidth: '120px' }}
          >
            <label>Month</label>

            <select
              value={filters.month}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  month: e.target.value
                })
              }
            >
              {months.map((m, i) => (
                <option
                  key={i}
                  value={i + 1}
                >
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div
            className="form-group"
            style={{ minWidth: '100px' }}
          >
            <label>Year</label>

            <select
              value={filters.year}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  year: e.target.value
                })
              }
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option
                  key={y}
                  value={y}
                >
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div
            className="form-group"
            style={{ minWidth: '130px' }}
          >
            <label>Type</label>

            <select
              value={filters.type}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  type: e.target.value
                })
              }
            >
              <option value="">All</option>
              <option value="income">
                Income
              </option>
              <option value="expense">
                Expense
              </option>
            </select>
          </div>

        </div>
      </div>

      {/* ── TRANSACTIONS TABLE ── */}
      <div className="card">

        {loading ? (

          <p className="empty">
            Loading...
          </p>

        ) : transactions.length === 0 ? (

          <p className="empty">
            No transactions found. Add your first one!
          </p>

        ) : (

          <table className="tx-table">

            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Account</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>
                  Amount
                </th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {transactions.map(tx => (

                <tr key={tx.id}>

                  <td>
                    <span
                      className="cat-badge"
                      style={{
                        background:
                          (tx.category_color || '#888') + '22',
                        color:
                          tx.category_color || '#888',
                      }}
                    >
                      {tx.category_icon}{' '}
                      {tx.category_name || 'Uncategorized'}
                    </span>
                  </td>

                  <td className="tx-desc">
                    {tx.description || '—'}
                  </td>

                  <td className="tx-acc">
                    {tx.account_name}
                  </td>

                  <td className="tx-date-cell">
                    {new Date(tx.date)
                      .toLocaleDateString('en-IN')}
                  </td>

                  <td style={{ textAlign: 'right' }}>

                    <span
                      className={`tx-amount ${tx.type}`}
                    >
                      {tx.type === 'income'
                        ? '+'
                        : '−'}
                      {fmt(tx.amount)}
                    </span>

                  </td>

                  <td>

                    <button
                      className="del-btn"
                      onClick={() =>
                        handleDelete(tx.id)
                      }
                      title="Delete transaction"
                    >
                      <Trash2 size={14} />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        )}

      </div>
    </div>
  );
};

export default Transactions;