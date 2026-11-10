import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin, AlertCircle, Star, History, Award, X } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { Customer, LoyaltyTransaction } from '../types';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    creditLimit: 2000,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Loyalty History Modal State
  const [selectedCustomerForLoyalty, setSelectedCustomerForLoyalty] = useState<Customer | null>(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState<{
    summary: { currentPoints: number; totalEarned: number; totalRedeemed: number; totalReversed: number };
    transactions: LoyaltyTransaction[];
  } | null>(null);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [loadingLoyaltyHistory, setLoadingLoyaltyHistory] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/customers', {
        params: { search: search.trim() || undefined },
      });
      if (res.data?.success) setCustomers(res.data.data);
    } catch (err) {
      console.error('Fetch customers error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openLoyaltyHistory(customer: Customer) {
    setSelectedCustomerForLoyalty(customer);
    setIsLoyaltyModalOpen(true);
    setLoadingLoyaltyHistory(true);
    try {
      const res = await axiosClient.get(`/customers/${customer.id}/loyalty-history`);
      if (res.data?.success && res.data.data) {
        setLoyaltyHistory(res.data.data);
      }
    } catch (err) {
      console.error('Fetch loyalty history error:', err);
    } finally {
      setLoadingLoyaltyHistory(false);
    }
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      setErrorMsg('Name and phone number are required.');
      return;
    }

    try {
      const res = await axiosClient.post('/customers', formData);
      if (res.data?.success) {
        setIsModalOpen(false);
        setFormData({ name: '', phone: '', email: '', address: '', gstin: '', creditLimit: 2000 });
        fetchCustomers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to add customer.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Customer Directory & Credit Ledgers</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage supermarket customers, phone numbers and outstanding balances</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name or phone..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="p-3">Customer Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3 text-center">Loyalty Points</th>
              <th className="p-3">GSTIN</th>
              <th className="p-3">Address</th>
              <th className="p-3 text-right">Credit Limit (₹)</th>
              <th className="p-3 text-right">Outstanding Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">Loading customers...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-400">No customers found.</td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-900 text-sm">
                    {c.name}
                    {c.id === 1 && (
                      <span className="ml-2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 border border-emerald-200">
                        Default Walk-in
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-slate-600">{c.phone}</td>
                  <td className="p-3 text-center">
                    {c.id === 1 ? (
                      <span className="text-slate-400 font-mono text-xs">-</span>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 shadow-2xs">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                          <span>{c.loyalty_points || 0} pts</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => openLoyaltyHistory(c)}
                          className="rounded p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="View Loyalty History & Ledger"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono text-slate-500">{c.gstin || '-'}</td>
                  <td className="p-3 text-slate-600 truncate max-w-xs">{c.address || '-'}</td>
                  <td className="p-3 text-right font-medium text-slate-700">₹{Number(c.credit_limit).toFixed(2)}</td>
                  <td className="p-3 text-right font-bold font-mono">
                    <span className={Number(c.current_balance) > 0 ? 'text-red-600' : 'text-emerald-700'}>
                      ₹{Number(c.current_balance).toFixed(2)}
                    </span>
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
            <h2 className="text-base font-bold text-slate-900 mb-3">Add Customer</h2>
            {errorMsg && (
              <div className="mb-3 flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Phone *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9840112233"
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="33AAAPL1234A1Z1"
                  className="w-full rounded border border-slate-300 p-2 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street, Area, City"
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Credit Limit (₹)</label>
                <input
                  type="number"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded border border-slate-300 p-2 text-slate-900 font-bold"
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loyalty History & Ledger Modal */}
      {isLoyaltyModalOpen && selectedCustomerForLoyalty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <span>{selectedCustomerForLoyalty.name}</span>
                    <span className="text-xs font-mono font-normal text-slate-400">({selectedCustomerForLoyalty.phone})</span>
                  </h2>
                  <p className="text-xs text-slate-300">Customer Loyalty Points Ledger & Transaction History</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLoyaltyModalOpen(false);
                  setSelectedCustomerForLoyalty(null);
                  setLoyaltyHistory(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {loadingLoyaltyHistory ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent mb-2" />
                  <p className="text-xs">Loading loyalty history...</p>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-center">
                      <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Current Balance</div>
                      <div className="mt-1 text-2xl font-black text-amber-950 font-mono">
                        {loyaltyHistory?.summary?.currentPoints ?? selectedCustomerForLoyalty.loyalty_points ?? 0}
                      </div>
                      <div className="text-[10px] text-amber-700 font-semibold">points available</div>
                    </div>

                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-center">
                      <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Earned</div>
                      <div className="mt-1 text-2xl font-black text-emerald-950 font-mono">
                        +{loyaltyHistory?.summary?.totalEarned || 0}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold">from purchases</div>
                    </div>

                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-center">
                      <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Total Redeemed</div>
                      <div className="mt-1 text-2xl font-black text-blue-950 font-mono">
                        -{loyaltyHistory?.summary?.totalRedeemed || 0}
                      </div>
                      <div className="text-[10px] text-blue-700 font-semibold">points used</div>
                    </div>

                    <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-center">
                      <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Total Reversed</div>
                      <div className="mt-1 text-2xl font-black text-purple-950 font-mono">
                        {loyaltyHistory?.summary?.totalReversed || 0}
                      </div>
                      <div className="text-[10px] text-purple-700 font-semibold">via sales return</div>
                    </div>
                  </div>

                  {/* Transactions Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Point Activity History</h3>
                    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                            <th className="p-2.5">Date & Time</th>
                            <th className="p-2.5">Type</th>
                            <th className="p-2.5 text-right">Points</th>
                            <th className="p-2.5 text-right">Value (₹)</th>
                            <th className="p-2.5">Invoice #</th>
                            <th className="p-2.5">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(!loyaltyHistory?.transactions || loyaltyHistory.transactions.length === 0) ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                                No loyalty transactions recorded yet for this customer.
                              </td>
                            </tr>
                          ) : (
                            loyaltyHistory.transactions.map((tx) => (
                              <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                                <td className="p-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                  {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="p-2.5">
                                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                    tx.transaction_type === 'EARN'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : tx.transaction_type === 'REDEEM'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                                  }`}>
                                    {tx.transaction_type}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold">
                                  <span className={tx.transaction_type === 'EARN' ? 'text-emerald-700' : 'text-amber-800'}>
                                    {tx.transaction_type === 'EARN' ? `+${tx.points}` : `-${tx.points}`}
                                  </span>
                                </td>
                                <td className="p-2.5 text-right font-mono text-slate-700">
                                  ₹{Number(tx.rupee_value || 0).toFixed(2)}
                                </td>
                                <td className="p-2.5 font-mono text-blue-700 font-semibold">
                                  {tx.invoice_number || '-'}
                                </td>
                                <td className="p-2.5 text-slate-600 truncate max-w-xs" title={tx.description}>
                                  {tx.description}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsLoyaltyModalOpen(false);
                  setSelectedCustomerForLoyalty(null);
                  setLoyaltyHistory(null);
                }}
                className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-bold text-white hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
