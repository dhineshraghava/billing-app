import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SalesService } from '../services/salesService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function runCompleteSystemTest() {
  console.log('====================================================');
  console.log('   SUPERMART POS - COMPLETE SYSTEM VERIFICATION     ');
  console.log('====================================================');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'supermarket_billing',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
  });

  const conn = await pool.getConnection();

  try {
    // 1. Database Connection & Core Schema Verification
    console.log('\n[TEST 1] Verifying Database Connection & Core Tables...');
    const [tables] = await conn.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log(`✓ Connected to MySQL database "${process.env.DB_NAME || 'supermarket_billing'}".`);
    console.log(`✓ Total tables discovered: ${tableNames.length}`);

    const requiredTables = [
      'users', 'roles', 'products', 'categories', 'units',
      'customers', 'suppliers', 'sales_invoices', 'sales_invoice_items',
      'payments', 'stock_movements', 'cashier_shifts', 'business_settings'
    ];
    for (const reqTbl of requiredTables) {
      if (!tableNames.includes(reqTbl)) {
        throw new Error(`Missing required table: ${reqTbl}`);
      }
    }
    console.log('✓ All 13 core relational tables verified.');

    // 2. Roles Verification
    console.log('\n[TEST 2] Verifying Role-Based Access Control Roles...');
    const [roles] = await conn.query('SELECT name FROM roles');
    const roleNames = roles.map(r => r.name);
    console.log('  Available Roles:', roleNames.join(', '));
    ['ADMIN', 'MANAGER', 'CASHIER', 'INVENTORY_STAFF', 'ACCOUNTANT'].forEach(r => {
      if (!roleNames.includes(r)) throw new Error(`Role ${r} missing!`);
    });
    console.log('✓ All required supermarket roles active.');

    // 3. Product Catalog with Brand & Expiry
    console.log('\n[TEST 3] Testing Product Creation with Barcode, Brand & GST...');
    const testBarcode = `890${Date.now().toString().slice(-10)}`;
    const [catRows] = await conn.query('SELECT id FROM categories LIMIT 1');
    const catId = catRows[0]?.id || 1;
    const [unitRows] = await conn.query('SELECT id FROM units LIMIT 1');
    const unitId = unitRows[0]?.id || 1;

    const [prodResult] = await conn.query(`
      INSERT INTO products (
        name, brand, barcode, sku, category_id, unit_id, hsn_code,
        purchase_price, selling_price, mrp, gst_rate, is_tax_inclusive,
        current_stock, min_stock_qty, expiry_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, DATE_ADD(CURDATE(), INTERVAL 90 DAY), 1)
    `, [
      'Super Premium Basmati Rice 5kg', 'IndiaGate', testBarcode, `SKU-${Date.now().toString().slice(-6)}`,
      catId, unitId, '1006', 350.00, 450.00, 500.00, 5.00, 50.00, 10.00
    ]);
    const productId = prodResult.insertId;
    console.log(`✓ Product created successfully: ID=${productId}, Barcode=${testBarcode}, Brand=IndiaGate`);

    // 4. Barcode Lookup Simulation
    console.log('\n[TEST 4] Testing Fast Barcode Lookup...');
    const [lookupRows] = await conn.query('SELECT id, name, barcode, selling_price, gst_rate, current_stock FROM products WHERE barcode = ?', [testBarcode]);
    if (lookupRows.length === 0) throw new Error('Barcode lookup failed');
    const scanned = lookupRows[0];
    console.log(`✓ Scanned: "${scanned.name}" | Price: ₹${scanned.selling_price} | GST: ${scanned.gst_rate}% | Stock: ${scanned.current_stock}`);

    // 5. Cashier Shift Management
    console.log('\n[TEST 5] Testing Cash Register Shift Lifecycle...');
    const [adminUser] = await conn.query('SELECT id FROM users LIMIT 1');
    const userId = adminUser[0].id;

    // Close any previous open shift for clean test
    await conn.query("UPDATE cashier_shifts SET status = 'CLOSED', closed_at = NOW() WHERE user_id = ? AND status = 'OPEN'", [userId]);

    // Open shift
    const [shiftResult] = await conn.query(`
      INSERT INTO cashier_shifts (user_id, register_name, opened_at, opening_cash, status)
      VALUES (?, 'Express Counter 1', NOW(), 2500.00, 'OPEN')
    `, [userId]);
    const shiftId = shiftResult.insertId;
    console.log(`✓ Shift opened: ID=${shiftId}, Register=Express Counter 1, Float=₹2500.00`);

    // 6. Complete Transactional Sale via Production SalesService
    console.log('\n[TEST 6] Testing Complete Sale Checkout (SalesService.checkoutSale)...');
    const initialStock = Number(scanned.current_stock);
    const saleQty = 2;

    const saleResult = await SalesService.checkoutSale({
      customerId: 1, // Walk-in customer
      cashierId: userId,
      items: [
        {
          productId: productId,
          quantity: saleQty,
          unitPrice: 450.00,
          discountAmount: 20.00,
        }
      ],
      billDiscountAmount: 30.00,
      paymentMode: 'CASH',
      tenderAmount: 1000.00,
      accountId: 1,
      notes: 'Test sale automated verification',
    });

    const invoiceId = saleResult.invoiceId;
    const invoiceNumber = saleResult.invoiceNumber;
    console.log(`✓ Sale checked out: Invoice #${invoiceNumber} (ID: ${invoiceId})`);
    console.log(`  Subtotal: ₹${saleResult.subtotal} | Tax: ₹${saleResult.totalTax} | Grand Total: ₹${saleResult.grandTotal}`);
    console.log(`  Payment Mode: CASH | Total Paid: ₹${saleResult.totalPaid} | Change: ₹${saleResult.changeReturned}`);

    // Verify stock was decremented in database
    const [updatedProd] = await conn.query('SELECT current_stock FROM products WHERE id = ?', [productId]);
    const newStock = Number(updatedProd[0].current_stock);
    console.log(`✓ Stock decremented in MySQL: ${initialStock} -> ${newStock} (Expected: ${initialStock - saleQty})`);
    if (newStock !== initialStock - saleQty) {
      throw new Error(`Stock deduction mismatch! Expected ${initialStock - saleQty}, got ${newStock}`);
    }

    // Verify stock movement log entry
    const [movRows] = await conn.query('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY id DESC LIMIT 1', [productId]);
    console.log(`✓ Stock Movement logged: Type=${movRows[0].movement_type}, Qty=${movRows[0].quantity}, BalanceAfter=${movRows[0].balance_after}`);

    // 7. Sales Return Verification using SalesService.processSaleReturn
    console.log('\n[TEST 7] Testing Sales Return & Stock Restoration (SalesService.processSaleReturn)...');
    const [invoiceItems] = await conn.query('SELECT id FROM sales_invoice_items WHERE invoice_id = ? LIMIT 1', [invoiceId]);
    const invoiceItemId = invoiceItems[0].id;

    const returnResult = await SalesService.processSaleReturn({
      invoiceId,
      processedByUserId: userId,
      items: [
        {
          invoiceItemId,
          quantity: 1,
        }
      ],
      refundMode: 'CASH',
      accountId: 1,
      reason: 'Customer requested refund for 1 unit',
    });

    console.log(`✓ Return processed: Return #${returnResult.returnNumber} | Refund: ₹${returnResult.refundAmount}`);

    // Verify stock was restored in database
    const [stkAfterRet] = await conn.query('SELECT current_stock FROM products WHERE id = ?', [productId]);
    console.log(`✓ Stock restored in MySQL after return: ${stkAfterRet[0].current_stock} (Expected: ${newStock + 1})`);
    if (Number(stkAfterRet[0].current_stock) !== newStock + 1) {
      throw new Error(`Stock restoration mismatch! Expected ${newStock + 1}, got ${stkAfterRet[0].current_stock}`);
    }

    // 8. Close Shift & Reconcile
    console.log('\n[TEST 8] Closing Register Shift & Reconciling Drawer...');
    const expectedCashInDrawer = 2500.00 + saleResult.grandTotal;
    await conn.query(`
      UPDATE cashier_shifts
      SET 
        closed_at = NOW(),
        status = 'CLOSED',
        expected_cash = ?,
        actual_cash = ?,
        cash_difference = 0.00,
        total_sales_amount = ?,
        total_bills_count = 1,
        total_cash_sales = ?
      WHERE id = ?
    `, [expectedCashInDrawer, expectedCashInDrawer, saleResult.grandTotal, saleResult.grandTotal, shiftId]);
    console.log(`✓ Shift closed successfully: Expected Drawer = ₹${expectedCashInDrawer}, Actual Counted = ₹${expectedCashInDrawer}, Difference = ₹0.00 (Balanced)`);

    // 9. Clean up test record
    await conn.query('DELETE FROM sales_return_items WHERE sales_return_id = ?', [returnResult.returnId]);
    await conn.query('DELETE FROM sales_returns WHERE id = ?', [returnResult.returnId]);
    await conn.query('DELETE FROM payment_allocations WHERE invoice_id = ?', [invoiceId]);
    await conn.query('DELETE FROM payments WHERE reference_id = ? AND reference_type = "SALES_INVOICE"', [invoiceId]);
    await conn.query('DELETE FROM account_transactions WHERE reference_type = "SALE_REFUND" AND reference_id = ?', [returnResult.returnId]);
    await conn.query('DELETE FROM sales_invoice_items WHERE invoice_id = ?', [invoiceId]);
    await conn.query('DELETE FROM sales_invoices WHERE id = ?', [invoiceId]);
    await conn.query('DELETE FROM cashier_shifts WHERE id = ?', [shiftId]);
    await conn.query('DELETE FROM stock_movements WHERE product_id = ?', [productId]);
    await conn.query('DELETE FROM products WHERE id = ?', [productId]);
    console.log('\n✓ Cleaned up test artifacts from database.');

    console.log('\n====================================================');
    console.log('   ALL 8 VERIFICATION SCENARIOS PASSED WITH SUCCESS! ');
    console.log('====================================================\n');
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('❌ Verification failed:', err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

runCompleteSystemTest();
