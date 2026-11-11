import React, { useState, useEffect } from 'react';
import {
  Layers,
  AlertTriangle,
  ArrowUpDown,
  Plus,
  Minus,
  Search,
  History,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Package,
  AlertCircle,
  Truck,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';

interface InventorySummary {
  totalProducts: number;
  totalUnits: number;
  valuationCost: number;
  valuationRetail: number;
  potentialProfit: number;
  outOfStockCount: number;
  lowStockCount: number;
}

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'movements' | 'reorders'>('status');
  const [inventory, setInventory] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stock Adjustment Modal
  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [adjType, setAdjType] = useState<'ADD' | 'SUBTRACT'>('ADD');
  const [adjQty, setAdjQty] = useState<number>(1);
  const [adjNotes, setAdjNotes] = useState('');
  const [adjError, setAdjError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (activeTab === 'status') {
      fetchInventory();
    } else if (activeTab === 'movements') {
      fetchMovements();
    } else if (activeTab === 'reorders') {
      fetchLowStock();
    }
  }, [activeTab, search, page]);

  async function fetchSummary() {
    try {
      const res = await axiosClient.get('/inventory/summary');
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Inventory summary fetch error:', err);
    }
  }

  async function fetchInventory() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/inventory', {
        params: { search: search.trim() || undefined, page, limit: 25 },
      });
      if (res.data?.success) {
        setInventory(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMovements() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/inventory/movements', {
        params: { page, limit: 30 },
      });
      if (res.data?.success) {
        setMovements(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Movements fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLowStock() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/inventory/low-stock');
      if (res.data?.success) {
        setLowStockItems(res.data.data);
      }
    } catch (err) {
      console.error('Low stock fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  function openAdjustmentModal(prod: any, presetType: 'ADD' | 'SUBTRACT' = 'ADD', defaultNote = '') {
    setSelectedProduct(prod);
    setAdjType(presetType);
    setAdjQty(1);
    setAdjNotes(defaultNote);
    setAdjError(null);
    setIsAdjModalOpen(true);
  }

  async function handleSaveAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct || adjQty <= 0) {
      setAdjError('Please enter a valid quantity.');
      return;
    }

    setIsSubmitting(true);
    setAdjError(null);

    try {
      const res = await axiosClient.post('/inventory/adjustments', {
        productId: selectedProduct.id,
        adjustmentType: adjType,
        quantity: adjQty,
        notes: adjNotes || `Manual stock adjustment (${adjType})`,
      });

      if (res.data?.success) {
        setIsAdjModalOpen(false);
        fetchSummary();
        if (activeTab === 'status') fetchInventory();
        if (activeTab === 'reorders') fetchLowStock();
      }
    } catch (err: any) {
      setAdjError(err.response?.data?.message || err.message || 'Failed to adjust stock.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 antialiased">
      {/* Page Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Inventory &amp; Stock Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">Real-time asset valuation, stock adjustment reconciliation &amp; audit trails</p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold border border-slate-200/80">
          <button
            onClick={() => {
              setActiveTab('status');
              setPage(1);
            }}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'status' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Current Stock ({summary?.totalProducts || 0})
          </button>
          <button
            onClick={() => {
              setActiveTab('reorders');
              setPage(1);
            }}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'reorders' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reorders ({Number(summary?.lowStockCount || 0) + Number(summary?.outOfStockCount || 0)})
          </button>
          <button
            onClick={() => {
              setActiveTab('movements');
              setPage(1);
            }}
            className={`rounded-lg px-3.5 py-1.5 transition ${
              activeTab === 'movements' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Valuation (Cost)</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 font-mono">
            ₹{summary ? summary.valuationCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Purchased inventory asset cost</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Retail Value</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 font-mono">
            ₹{summary ? summary.valuationRetail.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Estimated gross sales realization</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Potential Margin</span>
            <div className="p-1 rounded-md bg-indigo-50 text-indigo-600">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-emerald-600 mt-1 font-mono">
            ₹{summary ? summary.potentialProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Projected profit across catalog</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Stock Health</span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-black text-rose-600">{summary?.outOfStockCount || 0} Out</span>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-sm font-bold text-amber-600">{summary?.lowStockCount || 0} Low</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Items needing replenishment</div>
        </div>
      </div>

      {/* Main Tab: Current Stock Status */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs flex items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by product name, barcode or SKU..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing page <strong className="text-slate-900 font-bold">{page}</strong> of <strong className="text-slate-900 font-bold">{totalPages}</strong>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Cost Price (₹)</th>
                    <th className="p-3.5 text-right">Selling Price (₹)</th>
                    <th className="p-3.5 text-right">In Stock</th>
                    <th className="p-3.5 text-right">Stock Valuation</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                          <span className="text-xs font-semibold">Loading inventory records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400">
                        No inventory records found.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 text-xs">{row.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Barcode: {row.barcode}</div>
                        </td>
                        <td className="p-3.5 text-slate-700 font-semibold">{row.category_name}</td>
                        <td className="p-3.5 text-right font-medium text-slate-500 font-mono">
                          ₹{Number(row.purchase_price).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 font-mono text-xs">
                          ₹{Number(row.selling_price).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-black text-slate-900 font-mono text-xs">
                          {Number(row.current_stock)} {row.unit_code}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-blue-700">
                          ₹{Number(row.stock_valuation).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                              row.stock_status === 'OUT_OF_STOCK'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : row.stock_status === 'LOW_STOCK'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {row.stock_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openAdjustmentModal(row)}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-blue-600 hover:text-white transition shadow-2xs"
                              title="Stock Adjustment"
                            >
                              <ArrowUpDown className="h-3 w-3" />
                              <span>Adjust</span>
                            </button>
                            <button
                              onClick={() => openAdjustmentModal(row, 'SUBTRACT', 'Damaged / expired product write-off')}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition shadow-2xs border border-rose-200/80"
                              title="Write off damaged or expired stock"
                            >
                              <AlertCircle className="h-3 w-3" />
                              <span>Write-Off</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between text-xs">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-2xs"
                >
                  Previous
                </button>
                <span className="font-bold text-slate-800">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-2xs"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Reorders / Low Stock Alerts */}
      {activeTab === 'reorders' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Product Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 text-right">Current Stock</th>
                    <th className="p-3.5 text-right">Min Threshold</th>
                    <th className="p-3.5 text-right">Recommended Reorder</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        Loading reorder alerts...
                      </td>
                    </tr>
                  ) : lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-slate-400">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        All products are currently stocked above their minimum reorder thresholds.
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 text-xs">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Barcode: {item.barcode}</div>
                        </td>
                        <td className="p-3.5 text-slate-700 font-semibold">{item.category_name}</td>
                        <td className="p-3.5 text-right font-black font-mono text-xs">
                          <span className={Number(item.current_stock) <= 0 ? 'text-rose-600' : 'text-amber-600'}>
                            {Number(item.current_stock)} {item.unit_code}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-medium text-slate-600">
                          {Number(item.min_stock_qty)} {item.unit_code}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-blue-700">
                          +{Math.max(10, Math.round((Number(item.min_stock_qty) * 2) - Number(item.current_stock)))} {item.unit_code}
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => openAdjustmentModal(item, 'ADD', 'Replenishment inward stock')}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Receive Stock</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Movements / Audit Trail */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Timestamp</th>
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Movement Type</th>
                    <th className="p-3.5 text-right">Quantity</th>
                    <th className="p-3.5 text-right">Balance After</th>
                    <th className="p-3.5">Notes</th>
                    <th className="p-3.5">Processed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        Loading audit trail...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400">
                        No movement audit records logged yet.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900 text-xs">{m.product_name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{m.barcode}</div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                              m.movement_type === 'SALE'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : m.movement_type === 'PURCHASE' || m.movement_type === 'SALE_RETURN'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black font-mono text-xs">
                          <span className={Number(m.quantity) >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {Number(m.quantity) > 0 ? `+${Number(m.quantity)}` : Number(m.quantity)} {m.unit_code}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-black font-mono text-slate-900 text-xs">
                          {Number(m.balance_after)} {m.unit_code}
                        </td>
                        <td className="p-3.5 text-slate-600 truncate max-w-xs">{m.notes}</td>
                        <td className="p-3.5 text-slate-700 font-semibold">{m.created_by_name || 'System'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Dialog */}
      {isAdjModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Physical Stock Adjustment</h3>
                <p className="text-xs text-slate-500">
                  Item: <strong className="text-slate-800">{selectedProduct.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {adjError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{adjError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('ADD')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-bold transition ${
                      adjType === 'ADD' ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('SUBTRACT')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 font-bold transition ${
                      adjType === 'SUBTRACT' ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 shadow-xs' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    <span>Reduce Stock</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantity ({selectedProduct.unit_code || 'Units'})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={adjQty}
                  onChange={(e) => setAdjQty(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-black font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Audit Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Broken package, stocktaking recount difference"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? 'Updating...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
