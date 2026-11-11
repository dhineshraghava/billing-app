import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Search, Calendar, Tag, AlertCircle, ArrowUpRight } from 'lucide-react';
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
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Operating Expenses &amp; Petty Cash</h1>
              <span className="rounded-full bg-slate-100 text-slate-800 text-xs font-black px-3 py-1 border border-slate-300">
                {expenses.length} records
              </span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-0.5">Track store overheads, electricity, rent, wages and maintenance payouts</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-rose-100 border border-rose-300 px-4 py-2 text-xs">
            <span className="text-rose-800 font-extrabold">Total Expenses: </span>
            <strong className="text-rose-950 font-mono text-base font-black">₹{totalExpenseAmount.toFixed(2)}</strong>
          </div>
          <button
            onClick={() => {
              setErrorMsg(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 active:scale-[0.99] transition"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm max-w-sm">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition"
        >
          <option value="">All Expense Categories</option>
          <option value="UTILITIES">Utilities (Electricity, Water, Internet)</option>
          <option value="RENT">Store Rent</option>
          <option value="SALARIES">Staff Salaries &amp; Wages</option>
          <option value="MAINTENANCE">Repairs &amp; Maintenance</option>
          <option value="SUPPLIES">Packaging, Bags &amp; Supplies</option>
          <option value="MARKETING">Marketing &amp; Promotions</option>
          <option value="MISCELLANEOUS">Miscellaneous Overheads</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 uppercase tracking-wider text-xs">
                <th className="p-3.5">Expense #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Title &amp; Particulars</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Paid To</th>
                <th className="p-3.5">Account &amp; Mode</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 font-semibold">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span className="text-sm font-bold">Loading expense ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-500 font-semibold">
                    No operating expenses recorded for this category filter.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono font-black text-slate-800 text-xs sm:text-sm">{e.expense_number}</td>
                    <td className="p-3.5 font-mono text-xs font-bold text-slate-700">{new Date(e.expense_date).toLocaleDateString()}</td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-sm">{e.title}</div>
                      {e.description && <div className="text-xs text-slate-500 mt-0.5">{e.description}</div>}
                    </td>
                    <td className="p-3.5">
                      <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-800 border border-slate-300">
                        {e.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-800 font-bold text-xs">{e.paid_to || '-'}</td>
                    <td className="p-3.5 text-slate-700 font-semibold text-xs">{e.account_name} ({e.payment_mode})</td>
                    <td className="p-3.5 text-right font-black font-mono text-sm sm:text-base text-rose-700">
                      ₹{Number(e.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <div className="p-1 rounded-md bg-rose-50 text-rose-600">
                  <Wallet className="h-4 w-4" />
                </div>
                <span>Record Store Expense</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Title / Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill Oct, Thermal Paper Rolls"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-semibold"
                >
                  <option value="UTILITIES">Utilities (Electricity, Water, Internet)</option>
                  <option value="RENT">Store Rent</option>
                  <option value="SALARIES">Staff Salaries &amp; Wages</option>
                  <option value="MAINTENANCE">Repairs &amp; Maintenance</option>
                  <option value="SUPPLIES">Packaging, Bags &amp; Stationery</option>
                  <option value="MARKETING">Marketing &amp; Advertising</option>
                  <option value="MISCELLANEOUS">Miscellaneous / Refreshments</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-base font-black text-rose-700 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Paid From Account</label>
                  <select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-semibold"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.account_name} (₹{Number(acc.current_balance).toFixed(0)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-semibold"
                  >
                    <option value="CASH">Cash Drawer</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Paid To (Vendor / Person)</label>
                <input
                  type="text"
                  placeholder="e.g. Electricity Board, Landlord"
                  value={formData.paidTo}
                  onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-700 transition shadow-md shadow-blue-500/20"
                >
                  Save &amp; Deduct
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
