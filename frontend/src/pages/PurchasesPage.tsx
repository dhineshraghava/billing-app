import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Search, AlertCircle, Building2 } from 'lucide-react';
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
      const res = await axiosClient.get('/products', { params: { limit: 100 } });
      if (res.data?.success) setProducts(res.data.data);
    } catch (err) {
      console.error('Fetch products error:', err);
    }
  }

  function addItemLine() {
    if (products.length === 0) return;
    const firstProd = products[0];
    setPurchaseItems([
      ...purchaseItems,
      {
        productId: firstProd.id,
        quantity: 10,
        unitPrice: Number(firstProd.purchase_price) || 50,
        gstRate: Number(firstProd.gst_rate) || 5,
      },
    ]);
  }

  function updateItemLine(index: number, field: string, value: any) {
    const updated = [...purchaseItems];
    updated[index] = { ...updated[index], [field]: value };
    // If product changed, update default unitPrice & gstRate
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Supplier Purchases & Receiving</h1>
          <p className="text-xs text-slate-500 mt-0.5">Record wholesale goods received and update warehouse inventory</p>
        </div>
        <button
          onClick={() => {
            setPurchaseItems([]);
            addItemLine();
            setAmountPaid(0);
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Record New Purchase</span>
        </button>
      </div>

      {/* Purchases Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="p-3">Purchase #</th>
                <th className="p-3">Supplier Invoice #</th>
                <th className="p-3">Date</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3 text-right">Total Amount (₹)</th>
                <th className="p-3 text-right">Amount Paid (₹)</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">Loading purchases...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">No purchases recorded yet.</td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-blue-700">{p.invoice_number}</td>
                    <td className="p-3 font-mono text-slate-600">{p.supplier_invoice_number || '-'}</td>
                    <td className="p-3 text-slate-600">{new Date(p.invoice_date).toLocaleDateString()}</td>
                    <td className="p-3 font-bold text-slate-900">{p.supplier_name}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">₹{Number(p.grand_total).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-emerald-700 font-semibold">₹{Number(p.amount_paid).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{p.received_by_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900 mb-3">Record Supplier Purchase Invoice</h2>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded bg-red-50 p-2.5 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                    className="w-full rounded border border-slate-300 p-2 font-bold text-slate-900"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company_name} ({s.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier Invoice Number</label>
                  <input
                    type="text"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    placeholder="e.g. WH-INV-9921"
                    className="w-full rounded border border-slate-300 p-2 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Purchase Items List */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200 font-bold text-slate-700">
                  <span>Items Received</span>
                  <button
                    type="button"
                    onClick={addItemLine}
                    className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-white text-[11px] font-bold"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Item</span>
                  </button>
                </div>

                {purchaseItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded border border-slate-200">
                    <div className="col-span-5">
                      <select
                        value={item.productId}
                        onChange={(e) => updateItemLine(idx, 'productId', e.target.value)}
                        className="w-full rounded border border-slate-300 p-1 font-semibold text-slate-900"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Barcode: {p.barcode})
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
                        className="w-full rounded border border-slate-300 p-1 text-center font-bold"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Cost"
                        value={item.unitPrice}
                        onChange={(e) => updateItemLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full rounded border border-slate-300 p-1 text-right font-medium"
                      />
                    </div>

                    <div className="col-span-2 text-center font-semibold text-slate-600">
                      {item.gstRate}% GST
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemLine(idx)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="text-right pt-2 font-bold text-slate-900 text-sm">
                  Estimated Total: ₹{computedTotal.toFixed(2)}
                </div>
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    placeholder={String(computedTotal)}
                    className="w-full rounded border border-slate-300 p-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full rounded border border-slate-300 p-2 text-slate-900"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash Drawer</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
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
