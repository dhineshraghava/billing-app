import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/Layout/MainLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { POSPage } from './pages/POSPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { SettingsPage } from './pages/SettingsPage';

// Smart Root Redirect based on database role
const RootDashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (user?.roleName === 'CASHIER' || user?.roleName === 'SALESPERSON') {
    return <Navigate to="/pos" replace />;
  }
  if (user?.roleName === 'INVENTORY_STAFF') {
    return <Navigate to="/inventory" replace />;
  }
  if (user?.roleName === 'ACCOUNTANT') {
    return <Navigate to="/expenses" replace />;
  }
  // Admin & Manager enter Dashboard
  return <DashboardPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* Role-Aware Home Dashboard */}
              <Route path="/" element={<RootDashboardRouter />} />

              {/* Manager Dashboard (Admin, Manager) */}
              <Route element={<ProtectedRoute roles={['ADMIN', 'MANAGER']} />}>
                <Route path="/manager" element={<DashboardPage />} />
              </Route>

              {/* POS Billing & Cash Counter Sales (Admin, Manager, Cashier/Salesperson) */}
              <Route element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'CASHIER', 'SALESPERSON']} />}>
                <Route path="/pos" element={<POSPage />} />
                <Route path="/sales" element={<SalesHistoryPage />} />
              </Route>

              {/* Product Catalog & Stock Tracking (Admin, Manager, Inventory Staff) */}
              <Route element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'INVENTORY_STAFF']} />}>
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/inventory" element={<InventoryPage />} />
                <Route path="/purchases" element={<PurchasesPage />} />
              </Route>

              {/* Customers & Suppliers (Admin, Manager) */}
              <Route element={<ProtectedRoute roles={['ADMIN', 'MANAGER']} />}>
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
              </Route>

              {/* Operating Expenses (Admin, Manager, Accountant) */}
              <Route element={<ProtectedRoute roles={['ADMIN', 'MANAGER', 'ACCOUNTANT']} />}>
                <Route path="/expenses" element={<ExpensesPage />} />
              </Route>

              {/* Owner/Administrator Settings & User Accounts (Admin Only) */}
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
