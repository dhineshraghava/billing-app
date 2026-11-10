import { query } from '../config/db.js';
import SalesService from '../services/salesService.js';

async function testFullIntegration() {
  console.log('=================================================================');
  console.log('   FULL END-TO-END APPLICATION & DATABASE INTEGRATION TEST       ');
  console.log('=================================================================\n');

  try {
    // 1. Verify Database Name
    const [dbInfo] = await query('SELECT DATABASE() as db, VERSION() as ver');
    console.log(`[1] Connected Database: ${dbInfo.db} (MySQL ${dbInfo.ver})`);
    if (dbInfo.db !== 'supermarket_db') {
      throw new Error(`Expected supermarket_db, got ${dbInfo.db}`);
    }

    // 2. Test Product Creation
    console.log('\n[2] Testing Product Insertion into supermarket_db...');
    const testBarcode = '8909999999999';
    // Clean up if exists from prior test
    await query('DELETE FROM products WHERE barcode = ?', [testBarcode]);

    const insertProdSql = `
      INSERT INTO products (
        name, barcode, sku, category_id, unit_id, hsn_code,
        purchase_price, selling_price, mrp, gst_rate,
        current_stock, min_stock_qty, is_active
      ) VALUES (?, ?, ?, 1, 1, '1905', 40.00, 50.00, 55.00, 5.00, 100.00, 10.00, 1)
    `;
    const prodResult = await query(insertProdSql, [
      'Fresh Wheat Bread 400g (E2E Test)',
      testBarcode,
      'SKU-TEST-BREAD-01'
    ]);
    const testProductId = prodResult.insertId;
    console.log(`    ✓ Product created with ID: ${testProductId}`);

    // Verify product exists in DB
    const [fetchedProd] = await query('SELECT * FROM products WHERE id = ?', [testProductId]);
    console.log(`    ✓ Verified in DB: "${fetchedProd.name}" (Price: ₹${fetchedProd.selling_price}, Stock: ${fetchedProd.current_stock})`);

    // 3. Test Product Update
    console.log('\n[3] Testing Product Update in supermarket_db...');
    await query('UPDATE products SET selling_price = 52.00, min_stock_qty = 15.00 WHERE id = ?', [testProductId]);
    const [updatedProd] = await query('SELECT selling_price, min_stock_qty FROM products WHERE id = ?', [testProductId]);
    console.log(`    ✓ Updated price to ₹${updatedProd.selling_price}, min stock to ${updatedProd.min_stock_qty}`);

    // 4. Test Customer Creation
    console.log('\n[4] Testing Customer Creation in supermarket_db...');
    const testPhone = '9998887776';
    await query('DELETE FROM customers WHERE phone = ?', [testPhone]);
    const custResult = await query(`
      INSERT INTO customers (name, phone, email, address, current_balance, is_active)
      VALUES (?, ?, ?, ?, 0.00, 1)
    `, ['Pooja Sharma (E2E Test)', testPhone, 'pooja.test@example.com', 'Flat 4B, Residency Road, Chennai']);
    const testCustomerId = custResult.insertId;
    console.log(`    ✓ Customer created with ID: ${testCustomerId}`);

    // 5. Test POS Sale Checkout Transaction (Atomic ACID transaction)
    console.log('\n[5] Testing Full POS Checkout Transaction...');
    const saleResult = await SalesService.checkoutSale({
      customerId: testCustomerId,
      cashierId: 3, // Cashier
      items: [
        {
          productId: testProductId,
          quantity: 2, // 2 units @ ₹52.00 = ₹104.00
          discountPercent: 0,
          discountAmount: 0,
        }
      ],
      billDiscountPercent: 0,
      billDiscountAmount: 0,
      paymentMode: 'CASH',
      tenderAmount: 110.00, // handed ₹110
      accountId: 1, // Cash Drawer
      notes: 'End-to-End Automated Integration Test Sale',
      idempotencyKey: `E2E-POS-${Date.now()}`
    });

    console.log('    ✓ POS Checkout committed successfully!');
    console.log(`      • Invoice Number: ${saleResult.invoiceNumber} (ID: ${saleResult.invoiceId})`);
    console.log(`      • Grand Total:    ₹${saleResult.grandTotal}`);
    console.log(`      • Total Paid:     ₹${saleResult.totalPaid}`);
    console.log(`      • Change Return:  ₹${saleResult.changeReturned}`);
    console.log(`      • Payment Status: ${saleResult.paymentStatus}`);

    // 6. Verify Stock Decrement & Stock Movement Record
    console.log('\n[6] Verifying Stock Decrement & Inventory Movement in supermarket_db...');
    const [stockCheck] = await query('SELECT current_stock FROM products WHERE id = ?', [testProductId]);
    console.log(`      • Initial Stock: 100.00 -> New Stock: ${stockCheck.current_stock} (Expected: 98.00)`);
    if (Number(stockCheck.current_stock) !== 98) {
      throw new Error(`Stock mismatch! Expected 98, got ${stockCheck.current_stock}`);
    }

    const [movementRow] = await query(`
      SELECT movement_type, quantity, balance_after, reference_type 
      FROM stock_movements 
      WHERE product_id = ? 
      ORDER BY id DESC LIMIT 1
    `, [testProductId]);
    console.log(`      ✓ Stock Movement logged: ${movementRow.movement_type} ${movementRow.quantity} units (Balance after: ${movementRow.balance_after})`);

    // 7. Verify Payments & Account Balance Inflow
    console.log('\n[7] Verifying Payment & Financial Ledger in supermarket_db...');
    const [paymentRow] = await query(`
      SELECT payment_number, payment_mode, amount, tender_amount, change_returned 
      FROM payments 
      WHERE reference_id = ? AND reference_type = 'SALES_INVOICE'
    `, [saleResult.invoiceId]);
    console.log(`      ✓ Payment Record: [${paymentRow.payment_number}] Mode: ${paymentRow.payment_mode} Amount: ₹${paymentRow.amount} Tender: ₹${paymentRow.tender_amount} Change: ₹${paymentRow.change_returned}`);

    // 8. Verify Sales History Retrieval
    console.log('\n[8] Verifying Sales History Record Query...');
    const [invCheck] = await query(`
      SELECT si.invoice_number, si.grand_total, si.payment_status, c.name as customer_name, u.username as cashier_username
      FROM sales_invoices si
      LEFT JOIN customers c ON si.customer_id = c.id
      LEFT JOIN users u ON si.cashier_id = u.id
      WHERE si.id = ?
    `, [saleResult.invoiceId]);
    console.log(`      ✓ Retrieved Sale: ${invCheck.invoice_number} | ₹${invCheck.grand_total} | ${invCheck.payment_status} | Customer: ${invCheck.customer_name} | Cashier: ${invCheck.cashier_username}`);

    console.log('\n=================================================================');
    console.log('   ALL APPLICATION & DATABASE TESTS PASSED 100% IN supermarket_db! ');
    console.log('=================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

testFullIntegration();
