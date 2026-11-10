async function run() {
  try {
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'cashier', password: 'Cashier@123' })
    });
    console.log('Login HTTP status:', loginRes.status);
    const loginData = await loginRes.json();
    console.log('Login message:', loginData.message);
    const token = loginData.data?.token;

    if (!token) {
      throw new Error('Failed to retrieve token: ' + JSON.stringify(loginData));
    }

    // 2. Test GET /api/sales/2 (Previously failed with 500: Cannot read properties of undefined reading 'id')
    const saleRes = await fetch('http://localhost:5000/api/sales/2', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const saleData = await saleRes.json();
    console.log('\n2. GET /api/sales/2 Status:', saleRes.status);
    console.log('   Invoice Number:', saleData.data?.invoice?.invoice_number);
    console.log('   Invoice Customer:', saleData.data?.invoice?.customer_name);
    console.log('   Items Count:', saleData.data?.items?.length);
    console.log('   Payments Count:', saleData.data?.payments?.length);
    console.log('   Store Name:', saleData.data?.store?.store_name);

    if (saleRes.status !== 200) {
      throw new Error(`Expected 200 from /api/sales/2 but got ${saleRes.status}: ${JSON.stringify(saleData)}`);
    }

    // 3. Test GET /api/accounts with Cashier token (Previously was 403 Forbidden)
    const accRes = await fetch('http://localhost:5000/api/accounts', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const accData = await accRes.json();
    console.log('\n3. GET /api/accounts (Cashier) Status:', accRes.status, 'Accounts Count:', accData.data?.length);

    if (accRes.status !== 200) {
      throw new Error(`Expected 200 from /api/accounts but got ${accRes.status}`);
    }

    // 4. Test POST /api/sales (New Checkout)
    const idempotencyKey = `POS-TEST-${Date.now()}`;
    const checkoutRes = await fetch('http://localhost:5000/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        customerId: 1,
        items: [{ productId: 1, quantity: 2, discountPercent: 0, discountAmount: 0 }],
        paymentMode: 'CASH',
        tenderAmount: 200,
        accountId: 1,
        idempotencyKey
      })
    });
    const checkoutData = await checkoutRes.json();
    console.log('\n4. POST /api/sales Status:', checkoutRes.status);
    console.log('   Created Invoice ID:', checkoutData.data?.invoiceId);
    console.log('   Invoice Number:', checkoutData.data?.invoiceNumber);
    console.log('   Grand Total: ₹' + checkoutData.data?.grandTotal);

    if (checkoutRes.status !== 201) {
      throw new Error(`Expected 201 from /api/sales but got ${checkoutRes.status}: ${JSON.stringify(checkoutData)}`);
    }

    // 5. Fetch the newly created invoice (what POSPage does after checkout for the PrintReceiptModal)
    const newInvoiceRes = await fetch(`http://localhost:5000/api/sales/${checkoutData.data?.invoiceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const newInvoiceData = await newInvoiceRes.json();
    console.log('\n5. GET /api/sales/:id Status:', newInvoiceRes.status);
    console.log('   Fetched Invoice Number:', newInvoiceData.data?.invoice?.invoice_number);
    console.log('   Customer Name:', newInvoiceData.data?.invoice?.customer_name);
    console.log('   Line items in invoice:', newInvoiceData.data?.items?.length);
    console.log('   Line item 1:', newInvoiceData.data?.items?.[0]?.item_name, 'Qty:', newInvoiceData.data?.items?.[0]?.quantity);

    if (newInvoiceRes.status !== 200) {
      throw new Error(`Expected 200 from /api/sales/${checkoutData.data?.invoiceId} but got ${newInvoiceRes.status}`);
    }

    console.log('\n======================================================');
    console.log('>>> ALL POS CHECKS PASSED WITH REAL MYSQL 8.0 DATA! <<<');
    console.log('======================================================\n');
  } catch (err) {
    console.error('POS Test FAILED:', err.message);
    process.exit(1);
  }
}

run();
