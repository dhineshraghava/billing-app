import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { SaleInvoice, SaleInvoiceItem, BusinessSettings } from '../types';
import { PrintReceiptModal } from '../components/Invoice/PrintReceiptModal';

export const SalesHistoryPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [sales, setSales] = useState<SaleInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Print Modal
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<SaleInvoiceItem[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<Partial<BusinessSettings>>({});
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Return Modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returningInvoice, setReturningInvoice] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<{ [itemId: number]: number }>({});
  const [returnReason, setReturnReason] = useState('');
  const [refundMode, setRefundMode] = useState<'CASH' | 'UPI' | 'STORE_CREDIT'>('CASH');
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  useEffect(() => {
    fetchSales();
  }, [search, status, paymentStatus, page]);

  async function fetchSales() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/sales', {
        params: {
          search: search.trim() || undefined,
          status: status || undefined,
          paymentStatus: paymentStatus || undefined,
          page,
          limit: 20,
        },
      });

      if (res.data?.success) {
        setSales(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalRecords(res.data.pagination.totalRecords || 0);
      }
    } catch (err) {
      console.error('Failed to fetch sales history:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenInvoice(invoiceId: number) {
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
      console.error('Failed to load invoice:', err);
    }
  }

  async function handleOpenReturn(invoiceId: number) {
    try {
      const res = await axiosClient.get(`/sales/${invoiceId}`);
      if (res.data?.success) {
        setReturningInvoice(res.data.data);
        setReturnItems({});
        setReturnError(null);
        setIsReturnModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load invoice for return:', err);
    }
  }

  async function handleSubmitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returningInvoice) return;

    const payloadItems = Object.entries(returnItems)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([itemId, qty]) => ({
        invoiceItemId: Number(itemId),
        quantity: Number(qty),
      }));

    if (payloadItems.length === 0) {
      setReturnError('Please select at least one item and quantity to return.');
      return;
    }

    setIsReturning(true);
    setReturnError(null);

    try {
      const res = await axiosClient.post(`/sales/${returningInvoice.invoice.id}/returns`, {
        items: payloadItems,
        refundMode,
        reason: returnReason || 'Customer return',
      });

      if (res.data?.success) {
        setIsReturnModalOpen(false);
        fetchSales();
      }
    } catch (err: any) {
      setReturnError(err.response?.data?.message || err.message || 'Failed to process return.');
    } finally {
      setIsReturning(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          {user?.roleName === 'CASHIER' || user?.roleName === 'SALESPERSON'
            ? 'My Counter Sales History'
            : 'Sales Invoices & Billing History'}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {user?.roleName === 'CASHIER' || user?.roleName === 'SALESPERSON'
            ? 'View and reprint receipts for your completed customer counter transactions'
            : 'Search, view, reprint receipts, and process customer returns across all counters'}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by invoice # or customer phone..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="">All Invoice Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="RETURNED">Returned</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700"
          >
            <option value="">All Payment Statuses</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="UNPAID">Unpaid (Credit)</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="p-3">Invoice Number</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Cashier</th>
                <th className="p-3">Items</th>
                <th className="p-3 text-right">Grand Total (₹)</th>
                <th className="p-3 text-center">Payment Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                sales.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-blue-700">{inv.invoice_number}</td>
                    <td className="p-3 text-slate-600">{new Date(inv.invoice_date).toLocaleString()}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{inv.customer_name || 'Walk-in Customer'}</div>
                      <div className="text-[10px] text-slate-500">{inv.customer_phone || '-'}</div>
                    </td>
                    <td className="p-3 text-slate-600">{inv.cashier_name}</td>
                    <td className="p-3 text-slate-700 font-semibold">{inv.item_count} items</td>
                    <td className="p-3 text-right font-bold font-mono text-sm text-slate-900">
                      ₹{Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                          inv.payment_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.payment_status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.payment_status} ({inv.payment_mode})
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenInvoice(inv.id)}
                          className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
                          title="Print / View Invoice"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print</span>
                        </button>
                        {hasRole(['ADMIN', 'MANAGER']) && (
                          <button
                            onClick={() => handleOpenReturn(inv.id)}
                            className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
                            title="Process Return (Manager/Admin Only)"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>Return</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{sales.length}</strong> of{' '}
            <strong className="text-slate-900">{totalRecords}</strong> invoices
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-800">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded border border-slate-300 bg-white px-2.5 py-1 font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Sales Return Modal */}
      {isReturnModalOpen && returningInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-sm mb-1">Process Sales Return & Refund</h3>
            <p className="text-xs text-slate-500 mb-3">
              Invoice No: <strong className="font-mono text-slate-800">{returningInvoice.invoice.invoice_number}</strong>
            </p>

            {returnError && (
              <div className="mb-3 flex items-center gap-2 rounded bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{returnError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-2">Select Items to Return:</label>
                <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded p-2">
                  {returningInvoice.items.map((item: any) => {
                    const maxRet = Number(item.quantity) - Number(item.returned_quantity || 0);
                    return (
                      <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{item.item_name}</div>
                          <div className="text-[10px] text-slate-500">
                            Sold: {Number(item.quantity)} | Already Returned: {Number(item.returned_quantity)} | Max: {maxRet}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">Return Qty:</span>
                          <input
                            type="number"
                            min="0"
                            max={maxRet}
                            step="0.01"
                            value={returnItems[item.id] || 0}
                            onChange={(e) =>
                              setReturnItems({
                                ...returnItems,
                                [item.id]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-16 rounded border border-slate-300 p-1 text-center font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Refund Method</label>
                <select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value as any)}
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                >
                  <option value="CASH">Cash Refund</option>
                  <option value="UPI">UPI Refund</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Return</label>
                <input
                  type="text"
                  placeholder="e.g. Defective item, customer changed mind"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full rounded border border-slate-300 p-2 text-slate-900"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReturning}
                  className="rounded-lg bg-red-600 px-4 py-1.5 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isReturning ? 'Processing...' : 'Confirm Return & Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Receipt Modal */}
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
