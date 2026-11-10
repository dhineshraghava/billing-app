import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  CheckCircle,
  XCircle,
  Barcode,
  Layers,
  ArrowUpDown,
  AlertCircle,
  Download,
  Upload,
  Printer,
  RefreshCw,
  X,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { Product, Category, Unit } from '../types';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Barcode Label Print Modal
  const [barcodeLabelProduct, setBarcodeLabelProduct] = useState<Product | null>(null);
  const [labelCopies, setLabelCopies] = useState<number>(4);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    barcode: '',
    sku: '',
    categoryId: 1,
    unitId: 1,
    hsnCode: '2106',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    gstRate: 5,
    isTaxInclusive: true,
    discountPercent: 0,
    openingStock: 0,
    minStockQty: 5,
  });

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, stockStatus, page]);

  async function fetchMetadata() {
    try {
      const [catRes, unitRes] = await Promise.all([
        axiosClient.get('/categories'),
        axiosClient.get('/units'),
      ]);
      if (catRes.data?.success) setCategories(catRes.data.data);
      if (unitRes.data?.success) setUnits(unitRes.data.data);
    } catch (err) {
      console.error('Metadata error:', err);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await axiosClient.get('/products', {
        params: {
          search: search.trim() || undefined,
          categoryId: selectedCategory || undefined,
          stockStatus: stockStatus || undefined,
          page,
          limit: 20,
        },
      });

      if (res.data?.success) {
        setProducts(res.data.data);
        setTotalPages(res.data.pagination.totalPages || 1);
        setTotalRecords(res.data.pagination.totalRecords || 0);
      }
    } catch (err) {
      console.error('Products fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      barcode: `890${Date.now().toString().slice(-10)}`, // Auto generate Indian EAN prefix
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      categoryId: categories[0]?.id || 1,
      unitId: units[0]?.id || 1,
      hsnCode: '2106',
      purchasePrice: 0,
      sellingPrice: 0,
      mrp: 0,
      gstRate: 5,
      isTaxInclusive: true,
      discountPercent: 0,
      openingStock: 10,
      minStockQty: 5,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(prod: Product) {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      brand: (prod as any).brand || '',
      barcode: prod.barcode,
      sku: prod.sku,
      categoryId: prod.category_id,
      unitId: prod.unit_id,
      hsnCode: prod.hsn_code,
      purchasePrice: Number(prod.purchase_price),
      sellingPrice: Number(prod.selling_price),
      mrp: Number(prod.mrp),
      gstRate: Number(prod.gst_rate),
      isTaxInclusive: Boolean(prod.is_tax_inclusive),
      discountPercent: Number(prod.discount_percent),
      openingStock: Number(prod.current_stock),
      minStockQty: Number(prod.min_stock_qty),
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.barcode) {
      setFormError('Product Name and Barcode are required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (editingProduct) {
        // Update
        const res = await axiosClient.put(`/products/${editingProduct.id}`, formData);
        if (res.data?.success) {
          setIsModalOpen(false);
          fetchProducts();
        }
      } else {
        // Create
        const res = await axiosClient.post('/products', formData);
        if (res.data?.success) {
          setIsModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save product.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleStatus(productId: number, currentActive: boolean) {
    try {
      await axiosClient.patch(`/products/${productId}/status`, { isActive: !currentActive });
      fetchProducts();
    } catch (err) {
      console.error('Status change error:', err);
    }
  }

  async function handleExportCsv() {
    try {
      const res = await axiosClient.get('/products/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `supermart_products_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          alert('CSV file is empty or missing headers.');
          return;
        }

        const importedProducts = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (cols.length >= 2 && cols[0] && cols[1]) {
            importedProducts.push({
              barcode: cols[0],
              name: cols[1],
              brand: cols[2] || '',
              sku: cols[3] || '',
              category: cols[4] || '',
              unit: cols[5] || 'PCS',
              hsnCode: cols[6] || '2106',
              purchasePrice: parseFloat(cols[7]) || 0,
              sellingPrice: parseFloat(cols[8]) || 0,
              mrp: parseFloat(cols[9]) || 0,
              gstRate: parseFloat(cols[10]) || 0,
              currentStock: parseFloat(cols[13]) || 0,
              minStock: parseFloat(cols[14]) || 5,
            });
          }
        }

        if (importedProducts.length > 0) {
          const res = await axiosClient.post('/products/import', { products: importedProducts });
          alert(res.data?.message || 'Products processed successfully.');
          fetchProducts();
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to import CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Product Catalog & Master List</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage supermarket products, barcodes, GST rates and pricing</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCsv}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title="Import products from CSV spreadsheet"
          >
            <Upload className="h-3.5 w-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            title="Export full catalog to CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by product name, barcode or SKU..."
              className="w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-none"
          >
            <option value="">All Stock Levels</option>
            <option value="low">Low Stock (≤ Minimum)</option>
            <option value="out">Out of Stock (0 Quantity)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="p-3">Product Name</th>
                <th className="p-3">Barcode / SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Unit</th>
                <th className="p-3 text-right">Cost (₹)</th>
                <th className="p-3 text-right">Price (₹)</th>
                <th className="p-3 text-center">GST %</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Loading products from MySQL...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    No products matched your search criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      <div className="text-[10px] text-slate-400">HSN: {p.hsn_code}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      <div>{p.barcode}</div>
                      <div className="text-[10px] text-slate-400">{p.sku}</div>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">{p.category_name}</td>
                    <td className="p-3 text-center">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
                        {p.unit_code}
                      </span>
                    </td>
                    <td className="p-3 text-right font-medium text-slate-600">₹{Number(p.purchase_price).toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">₹{Number(p.selling_price).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-800 font-bold">
                        {p.gst_rate}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${
                          p.current_stock <= 0
                            ? 'bg-red-100 text-red-800'
                            : p.current_stock <= p.min_stock_qty
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {Number(p.current_stock)} {p.unit_code}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleStatus(p.id, Boolean(p.is_active))}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          p.is_active ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {p.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span>{p.is_active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setBarcodeLabelProduct(p)}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                          title="Print Barcode Label Sticker"
                        >
                          <Barcode className="h-4 w-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => openEditModal(p)}
                          className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <div>
            Showing <strong className="text-slate-900">{products.length}</strong> of{' '}
            <strong className="text-slate-900">{totalRecords}</strong> products
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

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Amul Butter 500g"
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">Barcode (EAN-13) *</label>
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, barcode: `890${Date.now().toString().slice(-10)}` }))}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      title="Auto-generate standard barcode"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>Auto Gen</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="e.g. Amul, Nestle, Britannia"
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measurement *</label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.short_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-semibold text-slate-900"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    disabled={!!editingProduct}
                    value={formData.openingStock}
                    onChange={(e) => setFormData({ ...formData, openingStock: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Stock Alert</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.minStockQty}
                    onChange={(e) => setFormData({ ...formData, minStockQty: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-slate-300 p-2 text-slate-900"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="taxInclusive"
                    checked={formData.isTaxInclusive}
                    onChange={(e) => setFormData({ ...formData, isTaxInclusive: e.target.checked })}
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <label htmlFor="taxInclusive" className="font-semibold text-slate-700">
                    Selling Price is Tax-Inclusive (GST Included)
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Sticker Label Print Modal */}
      {barcodeLabelProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:p-0 print:bg-white">
          <div className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl print:shadow-none print:max-w-none print:p-0">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Print Barcode Price Labels</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span>Copies:</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={labelCopies}
                    onChange={(e) => setLabelCopies(parseInt(e.target.value, 10) || 1)}
                    className="w-14 rounded border border-slate-300 p-1 text-center font-bold"
                  />
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Labels</span>
                </button>
                <button
                  onClick={() => setBarcodeLabelProduct(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Labels Grid Preview */}
            <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto p-2 border border-slate-100 bg-slate-50 rounded-lg print:border-none print:bg-white print:grid-cols-3 print:gap-4 print:max-h-none">
              {Array.from({ length: labelCopies }).map((_, idx) => (
                <div
                  key={idx}
                  className="border border-slate-300 bg-white p-3 rounded shadow-xs flex flex-col items-center justify-center text-center text-slate-900 print:border-slate-800"
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">SuperMart Hypermarket</div>
                  <div className="text-xs font-bold text-slate-900 truncate max-w-[190px] mt-0.5">{barcodeLabelProduct.name}</div>
                  
                  {/* Visual Barcode Bars */}
                  <div className="my-1.5 flex h-9 w-44 items-center justify-center gap-[2px] bg-white px-2">
                    {Array.from({ length: 30 }).map((_, bIdx) => (
                      <div
                        key={bIdx}
                        className={`h-full ${bIdx % 2 === 0 ? (bIdx % 4 === 0 ? 'w-[3px]' : 'w-[1.5px]') : 'w-[1px]'} bg-black`}
                      />
                    ))}
                  </div>
                  <div className="font-mono text-[10px] tracking-widest font-bold text-slate-800">{barcodeLabelProduct.barcode}</div>
                  <div className="mt-1 flex items-center justify-between w-full px-2 text-[11px] font-bold">
                    <span className="text-slate-400 line-through">MRP: ₹{Number(barcodeLabelProduct.mrp || barcodeLabelProduct.selling_price).toFixed(2)}</span>
                    <span className="text-blue-900 text-xs">Our Price: ₹{Number(barcodeLabelProduct.selling_price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
