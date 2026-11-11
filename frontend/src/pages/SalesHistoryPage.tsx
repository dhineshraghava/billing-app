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
  Clock,
  Filter,
  CreditCard,
  QrCode,
  Banknote,
  Wallet,
  Split,
  X,
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
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {user?.roleName === 'CASHIER' || user?.roleName === 'SALESPERSON'
                  ? 'My Counter Sales History'
                  : 'Sales Invoices & Billing Archive'}
              </h1>
              <span className="rounded-full bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 border border-slate-200">
                {totalRecords} invoices
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.roleName === 'CASHIER' || user?.roleName === 'SALESPERSON'
                ? 'Review and reprint receipts for your completed customer counter transactions'
                : 'Search, audit, reprint thermal receipts, and process returns across all cash registers'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by invoice number or customer phone..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="">All Invoice Statuses</option>
            <option value="COMPLETED">Completed Invoices</option>
            <option value="RETURNED">Returned Invoices</option>
          </select>

          <select
            value={paymentStatus}
            onChange={(e) => {
              setPaymentStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-blue-500 transition"
          >
            <option value="">All Payment Modes &amp; Statuses</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIAL">Partially Paid</option>
            <option value="UNPAID">Unpaid (Credit / Khata)</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5">Invoice #</th>
                <th className="p-3.5">Date &amp; Time</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Cashier</th>
                <th className="p-3.5">Items</th>
                <th className="p-3.5 text-right">Grand Total (₹)</th>
                <th className="p-3.5 text-center">Payment Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span className="text-xs font-semibold">Loading sales invoices from database...</span>
                    </div>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    No sales invoices found matching your criteria.
                  </td>
                </tr>
              ) : (
                sales.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono font-bold text-blue-700 text-xs">{inv.invoice_number}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {new Date(inv.invoice_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="p-3.5">
                      <div className="font-extrabold text-slate-900 text-xs">{inv.customer_name || 'Walk-in Customer'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{inv.customer_phone || '-'}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{inv.cashier_name}</td>
                    <td className="p-3.5 text-slate-700 font-bold">{inv.item_count} items</td>
                    <td className="p-3.5 text-right font-black font-mono text-xs text-slate-900">
                      ₹{Number(inv.grand_total).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          inv.payment_status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.payment_status === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {inv.payment_status} ({inv.payment_mode})
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenInvoice(inv.id)}
                          className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition shadow-2xs"
                          title="Print / View Invoice"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Print</span>
                        </button>
                        {hasRole(['ADMIN', 'MANAGER']) && (
                          <button
                            onClick={() => handleOpenReturn(inv.id)}
                            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 transition shadow-2xs"
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

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{sales.length}</strong> of{' '}
            <strong className="text-slate-900">{totalRecords}</strong> invoices
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
            >
              Previous
            </button>
            <span className="font-bold text-slate-800">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Sales Return Modal */}
      {isReturnModalOpen && returningInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Process Sales Return &amp; Refund</h3>
                <p className="text-xs text-slate-500">
                  Invoice No: <strong className="font-mono text-slate-800">{returningInvoice.invoice.invoice_number}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {returnError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{returnError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-2">Select Items to Return:</label>
                <div className="space-y-2 max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-slate-50/50">
                  {returningInvoice.items.map((item: any) => {
                    const maxRet = Number(item.quantity) - Number(item.returned_quantity || 0);
                    return (
                      <div key={item.id} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs bg-white p-2 rounded-lg">
                        <div>
                          <div className="font-bold text-slate-900">{item.item_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Billed: {Number(item.quantity)} | Prev Returned: {Number(item.returned_quantity)} | Max: {maxRet}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">Return Qty:</span>
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
                            className="w-16 rounded-lg border border-slate-300 p-1 text-center font-black text-slate-900 font-mono"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Refund Method</label>
                <select
                  value={refundMode}
                  onChange={(e) => setRefundMode(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-semibold"
                >
                  <option value="CASH">Cash Refund</option>
                  <option value="UPI">UPI Refund</option>
                  <option value="STORE_CREDIT">Store Credit</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Return</label>
                <input
                  type="text"
                  placeholder="e.g. Defective packaging or customer exchange"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900"
                />
              </div>

              <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReturning}
                  className="rounded-xl bg-rose-600 px-5 py-2 font-black text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-md shadow-rose-600/20"
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
