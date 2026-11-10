import { query } from '../config/db.js';
import { SalesService } from '../services/salesService.js';

async function runPosTest() {
  try {
    console.log('=== RUNNING POS BARCODE & WALK-IN CUSTOMER END-TO-END TEST ===\n');

    // 1. Verify Walk-in Customer
    const [c1] = await query('SELECT id, name, phone, current_balance FROM customers WHERE id = 1');
    console.log('1. Walk-in Customer Record in DB:');
    console.log(c1);
    if (!c1 || c1.name !== 'Walk-in Customer' || c1.phone !== '9999999999') {
      throw new Error(`Walk-in customer mismatch: expected Walk-in Customer / 9999999999, got ${JSON.stringify(c1)}`);
    }
    console.log('✓ Walk-in Customer is valid and has ID 1, Phone 9999999999\n');

    // 2. Verify Barcode Scanning on Products
    const [product1] = await query("SELECT * FROM products WHERE barcode = '8901262010053'");
    console.log('2. Barcode Lookup Product (8901262010053):');
    console.log({
      id: product1?.id,
      name: product1?.name,
      barcode: product1?.barcode,
      hsn_code: product1?.hsn_code,
      selling_price: product1?.selling_price,
      current_stock: product1?.current_stock,
      is_active: product1?.is_active
    });
    if (!product1 || !product1.barcode) {
      throw new Error('Barcode product 8901262010053 not found in products table');
    }
    console.log('✓ Product barcode lookup verified\n');

    // 3. Test Checkout with Walk-in Customer (customerId: 1)
    console.log('3. Performing POS checkout with Walk-in Customer (ID: 1)...');
    const walkinCheckoutResult = await SalesService.checkoutSale({
      customerId: 1,
      cashierId: 1,
      items: [
        {
          productId: product1.id,
          quantity: 2,
          discountPercent: 0,
          discountAmount: 0,
        }
      ],
      billDiscountPercent: 0,
      billDiscountAmount: 0,
      paymentMode: 'CASH',
      tenderAmount: 600, // bill is 2 * 275 = 550, tender 600, change returned 50
      accountId: 1,
      notes: 'POS Walk-in automated test sale',
      idempotencyKey: `TEST-WALKIN-${Date.now()}`
    });

    console.log('Checkout completed:', {
      invoiceId: walkinCheckoutResult.invoiceId,
      invoiceNumber: walkinCheckoutResult.invoiceNumber,
      grandTotal: walkinCheckoutResult.grandTotal,
      subtotal: walkinCheckoutResult.subtotal,
      totalTax: walkinCheckoutResult.totalTax,
      changeReturned: walkinCheckoutResult.changeReturned,
    });

    // 4. Inspect Saved Sales Invoice and Line Items
    const [savedInv] = await query(`
      SELECT si.*, c.name AS customer_name, c.phone AS customer_phone
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      WHERE si.id = ?
    `, [walkinCheckoutResult.invoiceId]);

    console.log('\n4. Saved Sales Invoice:');
    console.log({
      invoice_number: savedInv.invoice_number,
      customer_id: savedInv.customer_id,
      customer_name: savedInv.customer_name,
      customer_phone: savedInv.customer_phone,
      payment_mode: savedInv.payment_mode,
      grand_total: savedInv.grand_total,
      amount_paid: savedInv.amount_paid
    });

    if (savedInv.customer_id !== 1 || savedInv.customer_name !== 'Walk-in Customer') {
      throw new Error(`Customer details mismatch on invoice: ${JSON.stringify(savedInv)}`);
    }

    const savedItems = await query(`
      SELECT item_name, barcode, hsn_code, quantity, unit_price, total_amount
      FROM sales_invoice_items
      WHERE invoice_id = ?
    `, [walkinCheckoutResult.invoiceId]);

    console.log('Saved Line Items (with barcode):');
    console.log(savedItems);

    if (!savedItems[0].barcode || savedItems[0].barcode !== product1.barcode) {
      throw new Error(`Item barcode mismatch: expected ${product1.barcode}, got ${savedItems[0].barcode}`);
    }
    console.log('✓ Line item preserved product barcode in sales_invoice_items\n');

    // 5. Test Registered Customer Sale
    console.log('5. Performing POS checkout with Registered Customer (ID: 2 - Rajesh Kumar)...');
    const regCheckoutResult = await SalesService.checkoutSale({
      customerId: 2,
      cashierId: 1,
      items: [
        {
          productId: product1.id,
          quantity: 1,
          discountPercent: 5,
          discountAmount: 0,
        }
      ],
      billDiscountPercent: 0,
      billDiscountAmount: 0,
      paymentMode: 'UPI',
      tenderAmount: 261.25,
      accountId: 3,
      notes: 'POS Registered customer test sale',
      idempotencyKey: `TEST-REG-${Date.now()}`
    });

    const [savedRegInv] = await query(`
      SELECT si.*, c.name AS customer_name, c.phone AS customer_phone
      FROM sales_invoices si
      JOIN customers c ON si.customer_id = c.id
      WHERE si.id = ?
    `, [regCheckoutResult.invoiceId]);

    console.log('Registered Customer Invoice:');
    console.log({
      invoice_number: savedRegInv.invoice_number,
      customer_id: savedRegInv.customer_id,
      customer_name: savedRegInv.customer_name,
      customer_phone: savedRegInv.customer_phone,
      payment_mode: savedRegInv.payment_mode
    });

    if (savedRegInv.customer_id !== 2 || savedRegInv.customer_name !== 'Rajesh Kumar') {
      throw new Error('Registered customer mismatch on invoice');
    }
    console.log('✓ Registered customer invoice correctly saved\n');

    console.log('========================================================');
    console.log('ALL POS BARCODE & WALK-IN CUSTOMER CHECKS PASSED (100%)');
    console.log('========================================================');
    process.exit(0);
  } catch (err) {
    console.error('POS TEST FAILED:', err);
    process.exit(1);
  }
}

runPosTest();
