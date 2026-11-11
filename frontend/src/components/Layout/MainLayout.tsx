import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCart,
  LayoutDashboard,
  Package,
  Layers,
  Receipt,
  Truck,
  Users,
  Building2,
  Wallet,
  Settings,
  LogOut,
  Bell,
  AlertTriangle,
  Menu,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Star,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

interface NavItem {
  label: string;
  path: string;
  icon: any;
  highlight?: boolean;
  roles?: string[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const MainLayout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('supermart_sidebar_collapsed') === 'true';
  });
  const [storeName, setStoreName] = useState<string>('SuperMart Hypermarket');

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('supermart_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Notifications
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const notifRef = useRef<HTMLDivElement>(null);

  // Shift Register
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [isShiftLoading, setIsShiftLoading] = useState(false);
  const [openingFloat, setOpeningFloat] = useState<number>(2000);
  const [counterName, setCounterName] = useState<string>('Counter 1');
  const [countedCash, setCountedCash] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);

  useEffect(() => {
    fetchHeaderData();
    fetchCurrentShift();
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchHeaderData() {
    try {
      const [notifRes, setRes] = await Promise.allSettled([
        axiosClient.get('/notifications'),
        axiosClient.get('/settings'),
      ]);

      if (notifRes.status === 'fulfilled' && notifRes.value.data?.data) {
        setAlerts(notifRes.value.data.data.alerts || []);
        setUnreadCount(notifRes.value.data.data.unreadCount || 0);
      }
      if (setRes.status === 'fulfilled' && setRes.value.data?.data) {
        setStoreName(setRes.value.data.data.store_name || 'SuperMart Hypermarket');
      }
    } catch (err) {
      console.error('Header stats error:', err);
    }
  }

  async function fetchCurrentShift() {
    setIsShiftLoading(true);
    try {
      const res = await axiosClient.get('/shifts/current');
      if (res.data?.success) {
        setCurrentShift(res.data.data);
      }
    } catch (err) {
      console.error('Fetch shift error:', err);
    } finally {
      setIsShiftLoading(false);
    }
  }

  async function handleOpenShift(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingShift(true);
    setShiftError(null);
    try {
      const res = await axiosClient.post('/shifts/open', {
        openingCash: openingFloat,
        registerName: counterName,
      });
      if (res.data?.success) {
        fetchCurrentShift();
        setIsShiftModalOpen(false);
      }
    } catch (err: any) {
      setShiftError(err.response?.data?.message || err.message || 'Failed to open register shift.');
    } finally {
      setIsSubmittingShift(false);
    }
  }

  async function handleCloseShift(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmittingShift(true);
    setShiftError(null);
    try {
      const res = await axiosClient.post('/shifts/close', {
        actualCash: parseFloat(countedCash) || 0,
        notes: closingNotes,
      });
      if (res.data?.success) {
        fetchCurrentShift();
        setIsShiftModalOpen(false);
        setCountedCash('');
        setClosingNotes('');
      }
    } catch (err: any) {
      setShiftError(err.response?.data?.message || err.message || 'Failed to close register shift.');
    } finally {
      setIsSubmittingShift(false);
    }
  }

  const navSections: NavSection[] = [
    {
      title: 'POS & OPERATIONS',
      items: [
        { label: 'POS Billing', path: '/pos', icon: ShoppingCart, highlight: true, roles: ['ADMIN', 'MANAGER', 'CASHIER', 'SALESPERSON'] },
        { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
        { label: 'Sales History', path: '/sales', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'CASHIER', 'SALESPERSON'] },
      ]
    },
    {
      title: 'INVENTORY & CATALOG',
      items: [
        { label: 'Products Catalog', path: '/products', icon: Package, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
        { label: 'Inventory & Reorders', path: '/inventory', icon: Layers, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
        { label: 'Purchases & Inward', path: '/purchases', icon: Truck, roles: ['ADMIN', 'MANAGER', 'INVENTORY_STAFF'] },
        { label: 'Suppliers Directory', path: '/suppliers', icon: Building2, roles: ['ADMIN', 'MANAGER'] },
      ]
    },
    {
      title: 'FINANCE & KHATA',
      items: [
        { label: 'Customers & Loyalty', path: '/customers', icon: Users, roles: ['ADMIN', 'MANAGER'] },
        { label: 'Operating Expenses', path: '/expenses', icon: Wallet, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Store & Staff Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
      ]
    }
  ];

  const roleBadgeColor = {
    ADMIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    MANAGER: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    CASHIER: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    INVENTORY_STAFF: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    ACCOUNTANT: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  }[user?.roleName || 'CASHIER'];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modern Collapsible Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#090e1a] text-slate-100 transition-all duration-300 ease-in-out lg:static border-r border-slate-800/80 shadow-xl ${
          sidebarCollapsed ? 'lg:w-[76px]' : 'lg:w-64'
        } ${sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-3.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white shadow-lg shadow-blue-500/25 font-black text-lg border border-blue-400/30">
              SM
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden animate-in fade-in duration-200">
                <div className="font-extrabold text-sm tracking-tight text-white leading-tight truncate">
                  {storeName}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-blue-300 font-bold tracking-wider uppercase">Hypermarket POS</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Desktop Collapse Toggle */}
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebarCollapse}
              className="hidden lg:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/70 rounded-lg transition"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Launch POS / Inventory Button */}
        <div className="p-3">
          {hasRole(['ADMIN', 'MANAGER', 'CASHIER', 'SALESPERSON']) ? (
            <button
              onClick={() => {
                navigate('/pos');
                setSidebarOpen(false);
              }}
              title="Open POS Billing Counter (F9)"
              className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-md shadow-emerald-950/40 transition hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] ${
                sidebarCollapsed ? 'py-2.5 px-0' : 'px-4 py-2.5'
              }`}
            >
              <ShoppingCart className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-xs uppercase tracking-wider font-extrabold truncate">Open POS Counter</span>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                navigate('/inventory');
                setSidebarOpen(false);
              }}
              title="Stock Inventory & Reorders"
              className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white shadow-md shadow-blue-950/40 transition hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] ${
                sidebarCollapsed ? 'py-2.5 px-0' : 'px-4 py-2.5'
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-xs uppercase tracking-wider font-extrabold truncate">Stock Inventory</span>
              )}
            </button>
          )}
        </div>

        {/* Grouped Navigation Links */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 py-2 text-xs font-medium custom-scrollbar">
          {navSections.map((sec) => {
            const visibleItems = sec.items.filter((item) => !item.roles || hasRole(item.roles));
            if (visibleItems.length === 0) return null;

            return (
              <div key={sec.title} className="space-y-1">
                {!sidebarCollapsed ? (
                  <div className="px-2.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400/90 py-1">
                    {sec.title}
                  </div>
                ) : (
                  <div className="my-2 border-t border-slate-800/80 mx-2" />
                )}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isPos = item.path === '/pos';

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center ${
                          sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-3'
                        } rounded-xl py-2.5 transition-all duration-150 relative ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-white shadow-lg shadow-blue-600/25'
                            : isPos
                            ? 'text-emerald-400 hover:bg-slate-800/60 hover:text-emerald-300'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-white rounded-r-full shadow-xs" />
                          )}
                          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                            <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? 'text-white' : isPos ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                            }`} />
                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                          </div>
                          {!sidebarCollapsed && isPos && (
                            <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                              F9
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="border-t border-slate-800/80 p-3 bg-[#060a14]">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-blue-400 font-extrabold text-xs uppercase border border-slate-700/80 shadow-xs">
                {(user?.fullName || user?.username || 'U')[0]}
              </div>
              {!sidebarCollapsed && (
                <div className="overflow-hidden animate-in fade-in duration-200">
                  <div className="truncate text-xs font-bold text-white leading-tight">
                    {user?.fullName || user?.username}
                  </div>
                  <span
                    className={`inline-block rounded border px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider mt-0.5 ${roleBadgeColor}`}
                  >
                    {user?.roleName?.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={logout}
                title="Sign Out of Counter"
                className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
          {sidebarCollapsed && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={logout}
                title="Sign Out"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-50/70">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 shadow-xs lg:px-6 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Desktop Expand Button if collapsed */}
            {sidebarCollapsed && (
              <button
                onClick={toggleSidebarCollapse}
                className="hidden lg:flex p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            )}

            {/* Current Active Page Breadcrumb */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer" onClick={() => navigate('/')}>{storeName}</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="capitalize text-blue-600 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                {location.pathname === '/' ? 'Business Dashboard' : location.pathname.replace('/', '').replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center gap-3">
            {/* Live Operational Clock */}
            <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{currentTime}</span>
            </div>

            {/* Shift Register Status Pill */}
            <button
              onClick={() => {
                fetchCurrentShift();
                setIsShiftModalOpen(true);
              }}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border transition ${
                currentShift
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${currentShift ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{currentShift ? `${currentShift.register_name}: Active` : 'Register Closed'}</span>
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 transition"
                title="System Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden text-xs">
                  <div className="flex items-center justify-between bg-slate-50 p-3.5 border-b border-slate-200">
                    <span className="font-bold text-slate-900 text-sm">Notifications & Alerts ({alerts.length})</span>
                    <button
                      onClick={() => fetchHeaderData()}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                    {alerts.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        No active alerts. All operations running smoothly!
                      </div>
                    ) : (
                      alerts.map((al) => (
                        <div
                          key={al.id}
                          onClick={() => {
                            setNotificationsOpen(false);
                            if (al.link) navigate(al.link);
                          }}
                          className="p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-start gap-2.5"
                        >
                          {al.type === 'DANGER' ? (
                            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          ) : al.type === 'WARNING' ? (
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-bold text-slate-900 leading-tight">{al.title}</div>
                            <div className="text-slate-600 mt-1 leading-snug">{al.message}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Button in Header */}
            {hasRole(['ADMIN', 'MANAGER', 'CASHIER', 'SALESPERSON']) ? (
              <button
                onClick={() => navigate('/pos')}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-[0.98] transition"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>POS Billing</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/inventory')}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-[0.98] transition"
              >
                <Layers className="h-4 w-4" />
                <span>Inventory</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable View Page */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100">
          <Outlet />
        </main>
      </div>

      {/* Cash Counter Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base">Cash Counter Shift Register</h3>
                <p className="text-xs text-slate-500">Opening float & closing drawer reconciliation</p>
              </div>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {shiftError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{shiftError}</span>
              </div>
            )}

            {currentShift ? (
              /* Shift is currently OPEN -> Show Live Totals & Close Form */
              <form onSubmit={handleCloseShift} className="space-y-4 text-xs">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-emerald-950 font-bold">
                    <span className="text-sm">{currentShift.register_name}</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Active Shift</span>
                  </div>
                  <div className="text-[11px] text-emerald-800">
                    Opened at: {new Date(currentShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} by <strong>{currentShift.cashier_name || user?.fullName}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Opening Float</span>
                    <span className="font-bold font-mono text-slate-800 text-sm">₹{Number(currentShift.opening_cash || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Cash Sales</span>
                    <span className="font-bold font-mono text-emerald-700 text-sm">₹{Number(currentShift.liveStats?.cashSales || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">UPI Sales</span>
                    <span className="font-bold font-mono text-indigo-700 text-sm">₹{Number(currentShift.liveStats?.upiSales || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">Total Bills</span>
                    <span className="font-bold font-mono text-slate-900 text-sm">{currentShift.liveStats?.totalBills || 0} Bills</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-blue-900 text-xs">Expected Cash in Drawer:</span>
                  <span className="font-black font-mono text-blue-900 text-base">
                    ₹{Number(currentShift.liveStats?.expectedCash || 0).toFixed(2)}
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Counted Physical Cash in Drawer (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={`e.g. ${Number(currentShift.liveStats?.expectedCash || 0).toFixed(2)}`}
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono font-bold text-sm focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                  {countedCash !== '' && (
                    <div className="mt-1.5 text-[11px] font-bold">
                      {parseFloat(countedCash) - Number(currentShift.liveStats?.expectedCash || 0) === 0 ? (
                        <span className="text-emerald-700">✓ Drawer cash exactly matches expected amount!</span>
                      ) : parseFloat(countedCash) - Number(currentShift.liveStats?.expectedCash || 0) > 0 ? (
                        <span className="text-blue-700">+₹{(parseFloat(countedCash) - Number(currentShift.liveStats?.expectedCash || 0)).toFixed(2)} Cash Over</span>
                      ) : (
                        <span className="text-rose-600">-₹{Math.abs(parseFloat(countedCash) - Number(currentShift.liveStats?.expectedCash || 0)).toFixed(2)} Cash Short</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Handover Notes / Discrepancy Reason</label>
                  <input
                    type="text"
                    placeholder="e.g. Shift handover to Evening Cashier"
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 text-xs"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Keep Open
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingShift}
                    className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-md shadow-rose-600/20"
                  >
                    {isSubmittingShift ? 'Closing...' : 'Reconcile & Close Shift'}
                  </button>
                </div>
              </form>
            ) : (
              /* No shift is OPEN -> Show Open Shift Form */
              <form onSubmit={handleOpenShift} className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  No active counter shift found for your account. Please declare your opening cash float to begin billing.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Counter / Register Name</label>
                  <input
                    type="text"
                    required
                    value={counterName}
                    onChange={(e) => setCounterName(e.target.value)}
                    placeholder="Counter 1"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opening Cash Float (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                    placeholder="2000"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono font-bold text-sm focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Initial cash given to cashier for customer change</span>
                </div>

                <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingShift}
                    className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shadow-emerald-600/20"
                  >
                    {isSubmittingShift ? 'Opening...' : 'Open Register Counter'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
