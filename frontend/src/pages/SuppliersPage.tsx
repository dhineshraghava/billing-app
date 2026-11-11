import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, AlertCircle, Phone, Mail, MapPin } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { Supplier } from '../types';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [search]);

  async function fetchSuppliers() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/suppliers', {
        params: { search: search.trim() || undefined },
      });
      if (res.data?.success) setSuppliers(res.data.data);
    } catch (err) {
      console.error('Fetch suppliers error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.companyName || !formData.phone) {
      setErrorMsg('Contact name, company name, and phone are required.');
      return;
    }

    try {
      const res = await axiosClient.post('/suppliers', formData);
      if (res.data?.success) {
        setIsModalOpen(false);
        setFormData({ name: '', companyName: '', phone: '', email: '', address: '', gstin: '' });
        fetchSuppliers();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to add supplier.');
    }
  }

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Suppliers &amp; Wholesale Distributors</h1>
              <span className="rounded-full bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 border border-slate-200">
                {suppliers.length} vendors
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Wholesale supplier contacts, GSTIN numbers and accounts payable ledgers</p>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm max-w-lg">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by agency company, contact or GSTIN..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Company Name</th>
                <th className="p-3.5">Contact Person</th>
                <th className="p-3.5">Phone Number</th>
                <th className="p-3.5">GSTIN</th>
                <th className="p-3.5">Address</th>
                <th className="p-3.5 text-right">Payable Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span className="text-xs font-semibold">Loading suppliers from database...</span>
                    </div>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    No suppliers matched your search criteria.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-extrabold text-slate-900 text-xs">{s.company_name}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{s.name}</td>
                    <td className="p-3.5 font-mono font-bold text-slate-700 text-xs">{s.phone}</td>
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">{s.gstin || '-'}</td>
                    <td className="p-3.5 text-slate-600 truncate max-w-xs">{s.address || '-'}</td>
                    <td className="p-3.5 text-right font-black font-mono text-xs">
                      <span className={Number(s.current_balance) > 0 ? 'text-amber-700' : 'text-slate-700'}>
                        ₹{Number(s.current_balance).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                  <Building2 className="h-4 w-4" />
                </div>
                <span>Enroll Supplier / Vendor</span>
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

            <form onSubmit={handleSaveSupplier} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Company / Agency Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Hindustan Unilever Agencies"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9444111000"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="33AAACM0123P1Z1"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Wholesale Market, City"
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
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
