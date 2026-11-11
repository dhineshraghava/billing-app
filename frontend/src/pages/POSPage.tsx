import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  User,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  Receipt,
  ShoppingCart,
  Layers,
  AlertCircle,
  Wallet,
  Split,
  Tag,
  PackagePlus,
  UserCheck,
  Star,
  Phone,
  UserPlus,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { Product, Customer, CartItem, SaleInvoice, SaleInvoiceItem, FinancialAccount } from '../types';
import { PrintReceiptModal } from '../components/Invoice/PrintReceiptModal';

export const POSPage: React.FC = () => {
  // State: Cart & Products
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Customers & Loyalty
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(1); // Walk-in
  const [customerPhoneInput, setCustomerPhoneInput] = useState<string>('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerLookupFeedback, setCustomerLookupFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [isRedeemingLoyalty, setIsRedeemingLoyalty] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Discounts & Settings
  const [billDiscountPercent, setBillDiscountPercent] = useState<number>(0);
  const [billDiscountAmount, setBillDiscountAmount] = useState<number>(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);

  // Held Bills
  const [heldBills, setHeldBills] = useState<{ id: string; customerId: number; items: CartItem[]; time: string; note?: string }[]>([]);

  // Checkout & Payment
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'SPLIT' | 'CREDIT'>('CASH');
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(1);
  const [tenderAmount, setTenderAmount] = useState<string>('');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Manual Item Modal
  const [showQuickItemModal, setShowQuickItemModal] = useState(false);
  const [quickItemData, setQuickItemData] = useState({
    name: '',
    price: 10,
    gstRate: 5,
    quantity: 1,
  });

  // Completed Invoice & Print Modal
  const [completedInvoice, setCompletedInvoice] = useState<SaleInvoice | null>(null);
  const [completedItems, setCompletedItems] = useState<SaleInvoiceItem[]>([]);
  const [completedPayments, setCompletedPayments] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>({});
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Focus ref for fast barcode scanning
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const focusBarcodeInput = () => {
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
        barcodeInputRef.current.select();
      }
    }, 50);
  };

  // Initial Load
  useEffect(() => {
    fetchCustomers();
    fetchAccounts();
    fetchStoreSettings();
    focusBarcodeInput();
  }, []);

  async function fetchCustomers() {
    try {
      const res = await axiosClient.get('/customers');
      if (res.data?.success && Array.isArray(res.data.data)) {
        const customerList = res.data.data;
        const walkin = customerList.find(
          (c: Customer) => c.id === 1 || c.phone === '9999999999' || c.name.toLowerCase().includes('walk-in')
        );
        const others = customerList.filter((c: Customer) => c !== walkin);
        const sorted = walkin ? [walkin, ...others] : customerList;
        setCustomers(sorted);
        setSelectedCustomerId((prev) => {
          if (prev && sorted.some((c: Customer) => c.id === prev)) return prev;
          return walkin ? walkin.id : 1;
        });
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }

  // Search Customer by Phone
  async function handleSearchCustomerPhone(phoneToSearch?: string) {
    const raw = (phoneToSearch !== undefined ? phoneToSearch : customerPhoneInput).trim();
    if (!raw) {
      setSelectedCustomerId(1);
      setCustomerPhoneInput('');
      setCustomerLookupFeedback(null);
      return;
    }

    if (raw === '9999999999') {
      setSelectedCustomerId(1);
      setCustomerLookupFeedback({ type: 'info', message: 'Walk-in Customer selected (Cash/Retail).' });
      setTimeout(() => setCustomerLookupFeedback(null), 3500);
      return;
    }

    setIsSearchingCustomer(true);
    setCustomerLookupFeedback(null);
    try {
      const res = await axiosClient.get(`/customers/by-phone/${encodeURIComponent(raw)}`);
      if (res.data?.success && res.data.data) {
        const found = res.data.data;
        setCustomers((prev) => {
          if (!prev.find((c) => c.id === found.id)) {
            return [...prev, found];
          }
          return prev.map((c) => (c.id === found.id ? { ...c, ...found } : c));
        });
        setSelectedCustomerId(found.id);
        setCustomerPhoneInput(found.phone);
        setCustomerLookupFeedback({
          type: 'success',
          message: `Found: ${found.name} (⭐ ${found.loyalty_points || 0} pts)`,
        });
        setTimeout(() => setCustomerLookupFeedback(null), 4000);
        focusBarcodeInput();
      }
    } catch (err: any) {
      setNewCustomerPhone(raw);
      setNewCustomerName('');
      setShowNewCustomerModal(true);
    } finally {
      setIsSearchingCustomer(false);
    }
  }

  // Quick Register Customer
  async function handleQuickRegisterCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setErrorMessage('Please provide customer name and phone number.');
      return;
    }
    try {
      const res = await axiosClient.post('/customers', {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
      });
      if (res.data?.success && res.data.data) {
        const created = res.data.data;
        setCustomers((prev) => {
          if (!prev.find((c) => c.id === created.id)) return [...prev, created];
          return prev.map((c) => (c.id === created.id ? created : c));
        });
        setSelectedCustomerId(created.id);
        setCustomerPhoneInput(created.phone);
        setShowNewCustomerModal(false);
        setCustomerLookupFeedback({
          type: 'success',
          message: `Registered: ${created.name} (⭐ ${created.loyalty_points || 0} pts)`,
        });
        setTimeout(() => setCustomerLookupFeedback(null), 4000);
        focusBarcodeInput();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to register customer');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  }

  async function fetchAccounts() {
    try {
      const res = await axiosClient.get('/accounts');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setAccounts(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedAccountId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  }

  async function fetchStoreSettings() {
    try {
      const res = await axiosClient.get('/settings');
      if (res.data?.success && res.data.data) setStoreSettings(res.data.data);
    } catch (err) {
      console.error('Error fetching store settings:', err);
    }
  }

  // Handle Search Input (Barcode or Name)
  async function handleSearch(term: string) {
    setSearchQuery(term);
    if (!term || term.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await axiosClient.get('/products', {
        params: { search: term.trim(), limit: 8, isActive: true },
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setSearchResults(res.data.data.filter((p: Product) => p && p.id));
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }

  // Barcode Scanner KeyPress (Enter triggers instant lookup & add)
  async function handleBarcodeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = searchQuery.trim();
      if (!code) return;

      try {
        const res = await axiosClient.get(`/products/barcode/${encodeURIComponent(code)}`);
        if (res.data?.success && res.data.data?.id) {
          const product = res.data.data;
          if (product.is_active === 0 || product.is_active === false) {
            setErrorMessage(`Product "${product.name}" is deactivated/inactive and cannot be billed.`);
            setTimeout(() => setErrorMessage(null), 3500);
            setSearchQuery('');
            setSearchResults([]);
            focusBarcodeInput();
            return;
          }
          if (Number(product.current_stock) <= 0) {
            setErrorMessage(`Cannot add "${product.name}": Product is OUT OF STOCK (Stock: 0).`);
            setTimeout(() => setErrorMessage(null), 3500);
            setSearchQuery('');
            setSearchResults([]);
            focusBarcodeInput();
            return;
          }
          addItemToCart(product);
          setSearchQuery('');
          setSearchResults([]);
          focusBarcodeInput();
        } else if (searchResults.length > 0 && searchResults[0]?.id) {
          addItemToCart(searchResults[0]);
          setSearchQuery('');
          setSearchResults([]);
          focusBarcodeInput();
        } else {
          setErrorMessage(`No product found for barcode "${code}".`);
          setTimeout(() => setErrorMessage(null), 3500);
          setSearchQuery('');
          setSearchResults([]);
          focusBarcodeInput();
        }
      } catch (err: any) {
        if (searchResults.length > 0 && searchResults[0]?.id) {
          addItemToCart(searchResults[0]);
          setSearchQuery('');
          setSearchResults([]);
          focusBarcodeInput();
        } else {
          const msg = err.response?.data?.message || `No product found for barcode "${code}".`;
          setErrorMessage(msg);
          setTimeout(() => setErrorMessage(null), 3500);
          setSearchQuery('');
          setSearchResults([]);
          focusBarcodeInput();
        }
      }
    }
  }

  // Add Item to Cart
  function addItemToCart(product?: Product, quantityToAdd = 1) {
    if (!product || !product.id) return;
    setErrorMessage(null);

    // Validate active status
    if (product.is_active === 0 || product.is_active === false) {
      setErrorMessage(`Product "${product.name}" is inactive/deactivated and cannot be billed.`);
      setTimeout(() => setErrorMessage(null), 3500);
      focusBarcodeInput();
      return;
    }

    // Validate stock
    const currentStock = Number(product.current_stock) || 0;
    if (currentStock <= 0) {
      setErrorMessage(`Cannot add "${product.name}": Product is OUT OF STOCK (0 available).`);
      setTimeout(() => setErrorMessage(null), 3500);
      focusBarcodeInput();
      return;
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item?.productId === product.id);

      if (existingIndex >= 0) {
        const existing = prevCart[existingIndex];
        const newQty = (existing.quantity || 0) + quantityToAdd;

        // Check against current stock
        if (newQty > currentStock) {
          setErrorMessage(`Cannot add more "${product.name}". Available stock is only ${currentStock} ${product.unit_code || 'PCS'}.`);
          setTimeout(() => setErrorMessage(null), 3500);
          return prevCart;
        }

        const updatedItem = calculateLineItem({
          ...existing,
          quantity: newQty,
        });

        const newCart = [...prevCart];
        newCart[existingIndex] = updatedItem;
        return newCart;
      } else {
        if (quantityToAdd > currentStock) {
          setErrorMessage(`Only ${currentStock} available in stock for "${product.name}".`);
          setTimeout(() => setErrorMessage(null), 3500);
          return prevCart;
        }

        const newItem = calculateLineItem({
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          sku: product.sku,
          hsnCode: product.hsn_code,
          unitCode: product.unit_code || 'PCS',
          allowsDecimal: Boolean(product.allows_decimal),
          unitPrice: Number(product.selling_price),
          mrp: Number(product.mrp || product.selling_price),
          gstRate: Number(product.gst_rate),
          isTaxInclusive: Boolean(product.is_tax_inclusive),
          quantity: quantityToAdd,
          discountPercent: Number(product.discount_percent || 0),
          discountAmount: 0,
          currentStock: currentStock,
          grossLineAmount: 0,
          taxableAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalTax: 0,
          totalAmount: 0,
        });

        return [...prevCart, newItem];
      }
    });

    focusBarcodeInput();
  }

  // Calculate Line Item (Tax Inclusive & Exclusive)
  function calculateLineItem(item: CartItem): CartItem {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const rate = Number(item.gstRate) || 0;

    const gross = Math.round((qty * price) * 100) / 100;
    let disc = 0;
    if (item.discountPercent > 0) {
      disc = Math.round(((gross * item.discountPercent) / 100) * 100) / 100;
    } else if (item.discountAmount > 0) {
      disc = Math.min(item.discountAmount, gross);
    }

    const net = Math.max(0, gross - disc);
    let taxable = net;
    let tax = 0;

    if (rate > 0) {
      if (item.isTaxInclusive) {
        taxable = Math.round((net / (1 + rate / 100)) * 100) / 100;
        tax = Math.round((net - taxable) * 100) / 100;
      } else {
        taxable = net;
        tax = Math.round(((taxable * rate) / 100) * 100) / 100;
      }
    }

    const cgst = Math.round((tax / 2) * 100) / 100;
    const sgst = Math.round((tax - cgst) * 100) / 100;

    return {
      ...item,
      grossLineAmount: gross,
      discountAmount: disc,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: 0,
      totalTax: tax,
      totalAmount: item.isTaxInclusive ? net : Math.round((taxable + tax) * 100) / 100,
    };
  }

  // Update Cart Item Quantity
  function updateQuantity(productId: number, newQty: number) {
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }

    setCart((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          if (newQty > it.currentStock) {
            setErrorMessage(`Cannot exceed current stock (${it.currentStock}) for ${it.name}`);
            setTimeout(() => setErrorMessage(null), 3000);
            return it;
          }
          return calculateLineItem({ ...it, quantity: newQty });
        }
        return it;
      })
    );
    focusBarcodeInput();
  }

  // Remove Item
  function removeItem(productId: number) {
    setCart((prev) => prev.filter((it) => it.productId !== productId));
    focusBarcodeInput();
  }

  // Clear Cart
  function clearCart() {
    setCart([]);
    setBillDiscountPercent(0);
    setBillDiscountAmount(0);
    setSelectedCustomerId(1);
    setCustomerPhoneInput('');
    setIsRedeemingLoyalty(false);
    setPointsToRedeem(0);
    setCustomerLookupFeedback(null);
    focusBarcodeInput();
  }

  // Hold Current Bill
  function holdCurrentBill() {
    if (cart.length === 0) return;
    const newHold = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      customerId: selectedCustomerId,
      items: cart,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHeldBills((prev) => [...prev, newHold]);
    clearCart();
  }

  // Resume Held Bill
  function resumeHeldBill(holdId: string) {
    const held = heldBills.find((b) => b.id === holdId);
    if (!held) return;
    setCart(held.items);
    setSelectedCustomerId(held.customerId);
    const matched = customers.find((c) => c.id === held.customerId);
    setCustomerPhoneInput(matched && matched.id !== 1 ? matched.phone : '');
    setHeldBills((prev) => prev.filter((b) => b.id !== holdId));
  }

  // Selected Customer details & Loyalty
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const isWalkIn = !selectedCustomer || selectedCustomer.id === 1 || selectedCustomer.phone === '9999999999';
  const availablePoints = isWalkIn ? 0 : Number(selectedCustomer?.loyalty_points || 0);

  // Cart Totals Calculation
  const subtotal = cart.reduce((acc, it) => acc + it.grossLineAmount, 0);
  const totalItemDiscount = cart.reduce((acc, it) => acc + it.discountAmount, 0);
  const preBillDiscountTotal = cart.reduce((acc, it) => acc + it.totalAmount, 0);

  let billDiscount = 0;
  if (billDiscountPercent > 0) {
    billDiscount = Math.round(((preBillDiscountTotal * billDiscountPercent) / 100) * 100) / 100;
  } else if (billDiscountAmount > 0) {
    billDiscount = Math.min(billDiscountAmount, preBillDiscountTotal);
  }

  const taxableAmount = cart.reduce((acc, it) => acc + it.taxableAmount, 0);
  const totalTax = cart.reduce((acc, it) => acc + it.totalTax, 0);
  const preLoyaltyGrandTotal = Math.max(0, preBillDiscountTotal - billDiscount);

  // Loyalty Program rules
  const minPurchaseForPoints = Number(storeSettings?.loyalty_min_purchase ?? 100);
  const pointsEarnable = (!isWalkIn && preLoyaltyGrandTotal > minPurchaseForPoints)
    ? Number(storeSettings?.loyalty_points_per_invoice ?? 1)
    : 0;

  const redemptionRate = Number(storeSettings?.loyalty_redemption_rate ?? 1);
  const maxRedeemablePoints = Math.min(availablePoints, Math.floor(preLoyaltyGrandTotal / (redemptionRate || 1)));
  const effectivePointsRedeemed = (isRedeemingLoyalty && !isWalkIn)
    ? Math.min(Number(pointsToRedeem) || 0, maxRedeemablePoints)
    : 0;
  const loyaltyDiscount = Math.round(effectivePointsRedeemed * redemptionRate * 100) / 100;

  const rawGrandTotal = Math.max(0, preLoyaltyGrandTotal - loyaltyDiscount);
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - (preBillDiscountTotal - billDiscount - loyaltyDiscount)) * 100) / 100;

  // Tender & Change calculation
  const numericTender = Number(tenderAmount) || grandTotal;
  const changeReturned = Math.max(0, numericTender - grandTotal);

  // Keyboard Shortcuts (F2: Search, F4: Hold, F8: Discount, F9: Checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        holdCurrentBill();
      } else if (e.key === 'F8') {
        e.preventDefault();
        setShowDiscountModal(true);
      } else if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (cart.length > 0 && !isSubmitting) {
          handleCompleteCheckout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, isSubmitting, selectedCustomerId, numericTender, paymentMode, splitCash, splitUpi, splitCard, billDiscountPercent, billDiscountAmount]);

  // Quick Manual Item Handler
  async function handleAddQuickItem(e: React.FormEvent) {
    e.preventDefault();
    if (!quickItemData.name.trim() || quickItemData.price <= 0) {
      setErrorMessage('Please enter an item name and a valid selling price.');
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    try {
      const barcode = `MISC-${Date.now().toString().slice(-6)}`;
      const res = await axiosClient.post('/products', {
        name: quickItemData.name.trim(),
        barcode,
        sku: `SKU-${barcode}`,
        categoryId: 1,
        unitId: 1,
        hsnCode: '2106',
        purchasePrice: Math.round(quickItemData.price * 0.8),
        sellingPrice: quickItemData.price,
        mrp: quickItemData.price,
        gstRate: quickItemData.gstRate,
        isTaxInclusive: true,
        discountPercent: 0,
        openingStock: 999,
        minStockQty: 0,
      });

      if (res.data?.success && res.data.data) {
        addItemToCart({
          id: res.data.data.id,
          name: quickItemData.name.trim(),
          barcode,
          sku: `SKU-${barcode}`,
          category_id: 1,
          unit_id: 1,
          unit_code: 'PCS',
          allows_decimal: false,
          hsn_code: '2106',
          purchase_price: Math.round(quickItemData.price * 0.8),
          selling_price: quickItemData.price,
          mrp: quickItemData.price,
          gst_rate: quickItemData.gstRate,
          is_tax_inclusive: true,
          discount_percent: 0,
          current_stock: 999,
          min_stock_qty: 0,
          is_active: 1,
        } as unknown as Product, quickItemData.quantity);

        setShowQuickItemModal(false);
        setQuickItemData({ name: '', price: 10, gstRate: 5, quantity: 1 });
      }
    } catch (err: any) {
      console.error('Quick item creation error:', err);
      setErrorMessage(err.response?.data?.message || 'Could not add manual item.');
      setTimeout(() => setErrorMessage(null), 3500);
    }
  }

  // Trigger Checkout
  async function handleCompleteCheckout() {
    if (cart.length === 0 || isSubmitting) return;

    const invalidItem = cart.find((it) => !it || !it.productId || it.quantity <= 0);
    if (invalidItem) {
      setErrorMessage(`Invalid item in cart: ${invalidItem?.name || 'Unknown item'}`);
      return;
    }

    if (paymentMode === 'CREDIT' && selectedCustomerId === 1) {
      setErrorMessage('Customer credit/khata cannot be assigned to Walk-in Customer. Please select a registered customer.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    if (paymentMode === 'SPLIT') {
      const splitTotal = Number(splitCash || 0) + Number(splitUpi || 0) + Number(splitCard || 0);
      if (Math.abs(splitTotal - grandTotal) > 0.05) {
        setErrorMessage(`Split payments sum (₹${splitTotal.toFixed(2)}) must equal grand total (₹${grandTotal.toFixed(2)}).`);
        setTimeout(() => setErrorMessage(null), 4000);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = `POS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      let paymentsPayload: any[] | undefined = undefined;
      if (paymentMode === 'SPLIT') {
        paymentsPayload = [];
        if (splitCash > 0) paymentsPayload.push({ mode: 'CASH', amount: splitCash, accountId: 1, tenderAmount: splitCash });
        if (splitUpi > 0) paymentsPayload.push({ mode: 'UPI', amount: splitUpi, accountId: 3, transactionRef });
        if (splitCard > 0) paymentsPayload.push({ mode: 'CARD', amount: splitCard, accountId: 2, transactionRef });
      }

      const payload = {
        customerId: selectedCustomerId || 1,
        items: cart.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          discountPercent: it.discountPercent || 0,
          discountAmount: it.discountAmount || 0,
        })),
        billDiscountPercent,
        billDiscountAmount: billDiscount,
        paymentMode,
        payments: paymentsPayload,
        tenderAmount: paymentMode === 'CREDIT' ? 0 : numericTender,
        accountId: selectedAccountId || 1,
        redeemPoints: isRedeemingLoyalty ? effectivePointsRedeemed : 0,
        idempotencyKey,
      };

      const res = await axiosClient.post('/sales', payload);

      if (res.data?.success) {
        const invoiceId = res.data.data?.invoiceId || res.data.data?.id;

        if (invoiceId) {
          try {
            const invDetailsRes = await axiosClient.get(`/sales/${invoiceId}`);
            if (invDetailsRes.data?.success && invDetailsRes.data.data) {
              const invData = invDetailsRes.data.data;
              setCompletedInvoice(invData.invoice || null);
              setCompletedItems(Array.isArray(invData.items) ? invData.items : []);
              setCompletedPayments(Array.isArray(invData.payments) ? invData.payments : []);
              setStoreSettings(invData.store || storeSettings);
              setIsPrintModalOpen(true);
            }
          } catch (invErr) {
            console.error('Invoice details fetch notice:', invErr);
          }
        }

        fetchCustomers();
        clearCart();
        setSplitCash(0);
        setSplitUpi(0);
        setSplitCard(0);
        setTransactionRef('');
      } else {
        setErrorMessage(res.data?.message || 'Checkout failed.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Checkout failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-4.75rem)] flex-col lg:flex-row gap-4 antialiased">
      {/* ============================================================== */}
      {/* LEFT COLUMN: SCANNER BAR, CART ITEMS TABLE, FOOTER SUMMARY     */}
      {/* ============================================================== */}
      <div className="flex flex-1 flex-col rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="border-b border-slate-200/80 bg-slate-50/70 p-3 sm:p-3.5 backdrop-blur-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Barcode / Search Box with Active Pulse State */}
            <div className="relative flex-1 min-w-[280px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 text-blue-700">
                  <Barcode className="h-4.5 w-4.5" />
                </div>
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan barcode with USB reader or type product name / SKU (Enter to add)..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-12 pr-24 text-sm sm:text-[15px] font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-medium focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-500/10 shadow-xs transition"
              />
              <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      barcodeInputRef.current?.focus();
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition text-sm font-bold"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
                <div className="hidden sm:inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-xs font-black">
                  <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Ready</span>
                </div>
              </div>

              {/* Instant Search Dropdown Results */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl divide-y divide-slate-100">
                  {searchResults.map((prod) => prod && prod.id ? (
                    <div
                      key={prod.id}
                      onClick={() => {
                        addItemToCart(prod);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="flex cursor-pointer items-center justify-between p-3.5 hover:bg-blue-50/70 transition group"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition">
                          <Barcode className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-sm text-slate-900 group-hover:text-blue-900">{prod.name}</div>
                          <div className="text-xs text-slate-600 font-mono flex items-center gap-2 mt-1">
                            <span>Barcode: <strong className="text-slate-900">{prod.barcode}</strong></span>
                            <span>•</span>
                            <span>HSN: <strong className="text-slate-800">{prod.hsn_code}</strong></span>
                            <span>•</span>
                            <span className="text-blue-700 font-bold">GST {prod.gst_rate}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-base text-slate-900 group-hover:text-blue-600 font-mono">
                          ₹{Number(prod.selling_price).toFixed(2)}
                        </div>
                        <div className={`text-xs font-extrabold mt-0.5 ${Number(prod.current_stock) > 5 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          Stock: {Number(prod.current_stock)} {prod.unit_code}
                        </div>
                      </div>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>

            {/* Customer Phone Search Pill */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 text-blue-700">
                <Phone className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Phone Lookup</span>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Mobile (10 digits)"
                    value={customerPhoneInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomerPhoneInput(val);
                      const digits = val.replace(/\D/g, '');
                      if (digits.length === 10) {
                        handleSearchCustomerPhone(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchCustomerPhone();
                      }
                    }}
                    className="w-32 bg-transparent text-sm font-extrabold text-slate-900 focus:outline-none placeholder:font-normal placeholder:text-slate-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleSearchCustomerPhone()}
                    disabled={isSearchingCustomer}
                    className="p-1 text-slate-400 hover:text-blue-600 transition"
                    title="Lookup customer"
                  >
                    <Search className={`h-4 w-4 ${isSearchingCustomer ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Customer Dropdown Pill */}
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-xs">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-blue-100 text-blue-700">
                <User className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Customer</span>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setSelectedCustomerId(id);
                    const c = customers.find((x) => x.id === id);
                    setCustomerPhoneInput(c && c.id !== 1 ? c.phone : '');
                    focusBarcodeInput();
                  }}
                  className="bg-transparent text-sm font-extrabold text-slate-900 focus:outline-none cursor-pointer max-w-[160px] truncate"
                >
                  {customers.map((c) => (c && c.id ? (
                    <option key={c.id} value={c.id}>
                      {c.id === 1 || c.phone === '9999999999'
                        ? 'Walk-in Customer'
                        : `${c.name} (${c.phone})`}
                    </option>
                  ) : null))}
                </select>
              </div>
              {selectedCustomerId === 1 ? (
                <span className="hidden sm:inline-flex rounded-md text-xs font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Cash/Retail
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-md bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black px-2 py-0.5 shadow-2xs" title="Customer Loyalty Points">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-600" />
                  <span>{availablePoints} pts</span>
                </span>
              )}
            </div>

            {/* Quick Register Customer Button */}
            <button
              type="button"
              onClick={() => {
                setNewCustomerName('');
                setNewCustomerPhone(customerPhoneInput || '');
                setShowNewCustomerModal(true);
              }}
              className="hidden xl:flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50 transition shadow-xs"
              title="Register new customer"
            >
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span>+ New Customer</span>
            </button>

            {/* Quick Item Addition Button */}
            <button
              onClick={() => setShowQuickItemModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-800 hover:bg-blue-100 transition shadow-xs"
              title="Add loose or custom item without barcode"
            >
              <PackagePlus className="h-4 w-4 text-blue-600" />
              <span>+ Quick Item</span>
            </button>

            {/* Hold / Resume & Clear Actions */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={holdCurrentBill}
                disabled={cart.length === 0}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-50 disabled:opacity-40 transition shadow-xs"
                title="Hold bill (F4) to serve another customer"
              >
                <Pause className="h-4 w-4 text-amber-600" />
                <span>Hold (F4)</span>
              </button>

              {heldBills.length > 0 && (
                <div className="flex items-center gap-1">
                  {heldBills.map((b) => b && b.id ? (
                    <button
                      key={b.id}
                      onClick={() => resumeHeldBill(b.id)}
                      className="flex items-center gap-1 rounded-xl bg-amber-500 px-2.5 py-2 text-xs font-extrabold text-white hover:bg-amber-600 shadow-xs transition"
                      title={`Resume ${b.id} (${b.items.length} items, held at ${b.time})`}
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>{b.id}</span>
                    </button>
                  ) : null)}
                </div>
              )}

              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition shadow-xs"
                title="Clear Cart"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Customer Feedback Toast */}
          {customerLookupFeedback && (
            <div className={`mt-2.5 flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold border ${
              customerLookupFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : customerLookupFeedback.type === 'info'
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{customerLookupFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setCustomerLookupFeedback(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Cart Items Table */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-12 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-blue-100 blur-xl opacity-60" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 border border-slate-300/60 shadow-inner">
                  <ShoppingCart className="h-10 w-10 text-slate-400 stroke-1" />
                </div>
              </div>
              <h3 className="font-bold text-slate-800 text-base">Shopping Cart is Ready</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Scan product barcodes with your USB scanner or type in the search bar above to begin billing.
              </p>
              <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-700 border border-slate-200">F2: Barcode Focus</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-700 border border-slate-200">F4: Hold Bill</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-slate-700 border border-slate-200">F9: Checkout</span>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-800 font-black border-b border-slate-300 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Product Name &amp; Barcode</th>
                  <th className="p-3 text-center">HSN</th>
                  <th className="p-3 text-center w-36">Quantity</th>
                  <th className="p-3 text-right">Price (₹)</th>
                  <th className="p-3 text-center">Discount</th>
                  <th className="p-3 text-center">GST %</th>
                  <th className="p-3 text-right">Total (₹)</th>
                  <th className="p-3 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cart.map((item, index) => (
                  <tr key={item.productId} className="hover:bg-blue-50/50 transition">
                    <td className="p-3 text-center font-bold text-slate-500 font-mono text-xs">{index + 1}</td>
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900 text-[15px] leading-snug">{item.name}</div>
                      <div className="text-xs font-mono text-slate-600 flex items-center gap-2 mt-1">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-800 font-bold border border-slate-300">
                          {item.barcode || item.sku || '-'}
                        </span>
                        {item.currentStock <= item.quantity && (
                          <span className="text-xs font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Max Stock</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700 text-xs">{item.hsnCode || '-'}</td>
                    
                    {/* Quantity Stepper */}
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white shadow-xs overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.productId, item.allowsDecimal ? item.quantity - 0.25 : item.quantity - 1)}
                          className="px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 transition font-bold"
                          title="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          step={item.allowsDecimal ? '0.1' : '1'}
                          min="0.001"
                          max={item.currentStock}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                          className="w-14 text-center font-black text-slate-900 text-sm py-1 focus:outline-none font-mono"
                        />
                        <button
                          onClick={() => updateQuantity(item.productId, item.allowsDecimal ? item.quantity + 0.25 : item.quantity + 1)}
                          className="px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 transition font-bold"
                          title="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="ml-1.5 text-xs text-slate-700 font-bold">{item.unitCode}</span>
                    </td>

                    <td className="p-3 text-right font-extrabold text-slate-900 text-sm font-mono">
                      ₹{item.unitPrice.toFixed(2)}
                    </td>

                    {/* Line Discount */}
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <span className={`text-xs ${item.discountPercent > 0 || item.discountAmount > 0 ? 'text-emerald-800 font-black' : 'text-slate-400 font-mono font-bold'}`}>
                          {item.discountPercent > 0 ? `${item.discountPercent}%` : item.discountAmount > 0 ? `₹${item.discountAmount.toFixed(2)}` : '-'}
                        </span>
                        <button
                          onClick={() => {
                            const disc = prompt(`Enter item discount % for "${item.name}":`, String(item.discountPercent || 0));
                            if (disc !== null) {
                              const val = Math.min(100, Math.max(0, parseFloat(disc) || 0));
                              setCart((prev) =>
                                prev.map((it) =>
                                  it.productId === item.productId
                                    ? calculateLineItem({ ...it, discountPercent: val, discountAmount: 0 })
                                    : it
                                )
                              );
                              focusBarcodeInput();
                            }
                          }}
                          className="rounded-md p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                          title="Apply line discount (%)"
                        >
                          <Tag className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="p-3 text-center">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-extrabold text-slate-800 border border-slate-300">
                        {item.gstRate}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-black text-slate-900 text-sm sm:text-base font-mono">
                      ₹{item.totalAmount.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cart Bottom Summary Bar */}
        <div className="border-t border-slate-300 bg-slate-100/90 px-4 py-3 flex items-center justify-between text-xs sm:text-sm text-slate-700 font-bold">
          <div className="flex items-center gap-3">
            <span>Items: <strong className="text-slate-900 font-mono text-sm">{cart.length}</strong></span>
            <span>•</span>
            <span>Total Qty: <strong className="text-slate-900 font-mono text-sm">{cart.reduce((s, x) => s + Number(x.quantity), 0).toFixed(2)}</strong></span>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm font-bold text-slate-700">
            <span>Taxable: <strong className="text-slate-900 font-mono text-sm">₹{taxableAmount.toFixed(2)}</strong></span>
            <span>Total GST: <strong className="text-slate-900 font-mono text-sm">₹{totalTax.toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* RIGHT COLUMN: BILL SUMMARY & CHECKOUT PANEL                    */}
      {/* ============================================================== */}
      <div className="flex w-full lg:w-96 flex-col justify-between rounded-2xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-5">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                <Receipt className="h-4.5 w-4.5" />
              </div>
              <span>Bill Summary</span>
            </h2>
            <button
              onClick={() => setShowDiscountModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-extrabold text-blue-800 hover:bg-blue-200 transition shadow-2xs"
            >
              <Percent className="h-3.5 w-3.5" />
              <span>Discount (F8)</span>
            </button>
          </div>

          {/* Breakdown Lines */}
          <div className="mt-4 space-y-2.5 text-sm font-bold">
            <div className="flex justify-between text-slate-700">
              <span>Gross Subtotal:</span>
              <span className="font-black text-slate-900 font-mono text-sm">₹{subtotal.toFixed(2)}</span>
            </div>

            {totalItemDiscount > 0 && (
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Item Level Discounts:</span>
                <span className="font-mono font-black text-sm">-₹{totalItemDiscount.toFixed(2)}</span>
              </div>
            )}

            {billDiscount > 0 && (
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Bill Discount {billDiscountPercent > 0 ? `(${billDiscountPercent}%)` : ''}:</span>
                <span className="font-mono font-black text-sm">-₹{billDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-700">
              <span>Taxable Value:</span>
              <span className="font-black text-slate-900 font-mono text-sm">₹{taxableAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-700">
              <span>GST (CGST + SGST):</span>
              <span className="font-black text-slate-900 font-mono text-sm">₹{totalTax.toFixed(2)}</span>
            </div>

            {roundOff !== 0 && (
              <div className="flex justify-between text-slate-600 text-xs font-semibold">
                <span>Round Off:</span>
                <span className="font-mono font-bold">{roundOff > 0 ? `+₹${roundOff.toFixed(2)}` : `-₹${Math.abs(roundOff).toFixed(2)}`}</span>
              </div>
            )}

            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-amber-900 font-extrabold pt-2 border-t border-amber-200">
                <span className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-600" />
                  Loyalty Points ({effectivePointsRedeemed} pts):
                </span>
                <span className="font-mono font-black text-emerald-800 text-sm">-₹{loyaltyDiscount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Customer Loyalty Rewards Card */}
          {selectedCustomerId !== 1 && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/60 p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="p-1.5 rounded-lg bg-amber-200 text-amber-800">
                    <Star className="h-4 w-4 fill-amber-500 text-amber-700" />
                  </div>
                  <span className="text-sm font-black text-amber-950">Loyalty Rewards</span>
                </div>
                <span className="text-sm font-black font-mono text-amber-950 bg-amber-200 border border-amber-400 px-2.5 py-1 rounded-lg">
                  {availablePoints} pts balance
                </span>
              </div>

              {/* Points to earn on this bill */}
              <div className="mt-2.5 flex items-center justify-between text-xs font-bold text-amber-950 border-t border-amber-200 pt-2">
                <span>Earn on this bill:</span>
                <span className={`font-black font-mono ${pointsEarnable > 0 ? 'text-emerald-800' : 'text-slate-600'}`}>
                  {pointsEarnable > 0 ? `+${pointsEarnable} pt (Bill > ₹${minPurchaseForPoints})` : `0 pts (Min ₹${minPurchaseForPoints})`}
                </span>
              </div>

              {/* Redemption Option */}
              {availablePoints > 0 && maxRedeemablePoints > 0 && (
                <div className="mt-2.5 pt-2 border-t border-amber-200">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isRedeemingLoyalty}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsRedeemingLoyalty(checked);
                        if (checked) {
                          setPointsToRedeem(maxRedeemablePoints);
                        } else {
                          setPointsToRedeem(0);
                        }
                      }}
                      className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span className="text-xs font-black text-amber-950">Redeem Points (1 pt = ₹{redemptionRate})</span>
                  </label>

                  {isRedeemingLoyalty && (
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={1}
                          max={maxRedeemablePoints}
                          value={pointsToRedeem}
                          onChange={(e) => {
                            const val = Math.max(0, Math.min(maxRedeemablePoints, parseInt(e.target.value, 10) || 0));
                            setPointsToRedeem(val);
                          }}
                          className="w-18 rounded-lg border border-amber-400 bg-white px-2.5 py-1.5 text-sm font-black text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center font-mono"
                        />
                        <span className="text-xs font-black text-amber-900">pts</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-800 font-mono">-₹{loyaltyDiscount.toFixed(2)}</div>
                        <button
                          type="button"
                          onClick={() => setPointsToRedeem(maxRedeemablePoints)}
                          className="text-xs font-black text-amber-900 hover:text-amber-950 underline"
                        >
                          Use Max ({maxRedeemablePoints})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* High-Impact Net Payable Banner */}
          <div className="mt-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-4 text-center text-white shadow-xl relative overflow-hidden border border-blue-900/50">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 h-24 w-24 rounded-full bg-blue-500/20 blur-xl pointer-events-none" />
            <div className="text-xs uppercase font-extrabold tracking-widest text-blue-200">Net Payable Amount</div>
            <div className="mt-1 text-3xl sm:text-4xl font-black tracking-tight font-mono text-white">
              ₹{grandTotal.toFixed(2)}
            </div>
            <div className="text-xs text-slate-300 font-semibold mt-1">Inclusive of GST and applicable round off</div>
          </div>

          {/* Payment Method Pills */}
          <div className="mt-4">
            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Select Payment Method</label>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => setPaymentMode('CASH')}
                className={`flex flex-col items-center justify-center rounded-xl border py-2.5 text-xs font-extrabold transition ${
                  paymentMode === 'CASH'
                    ? 'border-emerald-600 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-500/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title="Cash Tender"
              >
                <Banknote className="h-4.5 w-4.5 mb-1 text-emerald-700" />
                <span className="text-[11px] font-extrabold">Cash</span>
              </button>

              <button
                onClick={() => setPaymentMode('UPI')}
                className={`flex flex-col items-center justify-center rounded-xl border py-2.5 text-xs font-extrabold transition ${
                  paymentMode === 'UPI'
                    ? 'border-blue-600 bg-blue-100 text-blue-950 ring-2 ring-blue-500/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title="UPI / QR Code"
              >
                <QrCode className="h-4.5 w-4.5 mb-1 text-blue-700" />
                <span className="text-[11px] font-extrabold">UPI</span>
              </button>

              <button
                onClick={() => setPaymentMode('CARD')}
                className={`flex flex-col items-center justify-center rounded-xl border py-2.5 text-xs font-extrabold transition ${
                  paymentMode === 'CARD'
                    ? 'border-purple-600 bg-purple-100 text-purple-950 ring-2 ring-purple-500/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title="Debit / Credit Card"
              >
                <CreditCard className="h-4.5 w-4.5 mb-1 text-purple-700" />
                <span className="text-[11px] font-extrabold">Card</span>
              </button>

              <button
                onClick={() => setPaymentMode('CREDIT')}
                className={`flex flex-col items-center justify-center rounded-xl border py-2.5 text-xs font-extrabold transition ${
                  paymentMode === 'CREDIT'
                    ? 'border-amber-600 bg-amber-100 text-amber-950 ring-2 ring-amber-500/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title="Customer Khata / Credit"
              >
                <Wallet className="h-4.5 w-4.5 mb-1 text-amber-700" />
                <span className="text-[11px] font-extrabold">Khata</span>
              </button>

              <button
                onClick={() => setPaymentMode('SPLIT')}
                className={`flex flex-col items-center justify-center rounded-xl border py-2.5 text-xs font-extrabold transition ${
                  paymentMode === 'SPLIT'
                    ? 'border-indigo-600 bg-indigo-100 text-indigo-950 ring-2 ring-indigo-500/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                title="Split Payment"
              >
                <Split className="h-4.5 w-4.5 mb-1 text-indigo-700" />
                <span className="text-[11px] font-extrabold">Split</span>
              </button>
            </div>
          </div>

          {/* Cash Tender & Change Calculator */}
          {paymentMode === 'CASH' && (
            <div className="mt-4 rounded-xl border border-slate-300 bg-slate-100/80 p-3.5 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-slate-800 text-sm">Cash Received (₹):</span>
                <input
                  type="number"
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  placeholder={String(grandTotal)}
                  className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-right font-black text-slate-900 text-base focus:outline-none focus:border-blue-600 font-mono shadow-xs"
                />
              </div>

              {/* Fast Cash Denominations */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[grandTotal, 100, 200, 500, 2000].map((amt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTenderAmount(String(amt))}
                    className="rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-xs font-black text-slate-800 hover:bg-slate-200 shadow-2xs transition font-mono"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-slate-700 pt-2.5 border-t border-slate-300">
                <span className="font-extrabold text-sm">Change to Return:</span>
                <span className={`font-black font-mono text-base ${changeReturned > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                  ₹{changeReturned.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* UPI Reference & Dynamic QR Helper */}
          {paymentMode === 'UPI' && (
            <div className="mt-3.5 rounded-xl border border-blue-200/90 bg-blue-50/60 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-blue-900 block">UPI QR Scan &amp; Pay</span>
                  <span className="text-[10px] text-blue-700 font-mono">VPA: supermart@hdfcbank</span>
                </div>
                <div className="h-9 w-9 bg-white rounded-lg border border-blue-200 p-1 flex items-center justify-center shadow-2xs">
                  <QrCode className="h-7 w-7 text-blue-700" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">UPI / UTR Reference No. (Optional)</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. 429381029384"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Card Reference */}
          {paymentMode === 'CARD' && (
            <div className="mt-3.5 rounded-xl border border-purple-200/90 bg-purple-50/60 p-3 text-xs space-y-2">
              <span className="font-extrabold text-purple-900 block">Card Swipe / Tap Terminal</span>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Transaction Ref / Last 4 Digits</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. AUTH-9821 or 4321"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* Customer Khata / Credit Info */}
          {paymentMode === 'CREDIT' && (
            <div className="mt-3.5 rounded-xl border border-amber-300/90 bg-amber-50/70 p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <UserCheck className="h-4 w-4 text-amber-700" />
                <span>Customer Credit Account (Khata)</span>
              </div>
              {selectedCustomerId === 1 ? (
                <p className="text-[11px] text-rose-600 font-bold">
                  ⚠️ Cannot bill on Khata for Walk-in customer. Please select a registered customer above.
                </p>
              ) : (
                <div className="text-[11px] text-slate-700 space-y-0.5 pt-1">
                  <div>Customer: <strong className="text-slate-900">{customers.find(c => c.id === selectedCustomerId)?.name}</strong></div>
                  <div>Outstanding Khata: <strong className="font-mono text-rose-700">₹{Number(customers.find(c => c.id === selectedCustomerId)?.current_balance || 0).toFixed(2)}</strong></div>
                  <div className="text-amber-900 font-semibold pt-1">
                    Bill amount of ₹{grandTotal.toFixed(2)} will be debited to customer's account.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Split Payment Allocation */}
          {paymentMode === 'SPLIT' && (
            <div className="mt-3.5 rounded-xl border border-indigo-200/90 bg-indigo-50/60 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-900">Split Breakdown</span>
                <span className={`text-[10px] font-bold ${Math.abs(grandTotal - (Number(splitCash) + Number(splitUpi) + Number(splitCard))) < 0.05 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  Remaining: ₹{Math.max(0, grandTotal - (Number(splitCash) + Number(splitUpi) + Number(splitCard))).toFixed(2)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">Cash (₹)</label>
                  <input
                    type="number"
                    value={splitCash || ''}
                    onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">UPI (₹)</label>
                  <input
                    type="number"
                    value={splitUpi || ''}
                    onChange={(e) => setSplitUpi(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600">Card (₹)</label>
                  <input
                    type="number"
                    value={splitCard || ''}
                    onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-800 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Complete Checkout Button */}
        <div className="pt-3.5 border-t border-slate-200/80">
          <button
            onClick={handleCompleteCheckout}
            disabled={cart.length === 0 || isSubmitting}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 py-3.5 text-base font-extrabold uppercase tracking-wide text-white shadow-xl shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none transition"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 stroke-[2.5]" />
                <span>Complete Sale (₹{grandTotal.toFixed(2)})</span>
                <span className="ml-1 rounded-md bg-emerald-800/80 px-2 py-0.5 text-xs font-mono font-black border border-emerald-400/40">F9</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bill Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-sm mb-3">Apply Bill Level Discount</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Percentage Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={billDiscountPercent}
                  onChange={(e) => {
                    setBillDiscountPercent(parseFloat(e.target.value) || 0);
                    setBillDiscountAmount(0);
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 font-bold font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Or Flat Discount Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={billDiscountAmount}
                  onChange={(e) => {
                    setBillDiscountAmount(parseFloat(e.target.value) || 0);
                    setBillDiscountPercent(0);
                  }}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 font-bold font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setBillDiscountPercent(0);
                  setBillDiscountAmount(0);
                  setShowDiscountModal(false);
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Reset
              </button>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-black text-white hover:bg-blue-700 transition shadow-xs"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Manual Item Modal */}
      {showQuickItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
              <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                <PackagePlus className="h-4 w-4" />
              </div>
              <span>Add Quick / Manual Item</span>
            </h3>
            <form onSubmit={handleAddQuickItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Name / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fresh Lemons (Loose) or Cloth Bag"
                  value={quickItemData.name}
                  onChange={(e) => setQuickItemData(d => ({ ...d, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    value={quickItemData.price}
                    onChange={(e) => setQuickItemData(d => ({ ...d, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-black text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quickItemData.quantity}
                    onChange={(e) => setQuickItemData(d => ({ ...d, quantity: parseInt(e.target.value, 10) || 1 }))}
                    className="w-full rounded-lg border border-slate-300 p-2 font-black text-slate-900 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">GST Tax Slab</label>
                <select
                  value={quickItemData.gstRate}
                  onChange={(e) => setQuickItemData(d => ({ ...d, gstRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-900 font-semibold"
                >
                  <option value={0}>0% (Tax Exempt / Fresh Produce)</option>
                  <option value={5}>5% (Essential FMCG / Groceries)</option>
                  <option value={12}>12% (Standard FMCG / Snacks)</option>
                  <option value={18}>18% (Packaged / Consumer Goods)</option>
                  <option value={28}>28% (Luxury / Aerated Drinks)</option>
                </select>
              </div>
              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickItemModal(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-black text-white hover:bg-blue-700 shadow-xs transition"
                >
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Customer Register Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Register New Customer</h3>
                  <p className="text-[11px] text-slate-500">Quickly enroll customer to earn loyalty points</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCustomerModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickRegisterCustomer} className="mt-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Customer Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-black text-white hover:bg-blue-700 shadow-xs transition"
                >
                  Save &amp; Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Receipt Modal (Auto-pops up after checkout) */}
      {isPrintModalOpen && completedInvoice && (
        <PrintReceiptModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          invoice={completedInvoice}
          items={completedItems}
          payments={completedPayments}
          store={storeSettings}
        />
      )}
    </div>
  );
};
