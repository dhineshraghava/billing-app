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
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Inventory & Stock Tracking</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time valuation, physical adjustments & immutable audit trail</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-slate-200 p-1 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('status');
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === 'status' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Current Stock ({summary?.totalProducts || 0})
          </button>
          <button
            onClick={() => {
              setActiveTab('reorders');
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === 'reorders' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reorder Alerts ({Number(summary?.lowStockCount || 0) + Number(summary?.outOfStockCount || 0)})
          </button>
          <button
            onClick={() => {
              setActiveTab('movements');
              setPage(1);
            }}
            className={`rounded-md px-3 py-1.5 transition ${
              activeTab === 'movements' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Valuation (Cost)</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 font-mono">
            ₹{summary ? summary.valuationCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Purchased inventory asset value</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Retail Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900 mt-1 font-mono">
            ₹{summary ? summary.valuationRetail.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Estimated gross sales realization</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Potential Margin</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-black text-emerald-600 mt-1 font-mono">
            ₹{summary ? summary.potentialProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Projected profit across catalog</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Stock Health</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-lg font-black text-rose-600">{summary?.outOfStockCount || 0} Out</span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-sm font-bold text-amber-600">{summary?.lowStockCount || 0} Low</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Items needing replenishment</div>
        </div>
      </div>

      {/* Main Tab: Current Stock Status */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between gap-4">
            <div className="relative max-w-md w-full">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by product name, barcode or SKU..."
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-500">
              Showing page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="p-3">Product</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Cost Price (₹)</th>
                    <th className="p-3 text-right">Selling Price (₹)</th>
                    <th className="p-3 text-right">In Stock</th>
                    <th className="p-3 text-right">Stock Valuation</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Loading inventory records...
                      </td>
                    </tr>
                  ) : inventory.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No inventory records found.
                      </td>
                    </tr>
                  ) : (
                    inventory.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{row.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">Barcode: {row.barcode}</div>
                        </td>
                        <td className="p-3 text-slate-600">{row.category_name}</td>
                        <td className="p-3 text-right font-medium text-slate-600">
                          ₹{Number(row.purchase_price).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          ₹{Number(row.selling_price).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          {Number(row.current_stock)} {row.unit_code}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-700">
                          ₹{Number(row.stock_valuation).toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                              row.stock_status === 'OUT_OF_STOCK'
                                ? 'bg-red-100 text-red-800'
                                : row.stock_status === 'LOW_STOCK'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {row.stock_status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openAdjustmentModal(row)}
                              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-blue-600 hover:text-white transition"
                              title="Stock Adjustment"
                            >
                              <ArrowUpDown className="h-3 w-3" />
                              <span>Adjust</span>
                            </button>
                            <button
                              onClick={() => openAdjustmentModal(row, 'SUBTRACT', 'Damaged / expired product write-off')}
                              className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-600 hover:text-white transition"
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
              <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                >
                  Previous
                </button>
                <span className="text-slate-500 font-medium">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 rounded border border-slate-300 text-slate-600 disabled:opacity-40 hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Reorder Alerts */}
      {activeTab === 'reorders' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-800">
              <strong className="font-bold">Replenishment Engine:</strong> Showing products whose on-hand quantity is at or below the minimum reorder threshold. Recommended reorder quantities are computed dynamically to restore optimal buffer stock.
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3 text-right">Min Threshold</th>
                    <th className="p-3 text-right">Suggested Reorder</th>
                    <th className="p-3">Last Known Supplier</th>
                    <th className="p-3 text-center">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">Loading reorder suggestions...</td>
                    </tr>
                  ) : lowStockItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-emerald-600 font-semibold">
                        All products are sufficiently stocked! No reorders required right now.
                      </td>
                    </tr>
                  ) : (
                    lowStockItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{item.barcode}</div>
                        </td>
                        <td className="p-3 text-slate-600">{item.category_name}</td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span className={item.current_stock <= 0 ? 'text-rose-600' : 'text-amber-600'}>
                            {Number(item.current_stock)} {item.unit_code}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {Number(item.min_stock_qty)} {item.unit_code}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-blue-700">
                          +{Number(item.suggested_reorder_qty || 20)} {item.unit_code}
                        </td>
                        <td className="p-3 text-slate-700 font-medium">
                          {item.last_supplier_name || 'General Supplier'}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => openAdjustmentModal(item, 'ADD', 'Emergency replenishment')}
                            className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-600 hover:text-white transition"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Stock</span>
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

      {/* Tab: Movements Audit Trail */}
      {activeTab === 'movements' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Quantity Changed</th>
                  <th className="p-3 text-right">Balance After</th>
                  <th className="p-3">Reference / Notes</th>
                  <th className="p-3">Recorded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Loading stock audit movements...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No stock movement history found.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 text-slate-600">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{m.product_name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{m.barcode}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            m.movement_type === 'SALE'
                              ? 'bg-rose-100 text-rose-800'
                              : m.movement_type === 'PURCHASE' || m.movement_type === 'SALE_RETURN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold font-mono">
                        <span className={Number(m.quantity) >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {Number(m.quantity) > 0 ? `+${Number(m.quantity)}` : Number(m.quantity)} {m.unit_code}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold font-mono text-slate-900">
                        {Number(m.balance_after)} {m.unit_code}
                      </td>
                      <td className="p-3 text-slate-600">{m.notes}</td>
                      <td className="p-3 text-slate-700 font-medium">{m.created_by_name || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Dialog */}
      {isAdjModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Stock Adjustment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Adjusting physical inventory for: <strong className="text-slate-800">{selectedProduct.name}</strong>
            </p>

            {adjError && (
              <div className="mb-3 flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{adjError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('ADD')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 font-bold ${
                      adjType === 'ADD' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('SUBTRACT')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-2 font-bold ${
                      adjType === 'SUBTRACT' ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    <Minus className="h-4 w-4" />
                    <span>Reduce Stock</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity ({selectedProduct.unit_code || 'Units'})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={adjQty}
                  onChange={(e) => setAdjQty(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Expired stock discarded, count correction"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAdjModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
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
