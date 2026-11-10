import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck, Zap, Receipt, Barcode } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth, getRoleHomeRoute } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login, user, token } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (token && user) {
      navigate(getRoleHomeRoute(user.roleName), { replace: true });
    }
  }, [token, user]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await axiosClient.post('/auth/login', {
        username: username.trim(),
        password,
      });

      if (res.data?.success && res.data?.data) {
        const { token, user: loggedUser } = res.data.data;
        login(token, loggedUser);

        // Separate Redirection based on user role
        const targetRoute = getRoleHomeRoute(loggedUser.roleName);
        navigate(targetRoute, { replace: true });
      } else {
        setErrorMsg(res.data?.message || 'Login failed.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else if (!err.response || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        setErrorMsg('Cannot connect to backend server. Please ensure the backend is running on port 5000.');
      } else {
        setErrorMsg(err.message || 'Invalid login credentials. Please verify your username and password.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans">
      {/* Left Brand Showcase Section */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-br from-[#0c1a30] via-[#0f2444] to-[#12284c] text-white border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/30 font-black text-xl">
              SM
            </div>
            <div>
              <div className="font-extrabold text-lg tracking-tight text-white leading-none">SuperMart</div>
              <div className="text-xs text-blue-300 font-medium tracking-wider uppercase mt-0.5">Enterprise POS System</div>
            </div>
          </div>

          <div className="mt-20 max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 mb-6">
              <Zap className="h-3.5 w-3.5 text-blue-400" />
              <span>Real-Time Retail & Hypermarket Operations</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
              Speed, precision, & complete control at checkout.
            </h1>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              Designed for busy supermarket billing counters, barcode scanning, Indian GST compliance, split tender reconciliation, and live inventory control.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
                <Barcode className="h-5 w-5 text-blue-400 mb-2" />
                <div className="font-bold text-sm text-white">Instant Barcode Billing</div>
                <div className="text-xs text-slate-400 mt-1">High-speed EAN scanning with keyboard shortcuts</div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 backdrop-blur-sm">
                <Receipt className="h-5 w-5 text-emerald-400 mb-2" />
                <div className="font-bold text-sm text-white">GST & Thermal Print</div>
                <div className="text-xs text-slate-400 mt-1">58mm & 80mm receipts with WhatsApp sharing</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-6 border-t border-slate-800/60">
          <span>MySQL 8 InnoDB Architecture</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="h-4 w-4" />
            ACID Transaction Protected
          </span>
        </div>
      </div>

      {/* Right Login Form Section */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-12 bg-slate-900">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Mobile Brand Header */}
          <div className="flex items-center justify-center gap-2 lg:hidden mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-lg">
              SM
            </div>
            <div className="text-left">
              <div className="font-bold text-base text-white">SuperMart Hypermarket</div>
              <div className="text-[11px] text-blue-400">Retail Billing & Inventory</div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-2xl border border-slate-200">
            <div className="mb-6">
              <h2 className="text-xl font-black tracking-tight text-slate-900">Sign in to your counter</h2>
              <p className="mt-1 text-xs text-slate-500">Enter your employee credentials to access POS billing</p>
            </div>

            {errorMsg && (
              <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username or Staff ID
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username or staff ID"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 transition"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Open Counter Register</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            SuperMart POS • Relational MySQL Engine • Enterprise Ready
          </p>
        </div>
      </div>
    </div>
  );
};
