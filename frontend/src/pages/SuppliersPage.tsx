import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, AlertCircle } from 'lucide-react';
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Suppliers & Distributors</h1>
          <p className="text-xs text-slate-500 mt-0.5">Wholesale supplier contacts, GSTIN numbers and accounts payable</p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by company or GSTIN..."
            className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="p-3">Company Name</th>
              <th className="p-3">Contact Person</th>
              <th className="p-3">Phone</th>
              <th className="p-3">GSTIN</th>
              <th className="p-3">Address</th>
              <th className="p-3 text-right">Payable Balance (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">Loading suppliers...</td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">No suppliers found.</td>
              </tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-900 text-sm">{s.company_name}</td>
                  <td className="p-3 text-slate-700">{s.name}</td>
                  <td className="p-3 font-mono text-slate-600">{s.phone}</td>
                  <td className="p-3 font-mono text-slate-500">{s.gstin || '-'}</td>
                  <td className="p-3 text-slate-600 truncate max-w-xs">{s.address || '-'}</td>
                  <td className="p-3 text-right font-bold font-mono">
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-3">Add Supplier</h2>
            {errorMsg && (
              <div className="mb-3 flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Agency Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. Hindustan Unilever Agencies"
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Person Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9444111000"
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="33AAACM0123P1Z1"
                  className="w-full rounded border border-slate-300 p-2 text-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Wholesale Market, City"
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

