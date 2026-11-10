import { query } from '../config/db.js';
import SalesService from '../services/salesService.js';

async function testKhataSale() {
  try {
    console.log('--- Testing Khata / Credit Sale Transaction ---');
    // 1. Find customer Roshan
    const customers = await query("SELECT id, name, current_balance FROM customers WHERE name LIKE '%roshan%' OR phone LIKE '%9742762826%' LIMIT 1");
    if (!customers || customers.length === 0) {
      console.log('Roshan not found, picking first registered customer (id > 1)');
    }
    const customer = (customers && customers.length > 0) ? customers[0] : (await query('SELECT id, name, current_balance FROM customers WHERE id > 1 LIMIT 1'))[0];
    console.log(`Using Customer: ${customer.name} (ID: ${customer.id}, Initial Balance: ₹${customer.current_balance})`);

    // 2. Find product Super Premium Basmati Rice
    const products = await query("SELECT id, name, selling_price, current_stock FROM products WHERE name LIKE '%Basmati%' LIMIT 1");
    const product = (products && products.length > 0) ? products[0] : (await query('SELECT id, name, selling_price, current_stock FROM products LIMIT 1'))[0];
    console.log(`Using Product: ${product.name} (ID: ${product.id}, Price: ₹${product.selling_price}, Stock: ${product.current_stock})`);

    const initialCustomerBalance = Number(customer.current_balance);
    const initialStock = Number(product.current_stock);

    // 3. Execute checkoutSale with paymentMode: 'CREDIT'
    const saleResult = await SalesService.checkoutSale({
      customerId: customer.id,
      cashierId: 1,
      items: [
        {
          productId: product.id,
          quantity: 1,
          discountPercent: 0,
          discountAmount: 0,
        }
      ],
      billDiscountPercent: 0,
      billDiscountAmount: 0,
      paymentMode: 'CREDIT',
      tenderAmount: 0,
      accountId: 1,
      notes: 'Test Khata billing checkout',
    });

    console.log('Sale checkout successful!');
    console.log('Invoice Result:', {
      invoiceId: saleResult.invoiceId,
      invoiceNumber: saleResult.invoiceNumber,
      grandTotal: saleResult.grandTotal,
      totalPaid: saleResult.totalPaid,
      balanceDue: saleResult.balanceDue,
      paymentStatus: saleResult.paymentStatus,
    });

    // 4. Verify in DB
    const [invRow] = await query('SELECT id, invoice_number, payment_mode, payment_status, grand_total, amount_paid, balance_due FROM sales_invoices WHERE id = ?', [saleResult.invoiceId]);
    console.log('Sales Invoice in DB:', invRow);

    const [updatedCust] = await query('SELECT id, name, current_balance FROM customers WHERE id = ?', [customer.id]);
    console.log(`Updated Customer Balance: ₹${updatedCust.current_balance} (Previous: ₹${initialCustomerBalance})`);

    const [updatedProd] = await query('SELECT id, name, current_stock FROM products WHERE id = ?', [product.id]);
    console.log(`Updated Product Stock: ${updatedProd.current_stock} (Previous: ${initialStock})`);

    if (invRow.payment_mode === 'CREDIT' && Number(updatedCust.current_balance) === Number((initialCustomerBalance + saleResult.grandTotal).toFixed(2))) {
      console.log(' SUCCESS: Khata credit sale executed cleanly with 0 errors!');
      process.exit(0);
    } else {
      console.error(' Mismatch in expected balance or payment mode');
      process.exit(1);
    }
  } catch (err) {
    console.error(' Khata sale failed with error:', err);
    process.exit(1);
  }
}

testKhataSale();

