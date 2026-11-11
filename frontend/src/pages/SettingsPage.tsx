import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Store,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Users,
  UserPlus,
  ShieldCheck,
  RefreshCw,
  Edit3,
  UserCheck,
  UserX,
  Key,
  Star,
  Award,
  Sliders,
  X,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { BusinessSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'store' | 'staff'>('store');
  const [settings, setSettings] = useState<Partial<BusinessSettings>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Users state
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRoleId, setNewRoleId] = useState<number>(3); // Cashier default
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Edit user state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRoleId, setEditRoleId] = useState<number>(3);
  const [editPassword, setEditPassword] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchUsersAndRoles();
    }
  }, [activeTab]);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/settings');
      if (res.data?.success) setSettings(res.data.data);
    } catch (err) {
      console.error('Fetch settings error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsersAndRoles() {
    try {
      const [uRes, rRes] = await Promise.all([
        axiosClient.get('/auth/users'),
        axiosClient.get('/auth/roles'),
      ]);
      if (uRes.data?.success) setUsers(uRes.data.data);
      if (rRes.data?.success) setRoles(rRes.data.data);
    } catch (err) {
      console.error('Fetch staff error:', err);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await axiosClient.put('/settings', {
        storeName: settings.store_name,
        tagline: settings.tagline,
        gstin: settings.gstin,
        panNumber: settings.pan_number,
        addressLine1: settings.address_line1,
        addressLine2: settings.address_line2,
        city: settings.city,
        state: settings.state,
        stateCode: settings.state_code,
        pincode: settings.pincode,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        invoicePrefix: settings.invoice_prefix,
        thermalReceiptHeader: settings.thermal_receipt_header,
        thermalReceiptFooter: settings.thermal_receipt_footer,
        loyaltyEnabled: settings.loyalty_enabled !== undefined ? Boolean(settings.loyalty_enabled) : true,
        loyaltyMinPurchase: Number(settings.loyalty_min_purchase ?? 100),
        loyaltyPointsPerInvoice: Number(settings.loyalty_points_per_invoice ?? 1),
        loyaltyRedemptionRate: Number(settings.loyalty_redemption_rate ?? 1.00),
        loyaltyRedemptionEnabled: settings.loyalty_redemption_enabled !== undefined ? Boolean(settings.loyalty_redemption_enabled) : true,
      });

      if (res.data?.success) {
        setSuccessMsg('Store settings saved and updated successfully.');
        setTimeout(() => setSuccessMsg(null), 3500);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to update settings.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingUser(true);
    setUserError(null);

    try {
      const res = await axiosClient.post('/auth/users', {
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        phone: newPhone.trim() || undefined,
        roleId: newRoleId,
      });

      if (res.data?.success) {
        setIsAddUserOpen(false);
        setNewUsername('');
        setNewFullName('');
        setNewEmail('');
        setNewPassword('');
        setNewPhone('');
        fetchUsersAndRoles();
        setSuccessMsg('New employee account created successfully.');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setUserError(err.response?.data?.message || err.message || 'Failed to create user account.');
    } finally {
      setIsCreatingUser(false);
    }
  }

  function openEditUser(u: any) {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditEmail(u.email);
    setEditPhone(u.phone || '');
    setEditRoleId(u.role_id);
    setEditPassword('');
    setEditUserError(null);
  }

  async function handleUpdateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setIsUpdatingUser(true);
    setEditUserError(null);

    try {
      const res = await axiosClient.put(`/auth/users/${editingUser.id}`, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim() || null,
        roleId: editRoleId,
        password: editPassword.trim() || undefined,
      });

      if (res.data?.success) {
        setEditingUser(null);
        fetchUsersAndRoles();
        setSuccessMsg(`User ${editingUser.username} credentials and role updated successfully.`);
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err: any) {
      setEditUserError(err.response?.data?.message || err.message || 'Failed to update employee account.');
    } finally {
      setIsUpdatingUser(false);
    }
  }

  async function handleToggleStatus(u: any) {
    if (confirm(`Are you sure you want to ${u.is_active ? 'deactivate' : 'activate'} user account "${u.username}"?`)) {
      try {
        const res = await axiosClient.patch(`/auth/users/${u.id}/status`);
        if (res.data?.success) {
          fetchUsersAndRoles();
          setSuccessMsg(`User "${u.username}" has been ${u.is_active ? 'deactivated' : 'activated'}.`);
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || err.message || 'Failed to change user status.');
        setTimeout(() => setErrorMsg(null), 3500);
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 antialiased">
      {/* Page Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">System Configuration &amp; Administration</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage store profile, tax GSTIN, thermal printer headers, and staff accounts</p>
          </div>
        </div>

        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold border border-slate-200/80">
          <button
            onClick={() => setActiveTab('store')}
            className={`rounded-lg px-4 py-1.5 transition ${
              activeTab === 'store' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Store Profile &amp; Loyalty
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`rounded-lg px-4 py-1.5 transition ${
              activeTab === 'staff' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff &amp; Access Roles
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-bold text-emerald-800 shadow-2xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-bold text-rose-700 shadow-2xs">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab: Store Profile */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4 text-xs">
            <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Store className="h-4 w-4 text-blue-600" />
              <span>Store Profile &amp; Tax Registration</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Store / Business Name *</label>
                <input
                  type="text"
                  required
                  value={settings.store_name || ''}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Store Tagline / Slogan</label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  placeholder="Quality Groceries & Fresh Everyday"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">GSTIN (15 Digits) *</label>
                <input
                  type="text"
                  required
                  value={settings.gstin || ''}
                  onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={settings.pan_number || ''}
                  onChange={(e) => setSettings({ ...settings, pan_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  value={settings.address_line1 || ''}
                  onChange={(e) => setSettings({ ...settings, address_line1: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={settings.city || ''}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={settings.state || ''}
                  onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">State Code (GST) *</label>
                <input
                  type="text"
                  required
                  value={settings.state_code || ''}
                  onChange={(e) => setSettings({ ...settings, state_code: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Postal Code (Pincode)</label>
                <input
                  type="text"
                  value={settings.pincode || ''}
                  onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Customer Support Phone *</label>
                <input
                  type="text"
                  required
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Support Email</label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-4 text-xs">
            <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Receipt className="h-4 w-4 text-blue-600" />
              <span>Thermal Receipt &amp; Invoice Formatting</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Number Prefix</label>
                <input
                  type="text"
                  value={settings.invoice_prefix || 'INV-'}
                  onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  className="w-36 rounded-xl border border-slate-300 p-2.5 font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Generated numbers: INV-202611-0001</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thermal Receipt Header Note</label>
                <textarea
                  rows={2}
                  value={settings.thermal_receipt_header || ''}
                  onChange={(e) => setSettings({ ...settings, thermal_receipt_header: e.target.value })}
                  placeholder="*** WELCOME TO SUPERMART ***"
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Thermal Receipt Footer / Return Policy</label>
                <textarea
                  rows={3}
                  value={settings.thermal_receipt_footer || ''}
                  onChange={(e) => setSettings({ ...settings, thermal_receipt_footer: e.target.value })}
                  placeholder="Thank you for shopping with us! Items returnable within 7 days with bill."
                  className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Customer Loyalty Rewards Program */}
          <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-amber-100 pb-3">
              <div className="p-1 rounded-md bg-amber-50 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Customer Loyalty Rewards Program</h3>
                <p className="text-xs text-slate-500">Configure customer points earning thresholds, award rules, and redemption conversion rate</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div>
                  <span className="font-extrabold text-slate-800 block">Enable Loyalty Points Program</span>
                  <span className="text-[11px] text-slate-500">Allow registered customers to earn points on qualifying sales</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.loyalty_enabled ?? true)}
                  onChange={(e) => setSettings({ ...settings, loyalty_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                <div>
                  <span className="font-extrabold text-slate-800 block">Enable Points Redemption</span>
                  <span className="text-[11px] text-slate-500">Allow cashiers to redeem customer points as a rupee discount at checkout</span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings.loyalty_redemption_enabled ?? true)}
                  onChange={(e) => setSettings({ ...settings, loyalty_redemption_enabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Minimum Purchase Amount to Qualify for Points (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.loyalty_min_purchase ?? 100}
                    onChange={(e) => setSettings({ ...settings, loyalty_min_purchase: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-8 pr-3 font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Default: ₹100 (Bills above ₹100 qualify for points)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Points Awarded Per Qualifying Invoice
                </label>
                <div className="relative">
                  <Star className="absolute left-3.5 top-2.5 h-4 w-4 text-amber-500" />
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={settings.loyalty_points_per_invoice ?? 1}
                    onChange={(e) => setSettings({ ...settings, loyalty_points_per_invoice: parseInt(e.target.value, 10) || 1 })}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Default: 1 point per invoice (not multiplied by items)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Redemption Rate: Rupee Value Per Point (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.05"
                    value={settings.loyalty_redemption_rate ?? 1.0}
                    onChange={(e) => setSettings({ ...settings, loyalty_redemption_rate: parseFloat(e.target.value) || 1.0 })}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-8 pr-3 font-mono font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Default: ₹1.00 (1 loyalty point = ₹1 discount)</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-black text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 transition active:scale-[0.99]"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings to MySQL'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab: Staff Management */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Store Staff &amp; Access Roles</h2>
              <p className="text-xs text-slate-500">Manage cashier, manager, and administrator login credentials</p>
            </div>
            <button
              onClick={() => {
                setUserError(null);
                setIsAddUserOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-[0.99] transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="p-3.5">Staff Name</th>
                  <th className="p-3.5">Username</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Last Login</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-extrabold text-slate-900 text-xs">{u.full_name}</td>
                    <td className="p-3.5 font-mono text-slate-700 font-bold">{u.username}</td>
                    <td className="p-3.5">
                      <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {u.role_name}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <div>{u.email}</div>
                      {u.phone && <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.phone}</div>}
                    </td>
                    <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditUser(u)}
                          title="Edit staff details and role"
                          className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition shadow-2xs"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? 'Cannot deactivate your own logged-in account' : u.is_active ? 'Deactivate staff account' : 'Activate staff account'}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition shadow-2xs disabled:opacity-30 disabled:cursor-not-allowed ${
                            u.is_active
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {u.is_active ? (
                            <>
                              <UserX className="h-3 w-3" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3 w-3" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Staff Member */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Add New Staff Member</h3>
                <p className="text-xs text-slate-500">Create role-based login credentials for your store employees</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {userError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{userError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. ramesh"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name || r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ramesh@supermart.com"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                >
                  {isCreatingUser ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Staff Member */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Edit Staff Member</h3>
                <p className="text-xs text-slate-500">
                  Update role, contact details, or reset password for <span className="font-mono font-bold text-blue-600">@{editingUser.username}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {editUserError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{editUserError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateStaff} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    disabled
                    value={editingUser.username}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-500 font-mono font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role *</label>
                  <select
                    value={editRoleId}
                    onChange={(e) => setEditRoleId(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-bold focus:border-blue-500 focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.display_name || r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-slate-500" />
                  <span>Reset Password (Optional)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Leave blank to keep existing password"
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 font-mono bg-white"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Only enter a value if you wish to reset this employee's password.
                </span>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingUser}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                >
                  {isUpdatingUser ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
