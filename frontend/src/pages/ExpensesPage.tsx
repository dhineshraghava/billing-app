import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Search, Calendar, Tag, AlertCircle } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { Expense, FinancialAccount } from '../types';

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'UTILITIES',
    amount: '',
    paymentMode: 'CASH',
    accountId: 1,
    paidTo: '',
    description: '',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
    fetchAccounts();
  }, [selectedCategory]);

  async function fetchExpenses() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/expenses', {
        params: { category: selectedCategory || undefined },
      });
      if (res.data?.success) setExpenses(res.data.data);
    } catch (err) {
      console.error('Fetch expenses error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccounts() {
    try {
      const res = await axiosClient.get('/accounts');
      if (res.data?.success) {
        setAccounts(res.data.data);
        if (res.data.data.length > 0) setFormData((f) => ({ ...f, accountId: res.data.data[0].id }));
      }
    } catch (err) {
      console.error('Fetch accounts error:', err);
    }
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.amount || Number(formData.amount) <= 0) {
      setErrorMsg('Valid title and expense amount are required.');
      return;
    }

    try {
      const res = await axiosClient.post('/expenses', {
        ...formData,
        amount: Number(formData.amount),
      });

      if (res.data?.success) {
        setIsModalOpen(false);
        setFormData({
          title: '',
          category: 'UTILITIES',
          amount: '',
          paymentMode: 'CASH',
          accountId: accounts[0]?.id || 1,
          paidTo: '',
          description: '',
        });
        fetchExpenses();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to record expense.');
    }
  }

  const totalExpenseAmount = expenses.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Operating Expenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track store overheads, utilities, rent and maintenance payouts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs">
            <span className="text-rose-700 font-semibold">Total Expenses: </span>
            <strong className="text-rose-900 font-mono text-sm">₹{totalExpenseAmount.toFixed(2)}</strong>
          </div>
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm max-w-xs">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none"
        >
          <option value="">All Categories</option>
          <option value="UTILITIES">Utilities (Electricity, Water)</option>
          <option value="RENT">Store Rent</option>
          <option value="SALARIES">Staff Salaries</option>
          <option value="MAINTENANCE">Repairs & Maintenance</option>
          <option value="SUPPLIES">Packaging & Supplies</option>
          <option value="MARKETING">Marketing & Advertising</option>
          <option value="MISCELLANEOUS">Miscellaneous</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="p-3">Expense #</th>
              <th className="p-3">Date</th>
              <th className="p-3">Title & Details</th>
              <th className="p-3">Category</th>
              <th className="p-3">Paid To</th>
              <th className="p-3">Paid From Account</th>
              <th className="p-3 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">Loading expenses...</td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">No expenses recorded for this category.</td>
              </tr>
            ) : (
              expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-mono font-bold text-slate-700">{e.expense_number}</td>
                  <td className="p-3 text-slate-600">{new Date(e.expense_date).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{e.title}</div>
                    {e.description && <div className="text-[10px] text-slate-400">{e.description}</div>}
                  </td>
                  <td className="p-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {e.category}
                    </span>
                  </td>
                  <td className="p-3 text-slate-700">{e.paid_to || '-'}</td>
                  <td className="p-3 text-slate-600">{e.account_name} ({e.payment_mode})</td>
                  <td className="p-3 text-right font-bold font-mono text-sm text-rose-700">
                    ₹{Number(e.amount).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-3">Record Store Expense</h2>
            {errorMsg && (
              <div className="mb-3 flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EB Bill October, Carry Bags Bulk"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-slate-900 font-medium"
                >
                  <option value="UTILITIES">Utilities (Electricity, Water, Internet)</option>
                  <option value="RENT">Store Rent</option>
                  <option value="SALARIES">Staff Salaries</option>
                  <option value="MAINTENANCE">Repairs & Maintenance</option>
                  <option value="SUPPLIES">Packaging, Carry Bags & Stationery</option>
                  <option value="MARKETING">Marketing & Pamphlets</option>
                  <option value="MISCELLANEOUS">Miscellaneous / Refreshments</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 font-mono text-base font-black text-rose-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Paid From Account</label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) })}
                    className="w-full rounded border border-slate-300 p-2 text-slate-900"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} (₹{Number(acc.current_balance).toFixed(0)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full rounded border border-slate-300 p-2 text-slate-900"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Paid To (Vendor / Person)</label>
                <input
                  type="text"
                  placeholder="e.g. TNEB, Vendor Name"
                  value={formData.paidTo}
                  onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700"
                >
                  Save & Deduct
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

