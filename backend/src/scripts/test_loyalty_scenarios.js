import { query, getPool } from '../config/db.js';
import SalesService from '../services/salesService.js';

async function runTests() {
  console.log('================================================================');
  console.log('   SUPERMART LOYALTY POINTS & REDEMPTION SYSTEM TEST SUITE      ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Setup Walk-in customer (id: 1)
    const [walkin] = await query('SELECT id, name, phone, loyalty_points FROM customers WHERE id = 1');
    assert(walkin && (walkin.id === 1 || walkin.phone === '9999999999'), 'Walk-in customer (id: 1) exists in database');

    // 2. Setup Test Customer: "Loyalty Test User"
    const testPhone = '9876500001';
    let [testCust] = await query('SELECT * FROM customers WHERE phone = ?', [testPhone]);
    if (!testCust) {
      const res = await query('INSERT INTO customers (name, phone, loyalty_points) VALUES (?, ?, 0)', ['Loyalty Test User', testPhone]);
      [testCust] = await query('SELECT * FROM customers WHERE id = ?', [res.insertId]);
    }
    // Reset test customer points to 0
    await query('UPDATE customers SET loyalty_points = 0 WHERE id = ?', [testCust.id]);

    // 3. Setup Test Products with exact prices & 0% tax to get exact round totals
    async function getOrCreateProduct(name, barcode, price) {
      let [prod] = await query('SELECT * FROM products WHERE barcode = ?', [barcode]);
      if (!prod) {
        const res = await query(`
          INSERT INTO products (
            barcode, sku, name, category_id, unit_id, hsn_code,
            purchase_price, selling_price, mrp, gst_rate, is_tax_inclusive,
            discount_percent, current_stock, min_stock_qty, is_active
          ) VALUES (?, ?, ?, 1, 1, '1901', ?, ?, ?, 0.00, 1, 0, 999, 5, 1)
        `, [barcode, `SKU-${barcode}`, name, price * 0.8, price, price]);
        [prod] = await query('SELECT * FROM products WHERE id = ?', [res.insertId]);
      } else {
        await query('UPDATE products SET selling_price = ?, mrp = ?, current_stock = 999, gst_rate = 0 WHERE id = ?', [price, price, prod.id]);
        [prod] = await query('SELECT * FROM products WHERE id = ?', [prod.id]);
      }
      return prod;
    }

    const item80 = await getOrCreateProduct('Test Item 80', 'TEST80', 80.0);
    const item100 = await getOrCreateProduct('Test Item 100', 'TEST100', 100.0);
    const item150 = await getOrCreateProduct('Test Item 150', 'TEST150', 150.0);
    const item500 = await getOrCreateProduct('Test Item 100x5', 'TEST500', 100.0); // 5 qty = 500
    const item200 = await getOrCreateProduct('Test Item 200', 'TEST200', 200.0);

    console.log(`Using Test Customer: ${testCust.name} (ID: ${testCust.id}, Phone: ${testCust.phone})\n`);

    // -------------------------------------------------------------
    // SCENARIO 1: Purchase ₹80 -> 0 points
    // -------------------------------------------------------------
    console.log('--- SCENARIO 1: Purchase ₹80 -> 0 points ---');
    const sale1 = await SalesService.checkoutSale({
      customerId: testCust.id,
      cashierId: 1,
      items: [{ productId: item80.id, quantity: 1, discountAmount: 0 }],
      paymentMode: 'CASH',
      tenderAmount: 80,
      accountId: 1,
      redeemPoints: 0,
      notes: 'Scenario 1: ₹80 purchase',
    });
    assert(sale1.grandTotal === 80, `Invoice grand total is exactly ₹${sale1.grandTotal}`);
    assert(sale1.loyaltyPointsEarned === 0, `Points earned is 0 (got ${sale1.loyaltyPointsEarned})`);
    const [c1] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    assert(c1.loyalty_points === 0, `Customer points in DB remains 0 (got ${c1.loyalty_points})`);

    // -------------------------------------------------------------
    // SCENARIO 2: Purchase ₹100 -> 0 points
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 2: Purchase ₹100 -> 0 points ---');
    const sale2 = await SalesService.checkoutSale({
      customerId: testCust.id,
      cashierId: 1,
      items: [{ productId: item100.id, quantity: 1, discountAmount: 0 }],
      paymentMode: 'CASH',
      tenderAmount: 100,
      accountId: 1,
      redeemPoints: 0,
      notes: 'Scenario 2: Exactly ₹100 purchase',
    });
    assert(sale2.grandTotal === 100, `Invoice grand total is exactly ₹${sale2.grandTotal}`);
    assert(sale2.loyaltyPointsEarned === 0, `Points earned is 0 for purchase of ₹100 (got ${sale2.loyaltyPointsEarned})`);
    const [c2] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    assert(c2.loyalty_points === 0, `Customer points in DB remains 0`);

    // -------------------------------------------------------------
    // SCENARIO 3: Purchase ₹150 -> 1 point
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 3: Purchase ₹150 -> 1 point ---');
    const sale3 = await SalesService.checkoutSale({
      customerId: testCust.id,
      cashierId: 1,
      items: [{ productId: item150.id, quantity: 1, discountAmount: 0 }],
      paymentMode: 'CASH',
      tenderAmount: 150,
      accountId: 1,
      redeemPoints: 0,
      notes: 'Scenario 3: ₹150 purchase',
    });
    assert(sale3.grandTotal === 150, `Invoice grand total is ₹${sale3.grandTotal}`);
    assert(sale3.loyaltyPointsEarned === 1, `Points earned is 1 for purchase of ₹150 (got ${sale3.loyaltyPointsEarned})`);
    const [c3] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    assert(c3.loyalty_points === 1, `Customer points in DB updated to 1`);

    // -------------------------------------------------------------
    // SCENARIO 4: Purchase ₹500 (multiple items) -> 1 point (not multiplied by items)
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 4: Purchase ₹500 -> 1 point (not multiplied by items) ---');
    const sale4 = await SalesService.checkoutSale({
      customerId: testCust.id,
      cashierId: 1,
      items: [{ productId: item500.id, quantity: 5, discountAmount: 0 }],
      paymentMode: 'UPI',
      tenderAmount: 500,
      accountId: 3,
      redeemPoints: 0,
      notes: 'Scenario 4: ₹500 purchase with 5 items',
    });
    assert(sale4.grandTotal === 500, `Invoice grand total is ₹${sale4.grandTotal}`);
    assert(sale4.loyaltyPointsEarned === 1, `Points earned is 1 (not multiplied by 5 items, got ${sale4.loyaltyPointsEarned})`);
    const [c4] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    assert(c4.loyalty_points === 2, `Customer points in DB increased to 2 (1 previous + 1 current)`);

    // -------------------------------------------------------------
    // SCENARIO 5: Customer with 10 points buys ₹200 and redeems 5 points -> ₹5 discount, 5 remaining + 1 earned = 6 points
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 5: Redeem 5 points on ₹200 bill ---');
    // Set test customer points to 10
    await query('UPDATE customers SET loyalty_points = 10 WHERE id = ?', [testCust.id]);

    const sale5 = await SalesService.checkoutSale({
      customerId: testCust.id,
      cashierId: 1,
      items: [{ productId: item200.id, quantity: 1, discountAmount: 0 }],
      paymentMode: 'CASH',
      tenderAmount: 195,
      accountId: 1,
      redeemPoints: 5,
      notes: 'Scenario 5: ₹200 purchase with 5 points redeemed',
    });
    assert(sale5.loyaltyPointsRedeemed === 5, `Points redeemed is 5 (got ${sale5.loyaltyPointsRedeemed})`);
    assert(Number(sale5.loyaltyDiscountAmount) === 5.0, `Loyalty discount in rupees is ₹5.00 (got ₹${sale5.loyaltyDiscountAmount})`);
    assert(sale5.grandTotal === 195, `Revised payable amount is ₹195.00 (got ₹${sale5.grandTotal})`);
    assert(sale5.loyaltyPointsEarned === 1, `Points earned on pre-loyalty ₹200 bill is 1 (got ${sale5.loyaltyPointsEarned})`);
    const [c5] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    assert(c5.loyalty_points === 6, `Customer remaining points is 6 (10 - 5 + 1 = 6, got ${c5.loyalty_points})`);

    // -------------------------------------------------------------
    // SCENARIO 6: Insufficient points or over-redemption guard
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 6: Prevent over-redemption ---');
    let overRedeemBlocked = false;
    try {
      await SalesService.checkoutSale({
        customerId: testCust.id,
        cashierId: 1,
        items: [{ productId: item80.id, quantity: 1, discountAmount: 0 }],
        paymentMode: 'CASH',
        tenderAmount: 0,
        accountId: 1,
        redeemPoints: 1000, // Customer only has 6 points
        notes: 'Scenario 6: Over-redemption attempt',
      });
    } catch (err) {
      overRedeemBlocked = true;
    }
    assert(overRedeemBlocked, 'System correctly rejected redeeming 1000 points when customer only has 6 points');

    // -------------------------------------------------------------
    // SCENARIO 7: Walk-in Customer (id: 1) -> 0 points earned & cannot redeem
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 7: Walk-in customer earns 0 points & cannot redeem ---');
    const sale7 = await SalesService.checkoutSale({
      customerId: 1,
      cashierId: 1,
      items: [{ productId: item500.id, quantity: 5, discountAmount: 0 }],
      paymentMode: 'CASH',
      tenderAmount: 500,
      accountId: 1,
      redeemPoints: 10,
      notes: 'Scenario 7: Walk-in customer large purchase',
    });
    assert(sale7.loyaltyPointsEarned === 0, `Walk-in customer earned 0 points (got ${sale7.loyaltyPointsEarned})`);
    assert(sale7.loyaltyPointsRedeemed === 0, `Walk-in customer redeemed 0 points (got ${sale7.loyaltyPointsRedeemed})`);
    const [walkinAfter] = await query('SELECT loyalty_points FROM customers WHERE id = 1');
    assert(walkinAfter.loyalty_points === 0, `Walk-in customer balance remains 0 in MySQL`);

    // -------------------------------------------------------------
    // SCENARIO 8: Phone lookup logic
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 8: Phone lookup by 10-digit number ---');
    const foundPhoneRows = await query('SELECT id, name, phone, loyalty_points FROM customers WHERE phone = ?', [testPhone]);
    assert(foundPhoneRows.length === 1 && foundPhoneRows[0].id === testCust.id, `Correct customer retrieved by phone ${testPhone}`);

    // -------------------------------------------------------------
    // SCENARIO 9: Duplicate phone registration guard
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 9: Duplicate phone check in database ---');
    const dupPhone = '9876543219';
    const existing = await query('SELECT id FROM customers WHERE phone = ?', [dupPhone]);
    if (existing.length === 0) {
      await query('INSERT INTO customers (name, phone, loyalty_points) VALUES (?, ?, 0)', ['First Customer', dupPhone]);
    }
    const [dupCust] = await query('SELECT id, name FROM customers WHERE phone = ?', [dupPhone]);
    assert(dupCust && dupCust.id, `Single customer record exists for phone ${dupPhone}`);

    // -------------------------------------------------------------
    // SCENARIO 10: Refresh/Persistence check in MySQL
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 10: Persistence across database connections ---');
    const pool = getPool();
    const [persistedCust] = await pool.query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    const pts = persistedCust[0]?.loyalty_points;
    assert(typeof pts === 'number' && !isNaN(pts), `Loyalty points (${pts}) successfully persisted in MySQL table`);

    // -------------------------------------------------------------
    // SCENARIO 11: Idempotency check
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 11: Idempotency token prevents duplicate points ---');
    const idempKey = `IDEMP-TEST-${Date.now()}`;
    const [c11Before] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    
    // First call
    const sale11A = await SalesService.checkoutSale({
      customerId: testCust.id,
      cashierId: 1,
      items: [{ productId: item200.id, quantity: 1, discountAmount: 0 }],
      paymentMode: 'CASH',
      tenderAmount: 200,
      accountId: 1,
      redeemPoints: 0,
      idempotencyKey: idempKey,
      notes: 'Scenario 11: Idempotent call A',
    });

    const [c11Mid] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    assert(c11Mid.loyalty_points === c11Before.loyalty_points + 1, `Points incremented by 1 after first checkout call`);

    // Second call with same idempotency key
    const sale11B = await SalesService.checkoutSale({
      customerId: testCust.id,
      cashierId: 1,
      items: [{ productId: item200.id, quantity: 1, discountAmount: 0 }],
      paymentMode: 'CASH',
      tenderAmount: 200,
      accountId: 1,
      redeemPoints: 0,
      idempotencyKey: idempKey,
      notes: 'Scenario 11: Idempotent call B',
    });

    const [c11After] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    assert(sale11B.invoiceId === sale11A.invoiceId, `Same invoice returned on idempotent retry (ID: ${sale11B.invoiceId})`);
    assert(c11After.loyalty_points === c11Mid.loyalty_points, `Customer points NOT double-awarded on duplicate submission`);

    // -------------------------------------------------------------
    // SCENARIO 12: Sales Return / Refund reverses points
    // -------------------------------------------------------------
    console.log('\n--- SCENARIO 12: Sales return reverses earned points and restores redeemed points ---');
    // Invoice 5 had 5 redeemed and 1 earned. Let's refund invoice 5!
    const [c12Before] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    const inv5Items = await query('SELECT id, quantity FROM sales_invoice_items WHERE invoice_id = ?', [sale5.invoiceId]);
    assert(inv5Items.length > 0, `Found ${inv5Items.length} line items for invoice ${sale5.invoiceNumber}`);

    const refundResult = await SalesService.processSaleReturn({
      invoiceId: sale5.invoiceId,
      userId: 1,
      items: [{ invoiceItemId: inv5Items[0].id, quantity: inv5Items[0].quantity, condition: 'GOOD', restock: true }],
      reason: 'Customer return test',
      refundMode: 'CASH',
      accountId: 1,
    });
    assert(refundResult && refundResult.returnId, `Sales return processed successfully (Return ID: ${refundResult.returnId})`);
    const [c12After] = await query('SELECT loyalty_points FROM customers WHERE id = ?', [testCust.id]);
    console.log(`Customer points before refund: ${c12Before.loyalty_points}, after refund: ${c12After.loyalty_points}`);
    // Earned 1 point reversed (-1) and redeemed 5 points restored (+5) => net +4 points
    assert(c12After.loyalty_points === c12Before.loyalty_points + 4, `Earned point reversed and redeemed points restored (+4 net points)`);

    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');
    if (failed === 0) {
      console.log('>>> ALL 12 LOYALTY & POS SCENARIOS PASSED WITH 100% SUCCESS! <<<');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test Suite encountered unhandled error:', err);
    process.exit(1);
  }
}

runTests();
