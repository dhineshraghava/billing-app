import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Search, AlertCircle, Building2, Package, CheckCircle2, DollarSign } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { Supplier, Product } from '../types';

export const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // New Purchase Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(1);
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<{ productId: number; quantity: number; unitPrice: number; gstRate: number }[]>([]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, []);

  async function fetchPurchases() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/purchases');
      if (res.data?.success) setPurchases(res.data.data);
    } catch (err) {
      console.error('Fetch purchases error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSuppliers() {
    try {
      const res = await axiosClient.get('/suppliers');
      if (res.data?.success) {
        setSuppliers(res.data.data);
        if (res.data.data.length > 0) setSelectedSupplierId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Fetch suppliers error:', err);
    }
  }

  async function fetchProducts() {
    try {
      const res = await axiosClient.get('/products?limit=100');
      if (res.data?.success) setProducts(res.data.data);
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  }

  function addItemLine() {
    const defaultProduct = products[0];
    setPurchaseItems([
      ...purchaseItems,
      {
        productId: defaultProduct ? defaultProduct.id : 1,
        quantity: 10,
        unitPrice: defaultProduct ? Number(defaultProduct.purchase_price) : 50,
        gstRate: defaultProduct ? Number(defaultProduct.gst_rate) : 5,
      },
    ]);
  }

  function updateItemLine(index: number, field: string, value: any) {
    const updated = [...purchaseItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'productId') {
      const prod = products.find((p) => p.id === Number(value));
      if (prod) {
        updated[index].unitPrice = Number(prod.purchase_price);
        updated[index].gstRate = Number(prod.gst_rate);
      }
    }
    setPurchaseItems(updated);
  }

  function removeItemLine(index: number) {
    setPurchaseItems(purchaseItems.filter((_, idx) => idx !== index));
  }

  const computedTotal = purchaseItems.reduce((acc, it) => {
    const lineTaxable = it.quantity * it.unitPrice;
    const lineTax = (lineTaxable * it.gstRate) / 100;
    return acc + lineTaxable + lineTax;
  }, 0);

  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (purchaseItems.length === 0) {
      setErrorMsg('Please add at least one product to the purchase order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await axiosClient.post('/purchases', {
        supplierId: selectedSupplierId,
        supplierInvoiceNumber: supplierInvoiceNo,
        items: purchaseItems,
        amountPaid: Number(amountPaid) > 0 ? Number(amountPaid) : computedTotal,
        paymentMode,
        notes,
      });

      if (res.data?.success) {
        setIsModalOpen(false);
        fetchPurchases();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to record purchase.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 antialiased">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700 border border-blue-300 shadow-2xs">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Supplier Purchases &amp; Inward Invoices</h1>
              <span className="rounded-full bg-slate-100 text-slate-800 text-xs font-black px-3 py-1 border border-slate-300">
                {purchases.length} orders
              </span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-0.5">Record wholesale goods received and automatically replenish warehouse stock</p>
          </div>
        </div>

        <button
          onClick={() => {
            setPurchaseItems([]);
            addItemLine();
            setAmountPaid(0);
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 active:scale-[0.99] transition"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Record Inward Purchase</span>
        </button>
      </div>

      {/* Purchases Table */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300 uppercase tracking-wider text-xs">
                <th className="p-3.5">Purchase #</th>
                <th className="p-3.5">Supplier Invoice #</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Supplier Name</th>
                <th className="p-3.5 text-right">Total Amount (₹)</th>
                <th className="p-3.5 text-right">Amount Paid (₹)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 font-semibold">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span className="text-sm font-bold">Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500 font-semibold">
                    No supplier purchases recorded yet.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-3.5 font-mono font-black text-blue-700 text-sm">{p.invoice_number}</td>
                    <td className="p-3.5 font-mono text-slate-700 font-bold text-xs">{p.supplier_invoice_number || '-'}</td>
                    <td className="p-3.5 font-mono text-slate-700 font-bold text-xs">{new Date(p.invoice_date).toLocaleDateString()}</td>
                    <td className="p-3.5 font-extrabold text-slate-900 text-sm">{p.supplier_name}</td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900 text-sm sm:text-base">₹{Number(p.grand_total).toFixed(2)}</td>
                    <td className="p-3.5 text-right font-mono text-emerald-800 font-extrabold text-sm">₹{Number(p.amount_paid).toFixed(2)}</td>
                    <td className="p-3.5 text-center">
                      <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 text-xs font-black">
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-semibold text-xs">{p.received_by_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                  <Truck className="h-4 w-4" />
                </div>
                <span>Record Inward Supplier Purchase Invoice</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company_name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Supplier Invoice Number</label>
                  <input
                    type="text"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder="e.g. WH-INV-9921"
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-mono font-bold focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Purchase Items List */}
              <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 font-black text-slate-700">
                  <span>Items Received &amp; Cost</span>
                  <button
                    type="button"
                    onClick={addItemLine}
                    className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-white text-[11px] font-bold hover:bg-blue-700 transition shadow-2xs"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                {purchaseItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="col-span-5">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItemLine(idx, 'productId', e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-1.5 font-bold text-slate-900 text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.barcode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItemLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 p-1.5 text-center font-black font-mono"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={item.unitPrice}
                        onChange={(e) => updateItemLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 p-1.5 text-right font-black font-mono"
                      />
                    </div>

                    <div className="col-span-2 text-center font-bold text-slate-600 text-[11px]">
                      {item.gstRate}% GST
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemLine(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="text-right pt-2 font-black text-slate-900 text-sm font-mono">
                  Estimated Total: ₹{computedTotal.toFixed(2)}
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    placeholder={String(computedTotal)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 font-black text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-900 font-semibold"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CASH">Cash Drawer</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-black text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm & Receive Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
