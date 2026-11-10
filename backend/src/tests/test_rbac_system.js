// Comprehensive Automated Test Suite for Role-Based Access Control (RBAC) & Redirection
import http from 'http';

function apiRequest({ method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api${path}`,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            parsed = rawData;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('   SuperMart Hypermarket POS - Full Automated RBAC Test Suite   ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await apiRequest({ path: '/health' });
    assert(
      health.status === 200 && health.data?.database?.status === 'connected',
      `Live MySQL connection health is connected (${health.data?.database?.host}, ${health.data?.database?.latencyMs}ms)`
    );

    // 2. Test Admin Login & Full Privileges
    console.log('\n--- 1. Testing Admin Authentication & Full Privileges ---');
    const adminLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'admin', password: 'Admin@123' },
    });
    assert(adminLogin.status === 200, 'Admin login succeeds with 200 OK');
    assert(adminLogin.data?.data?.user?.roleName === 'ADMIN', 'Admin user has role ADMIN');
    const adminToken = adminLogin.data?.data?.token;
    assert(!!adminToken, 'Admin receives valid JWT token');

    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Admin should access Dashboard Summary
    const adminDash = await apiRequest({ path: '/dashboard/summary', headers: adminHeaders });
    assert(adminDash.status === 200 && adminDash.data?.success, 'Admin can access /dashboard/summary');

    // Admin should access Store Settings
    const adminSettings = await apiRequest({ path: '/settings', headers: adminHeaders });
    assert(adminSettings.status === 200 && adminSettings.data?.success, 'Admin can access /settings');

    // Admin should access User Management
    const adminUsers = await apiRequest({ path: '/auth/users', headers: adminHeaders });
    assert(adminUsers.status === 200 && Array.isArray(adminUsers.data?.data), 'Admin can list staff /auth/users');

    // Admin can access sales, inventory, products
    const adminSales = await apiRequest({ path: '/sales', headers: adminHeaders });
    assert(adminSales.status === 200, 'Admin can view all sales history');

    // 3. Test Cashier Login & Strict Route Restrictions
    console.log('\n--- 2. Testing Salesperson / Cashier Authentication & Strict Route Guarding ---');
    const cashierLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'cashier', password: 'Cashier@123' },
    });
    assert(cashierLogin.status === 200, 'Cashier login succeeds with 200 OK');
    assert(cashierLogin.data?.data?.user?.roleName === 'CASHIER', 'Cashier user has role CASHIER');
    const cashierToken = cashierLogin.data?.data?.token;
    const cashierHeaders = { Authorization: `Bearer ${cashierToken}` };

    // Cashier allowed: POS Billing and Own Sales
    const cashierSales = await apiRequest({ path: '/sales', headers: cashierHeaders });
    assert(cashierSales.status === 200, 'Cashier can access /sales (filtered to own records)');

    // Cashier BLOCKED from Admin Dashboard
    const cashierDash = await apiRequest({ path: '/dashboard/summary', headers: cashierHeaders });
    assert(cashierDash.status === 403, `Cashier BLOCKED from /dashboard/summary (Got HTTP ${cashierDash.status})`);

    // Cashier BLOCKED from Changing Store Settings
    const cashierSettingsPut = await apiRequest({
      method: 'PUT',
      path: '/settings',
      headers: cashierHeaders,
      body: { storeName: 'Hacked Store' },
    });
    assert(cashierSettingsPut.status === 403, `Cashier BLOCKED from modifying /settings (Got HTTP ${cashierSettingsPut.status})`);

    // Cashier BLOCKED from Staff/User Management
    const cashierUsers = await apiRequest({ path: '/auth/users', headers: cashierHeaders });
    assert(cashierUsers.status === 403, `Cashier BLOCKED from /auth/users (Got HTTP ${cashierUsers.status})`);

    // Cashier BLOCKED from Suppliers management
    const cashierSuppliers = await apiRequest({ path: '/suppliers', headers: cashierHeaders });
    assert(cashierSuppliers.status === 403, `Cashier BLOCKED from /suppliers (Got HTTP ${cashierSuppliers.status})`);

    // Cashier BLOCKED from Expenses management
    const cashierExpenses = await apiRequest({ path: '/expenses', headers: cashierHeaders });
    assert(cashierExpenses.status === 403, `Cashier BLOCKED from /expenses (Got HTTP ${cashierExpenses.status})`);

    // 4. Test Store Manager Login & Scoped Privileges
    console.log('\n--- 3. Testing Store Manager Authentication & Scoped Privileges ---');
    const managerLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'manager', password: 'Manager@123' },
    });
    assert(managerLogin.status === 200, 'Manager login succeeds with 200 OK');
    assert(managerLogin.data?.data?.user?.roleName === 'MANAGER', 'Manager user has role MANAGER');
    const managerToken = managerLogin.data?.data?.token;
    const managerHeaders = { Authorization: `Bearer ${managerToken}` };

    // Manager allowed: Dashboard
    const managerDash = await apiRequest({ path: '/dashboard/summary', headers: managerHeaders });
    assert(managerDash.status === 200, 'Manager can access /dashboard/summary');

    // Manager allowed: Inventory
    const managerInv = await apiRequest({ path: '/inventory', headers: managerHeaders });
    assert(managerInv.status === 200, 'Manager can access /inventory');

    // Manager allowed: Suppliers
    const managerSuppliers = await apiRequest({ path: '/suppliers', headers: managerHeaders });
    assert(managerSuppliers.status === 200, 'Manager can access /suppliers');

    // Manager BLOCKED: Modifying Store Settings
    const managerSettingsPut = await apiRequest({
      method: 'PUT',
      path: '/settings',
      headers: managerHeaders,
      body: { storeName: 'Manager Override' },
    });
    assert(managerSettingsPut.status === 403, `Manager BLOCKED from modifying /settings (Got HTTP ${managerSettingsPut.status})`);

    // Manager BLOCKED: User management
    const managerUsers = await apiRequest({ path: '/auth/users', headers: managerHeaders });
    assert(managerUsers.status === 403, `Manager BLOCKED from /auth/users (Got HTTP ${managerUsers.status})`);

    // 5. Test Inventory Staff Login & Scoped Privileges
    console.log('\n--- 4. Testing Inventory Staff Authentication & Scoped Privileges ---');
    const invLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'inventory', password: 'Inventory@123' },
    });
    assert(invLogin.status === 200, 'Inventory Staff login succeeds with 200 OK');
    assert(invLogin.data?.data?.user?.roleName === 'INVENTORY_STAFF', 'Inventory user has role INVENTORY_STAFF');
    const invToken = invLogin.data?.data?.token;
    const invHeaders = { Authorization: `Bearer ${invToken}` };

    // Inventory allowed: Inventory list
    const invList = await apiRequest({ path: '/inventory', headers: invHeaders });
    assert(invList.status === 200, 'Inventory Staff can access /inventory');

    // Inventory allowed: Purchases list
    const invPurchases = await apiRequest({ path: '/purchases', headers: invHeaders });
    assert(invPurchases.status === 200, 'Inventory Staff can access /purchases');

    // Inventory BLOCKED from Dashboard
    const invDash = await apiRequest({ path: '/dashboard/summary', headers: invHeaders });
    assert(invDash.status === 403, `Inventory Staff BLOCKED from /dashboard/summary (Got HTTP ${invDash.status})`);

    // Inventory BLOCKED from Modifying Settings
    const invSettingsPut = await apiRequest({
      method: 'PUT',
      path: '/settings',
      headers: invHeaders,
      body: { storeName: 'Staff Store' },
    });
    assert(invSettingsPut.status === 403, `Inventory Staff BLOCKED from modifying /settings (Got HTTP ${invSettingsPut.status})`);

    // Inventory BLOCKED from Users Management
    const invUsers = await apiRequest({ path: '/auth/users', headers: invHeaders });
    assert(invUsers.status === 403, `Inventory Staff BLOCKED from /auth/users (Got HTTP ${invUsers.status})`);

    // Inventory BLOCKED from Suppliers
    const invSuppliers = await apiRequest({ path: '/suppliers', headers: invHeaders });
    assert(invSuppliers.status === 403, `Inventory Staff BLOCKED from /suppliers (Got HTTP ${invSuppliers.status})`);

    // 6. Test Inactive Account Blocking at Login
    console.log('\n--- 5. Testing Account Activation/Deactivation Flow ---');
    // Find cashier's id from user list
    const cashierUserObj = adminUsers.data.data.find((u) => u.username === 'cashier');
    assert(!!cashierUserObj, 'Found cashier user record in MySQL');

    // Admin deactivates cashier
    const deactivateRes = await apiRequest({
      method: 'PATCH',
      path: `/auth/users/${cashierUserObj.id}/status`,
      headers: adminHeaders,
    });
    assert(deactivateRes.status === 200, 'Admin successfully toggled cashier status to INACTIVE');

    // Cashier attempts to login while inactive
    const inactiveLoginAttempt = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'cashier', password: 'Cashier@123' },
    });
    assert(
      inactiveLoginAttempt.status === 403,
      `Deactivated user rejected with 403 Forbidden: "${inactiveLoginAttempt.data?.message}"`
    );

    // Admin re-activates cashier
    const reactivateRes = await apiRequest({
      method: 'PATCH',
      path: `/auth/users/${cashierUserObj.id}/status`,
      headers: adminHeaders,
    });
    assert(reactivateRes.status === 200, 'Admin successfully toggled cashier status back to ACTIVE');

    // Cashier can now login again
    const postReactivateLogin = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'cashier', password: 'Cashier@123' },
    });
    assert(postReactivateLogin.status === 200, 'Re-activated cashier can log in successfully');

    // 7. Security: Invalid credentials and unauthorized calls
    console.log('\n--- 6. Testing Credential Security & Token Verification ---');
    const badPass = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'admin', password: 'WrongPassword999' },
    });
    assert(badPass.status === 401, `Invalid password rejected with 401 Unauthorized (${badPass.data?.message})`);

    const badUser = await apiRequest({
      method: 'POST',
      path: '/auth/login',
      body: { username: 'nonexistent_user', password: 'AnyPassword' },
    });
    assert(badUser.status === 401, `Non-existent user rejected with 401 Unauthorized (${badUser.data?.message})`);

    const noAuth = await apiRequest({ path: '/settings' });
    assert(noAuth.status === 401, `Unauthenticated request rejected with 401 Unauthorized (${noAuth.data?.message})`);

    const forgedToken = await apiRequest({
      path: '/settings',
      headers: { Authorization: 'Bearer forged.tampered.token' },
    });
    assert(forgedToken.status === 401, `Forged JWT token rejected with 401 Unauthorized (${forgedToken.data?.message})`);

    console.log('\n===============================================================');
    console.log(`   Test Results: ${passed} PASSED | ${failed} FAILED`);
    console.log('===============================================================\n');

    if (failed === 0) {
      console.log('ALL ROLE-BASED ACCESS CONTROL TESTS PASSED PERFECTLY!');
      process.exit(0);
    } else {
      console.error('SOME TESTS FAILED.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runTests();
