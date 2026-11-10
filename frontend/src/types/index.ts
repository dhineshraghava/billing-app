export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  roleId: number;
  roleName: 'ADMIN' | 'MANAGER' | 'CASHIER' | 'SALESPERSON' | 'INVENTORY_STAFF' | 'ACCOUNTANT';
  isActive: boolean;
}

export interface BusinessSettings {
  id: number;
  store_name: string;
  tagline?: string;
  gstin?: string;
  pan_number?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  state_code: string;
  pincode: string;
  phone: string;
  email?: string;
  website?: string;
  currency_symbol: string;
  currency_code: string;
  invoice_prefix: string;
  thermal_receipt_header?: string;
  thermal_receipt_footer?: string;
  loyalty_enabled?: boolean | number;
  loyalty_min_purchase?: number;
  loyalty_points_per_invoice?: number;
  loyalty_redemption_rate?: number;
  loyalty_redemption_enabled?: boolean | number;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  is_active: number;
}

export interface Unit {
  id: number;
  name: string;
  short_code: string;
  allows_decimal: number;
}

export interface Product {
  id: number;
  name: string;
  barcode: string;
  sku: string;
  category_id: number;
  category_name?: string;
  unit_id: number;
  unit_name?: string;
  unit_code?: string;
  allows_decimal?: number;
  hsn_code: string;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  gst_rate: number;
  is_tax_inclusive: number | boolean;
  discount_percent: number;
  current_stock: number;
  min_stock_qty: number;
  batch_tracking_enabled?: number | boolean;
  is_active: number | boolean;
  image_url?: string;
}

export interface CartItem {
  productId: number;
  name: string;
  barcode: string;
  sku?: string;
  hsnCode?: string;
  unitCode: string;
  allowsDecimal: boolean;
  unitPrice: number;
  mrp: number;
  gstRate: number;
  isTaxInclusive: boolean;
  quantity: number;
  discountPercent: number;
  discountAmount: number;
  currentStock: number;
  // Calculated values
  grossLineAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  state_code?: string;
  credit_limit: number;
  current_balance: number;
  loyalty_points: number;
}

export interface Supplier {
  id: number;
  name: string;
  company_name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  state?: string;
  state_code?: string;
  current_balance: number;
}

export interface FinancialAccount {
  id: number;
  account_name: string;
  account_type: 'CASH' | 'BANK' | 'UPI' | 'CARD';
  account_number?: string;
  bank_name?: string;
  upi_id?: string;
  current_balance: number;
}

export interface SaleInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  customer_gstin?: string;
  cashier_id: number;
  cashier_name?: string;
  status: 'COMPLETED' | 'HOLD' | 'CANCELLED' | 'RETURNED';
  subtotal: number;
  total_discount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  round_off: number;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'PAID' | 'PARTIAL' | 'UNPAID';
  payment_mode: string;
  notes?: string;
  item_count?: number;
  loyalty_points_earned?: number;
  loyalty_points_redeemed?: number;
  loyalty_discount_amount?: number;
  customer_points_before?: number;
  customer_points_after?: number;
}

export interface LoyaltyTransaction {
  id: number;
  customer_id: number;
  invoice_id?: number;
  transaction_type: 'EARN' | 'REDEEM' | 'REVERSAL' | 'ADJUSTMENT';
  points: number;
  rupee_value: number;
  description?: string;
  created_at: string;
  invoice_number?: string;
  invoice_total?: number;
}

export interface SaleInvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  item_name: string;
  hsn_code: string;
  unit_code: string;
  quantity: number;
  unit_price: number;
  mrp: number;
  discount_percent: number;
  discount_amount: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_tax: number;
  total_amount: number;
  returned_quantity: number;
  barcode?: string;
  sku?: string;
}

export interface Expense {
  id: number;
  expense_number: string;
  expense_date: string;
  category: string;
  title: string;
  description?: string;
  amount: number;
  payment_mode: string;
  account_name?: string;
  paid_to?: string;
  approved_by_name?: string;
}

export interface DashboardSummary {
  todaySales: {
    totalAmount: number;
    taxableAmount: number;
    totalTax: number;
    billCount: number;
  };
  monthSales: {
    totalAmount: number;
    billCount: number;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  todayPurchases: {
    totalAmount: number;
    count: number;
  };
  monthExpenses: {
    totalAmount: number;
  };
  financials: {
    cashBalance: number;
    bankBalance: number;
    upiBalance: number;
    totalLiquidBalance: number;
    estimatedGrossProfit: number;
  };
}
