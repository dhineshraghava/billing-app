import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Landmark,
  Wallet,
  Calendar,
  Clock,
  Printer,
  FileText,
  Activity,
  Plus,
  Layers,
  BarChart3,
  Sparkles,
  Settings,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { DashboardSummary, SaleInvoice, SaleInvoiceItem, BusinessSettings } from '../types';
import { PrintReceiptModal } from '../components/Invoice/PrintReceiptModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartDays, setChartDays] = useState<number>(7);
  const [recentSales, setRecentSales] = useState<SaleInvoice[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Reprint modal state
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<SaleInvoiceItem[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<Partial<BusinessSettings>>({});
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData(chartDays);
  }, []);

  async function fetchDashboardData(days = chartDays) {
    setLoading(true);
    try {
      const [sumRes, chartRes, recentRes, topRes, setRes] = await Promise.allSettled([
        axiosClient.get('/dashboard/summary'),
        axiosClient.get(`/dashboard/chart?days=${days}`),
        axiosClient.get('/dashboard/recent-sales?limit=8'),
        axiosClient.get('/dashboard/top-products?limit=5'),
        axiosClient.get('/settings'),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value.data?.data) {
        setSummary(sumRes.value.data.data);
      }
      if (chartRes.status === 'fulfilled' && chartRes.value.data?.data) {
        setChartData(chartRes.value.data.data);
      }
      if (recentRes.status === 'fulfilled' && recentRes.value.data?.data) {
        setRecentSales(recentRes.value.data.data);
      }
      if (topRes.status === 'fulfilled' && topRes.value.data?.data) {
        setTopProducts(topRes.value.data.data);
      }
      if (setRes.status === 'fulfilled' && setRes.value.data?.data) {
        setStoreSettings(setRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFilterChart(days: number) {
    setChartDays(days);
    try {
      const res = await axiosClient.get(`/dashboard/chart?days=${days}`);
      if (res.data?.success && res.data.data) {
        setChartData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to filter chart:', err);
    }
  }

  async function openReprintModal(invoiceId: number) {
    try {
      const res = await axiosClient.get(`/sales/${invoiceId}`);
      if (res.data?.success) {
        const d = res.data.data;
        setSelectedInvoice(d.invoice);
        setInvoiceItems(d.items);
        setInvoicePayments(d.payments);
        setStoreSettings(d.store);
        setIsPrintModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load invoice for reprint:', err);
    }
  }

  if (loading && !summary) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Syncing dashboard with MySQL...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Greeting, Quick Stats & Action Shortcuts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {user?.roleName === 'ADMIN' ? 'Store Administrator & Business Overview' : 'Store Manager Operations Dashboard'}
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {user?.roleName} Access
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {user?.roleName === 'ADMIN'
              ? 'Complete business overview, profit & loss, cashier shifts, user administration & store settings'
              : 'Sales overview, inventory health, store stock movements, purchases inward & cashier shifts'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/pos')}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Open POS (F9)</span>
          </button>

          {user?.roleName === 'ADMIN' && (
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
            >
              <Settings className="h-4 w-4 text-purple-600" />
              <span>Staff & Settings</span>
            </button>
          )}

          <button
            onClick={() => navigate('/products')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <Plus className="h-4 w-4 text-blue-600" />
            <span>Add Product</span>
          </button>

          <button
            onClick={() => fetchDashboardData()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Live Metrics"
          >
            <Activity className="h-4 w-4 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Today's Sales</span>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 text-emerald-600 shadow-xs">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
            ₹{summary?.todaySales.totalAmount.toFixed(2) || '0.00'}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {summary?.todaySales.billCount || 0} bills completed
            </span>
            <span>Tax: ₹{summary?.todaySales.totalTax.toFixed(2) || '0.00'}</span>
          </div>
        </div>

        {/* Monthly Turnover */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Monthly Turnover</span>
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5 text-blue-600 shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 font-mono tracking-tight">
            ₹{summary?.monthSales.totalAmount.toFixed(2) || '0.00'}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {summary?.monthSales.billCount || 0} bills this month
            </span>
            <span className="text-[11px] text-slate-400">Current Cycle</span>
          </div>
        </div>

        {/* Lifetime Sales & Orders */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Sales & Orders</span>
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-2.5 text-indigo-600 shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-950 font-mono tracking-tight">
            ₹{summary?.lifetimeSales?.totalAmount.toFixed(2) || summary?.monthSales.totalAmount.toFixed(2) || '0.00'}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
              {summary?.lifetimeSales?.orderCount ?? summary?.monthSales.billCount ?? 0} total orders
            </span>
            <span className="text-[11px] text-slate-400">Lifetime</span>
          </div>
        </div>

        {/* Monthly Gross Margin */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Estimated Gross Profit</span>
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-2.5 text-purple-600 shadow-xs">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-950 font-mono tracking-tight">
            ₹{summary?.financials.estimatedGrossProfit.toFixed(2) || '0.00'}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <span className="text-purple-700 font-semibold">Sales Taxable - COGS</span>
            <span className="text-[11px] text-slate-400">Net Margin</span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Registered Customers */}
        <div
          onClick={() => navigate('/customers')}
          className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-md hover:border-blue-300 cursor-pointer transition"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Customers & Loyalty</span>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono">
              {summary?.customers?.total ?? 0} Registered
            </div>
            <div className="text-[11px] text-blue-600 font-semibold mt-1">
              Active loyalty program →
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-amber-600 shadow-xs">
            <Sparkles className="h-6 w-6" />
          </div>
        </div>

        {/* Inventory Status Card */}
        <div
          onClick={() => navigate('/inventory')}
          className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-md hover:border-blue-300 cursor-pointer transition"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Catalog & Stock</span>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono">
              {summary?.products.total || 0} Products
            </div>
            <div className="text-[11px] text-amber-700 font-bold mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              <span>{summary?.products.lowStock || 0} Low • {summary?.products.outOfStock || 0} Empty</span>
            </div>
          </div>
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-orange-600 shadow-xs">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* Today's Purchases Inward */}
        <div
          onClick={() => navigate('/purchases')}
          className="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-md hover:border-blue-300 cursor-pointer transition"
        >
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Today's Inward</span>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono">
              ₹{summary?.todayPurchases.totalAmount.toFixed(2) || '0.00'}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {summary?.todayPurchases.count || 0} inward bills
            </div>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-blue-600 shadow-xs">
            <ArrowDownRight className="h-6 w-6" />
          </div>
        </div>

        {/* Liquid Cash & Bank Balances */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:shadow-md transition">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Drawer & Bank Cash</span>
            <div className="text-xl font-black text-slate-900 mt-1 font-mono">
              ₹{summary?.financials.totalLiquidBalance.toFixed(2) || '0.00'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2">
              <span>Cash: ₹{summary?.financials.cashBalance.toFixed(0)}</span>
              <span>•</span>
              <span>Bank: ₹{summary?.financials.bankBalance.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Sales Trend & Top Ranked Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart (2 Columns) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>Sales Revenue Trend</span>
                <span className="rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 border border-blue-200">
                  {chartDays} Days
                </span>
              </h2>
              <p className="text-xs text-slate-500">Daily gross turnover and counter billing volume</p>
            </div>

            {/* Interactive Period Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => handleFilterChart(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    chartDays === d
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="display_date" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Turnover']}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="total_sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Best-Selling Products */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-extrabold text-sm text-slate-900">Top Selling Products</h2>
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Past 30 Days
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Ranked by volume units sold at counter</p>

            <div className="space-y-3.5">
              {topProducts.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  No sales recorded yet. Start billing!
                </div>
              ) : (
                topProducts.map((p, idx) => {
                  const maxUnits = Math.max(...topProducts.map((x) => Number(x.total_quantity_sold) || 1));
                  const pct = Math.min(100, Math.round(((Number(p.total_quantity_sold) || 0) / maxUnits) * 100));

                  return (
                    <div key={p.id} className="space-y-1.5 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-5 w-5 items-center justify-center rounded-md font-black text-[10px] ${
                            idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                            idx === 1 ? 'bg-slate-200 text-slate-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[130px]">{p.name}</span>
                        </div>
                        <div className="text-right font-mono font-bold text-blue-700">
                          {Number(p.total_quantity_sold)} units
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/products')}
            className="w-full mt-4 text-center text-xs font-bold text-blue-600 hover:text-blue-800 py-2 rounded-xl bg-blue-50/70 hover:bg-blue-100 transition"
          >
            View Entire Product Catalog →
          </button>
        </div>
      </div>

      {/* Recent Completed Bills Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-extrabold text-sm text-slate-900">Recent Completed Invoices</h2>
            <p className="text-xs text-slate-500">Live invoices committed atomically to MySQL</p>
          </div>
          <button
            onClick={() => navigate('/sales')}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            View Full Sales History →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="p-3">Invoice #</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Cashier</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3 text-right">Grand Total (₹)</th>
                <th className="p-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No sales invoices found in MySQL. Open POS counter to create your first bill!
                  </td>
                </tr>
              ) : (
                recentSales.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-blue-700">{inv.invoice_number}</td>
                    <td className="p-3 text-slate-600">{new Date(inv.invoice_date).toLocaleString()}</td>
                    <td className="p-3 font-bold text-slate-900">{inv.customer_name || 'Walk-in Customer'}</td>
                    <td className="p-3 text-slate-600">{inv.cashier_name}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                        inv.payment_mode === 'CASH' ? 'bg-emerald-100 text-emerald-800' :
                        inv.payment_mode === 'UPI' ? 'bg-indigo-100 text-indigo-800' :
                        inv.payment_mode === 'CARD' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {inv.payment_mode}
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-slate-900 font-mono text-sm">
                      ₹{Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => openReprintModal(inv.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-600 hover:text-white transition shadow-sm"
                        title="Print / View Thermal Invoice"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reprint Thermal Receipt Modal */}
      {isPrintModalOpen && selectedInvoice && (
        <PrintReceiptModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          invoice={selectedInvoice}
          items={invoiceItems}
          payments={invoicePayments}
          store={storeSettings}
        />
      )}
    </div>
  );
};
