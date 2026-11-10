import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth, getRoleHomeRoute } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  roles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles }) => {
  const { user, token, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-sm font-semibold text-slate-600">Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !hasRole(roles)) {
    const homeRoute = getRoleHomeRoute(user.roleName);
    return (
      <div className="flex h-full min-h-[70vh] items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 shadow-xl border border-slate-200 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Your role (<strong className="text-slate-800">{user.roleName}</strong>) does not have permission to view this section.
          </p>
          <Link
            to={homeRoute}
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Authorized Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
