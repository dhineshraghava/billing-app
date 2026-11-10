/**
 * Concurrency-safe Invoice Number Generator
 * Formats: INV-YYYYMM-0001, RET-YYYYMM-0001, PUR-YYYYMM-0001, PAY-YYYYMM-0001
 */

export async function generateDocumentNumber(connection, type = 'SALE', prefixOverride = null) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const period = `${year}${month}`;

  let defaultPrefix = 'INV';
  let tableName = 'sales_invoices';
  let column = 'invoice_number';

  if (type === 'SALE') {
    defaultPrefix = 'INV';
    tableName = 'sales_invoices';
    column = 'invoice_number';
  } else if (type === 'SALE_RETURN') {
    defaultPrefix = 'RET';
    tableName = 'sales_returns';
    column = 'return_number';
  } else if (type === 'PURCHASE') {
    defaultPrefix = 'PUR';
    tableName = 'purchase_invoices';
    column = 'invoice_number';
  } else if (type === 'PURCHASE_RETURN') {
    defaultPrefix = 'PRET';
    tableName = 'purchase_returns';
    column = 'return_number';
  } else if (type === 'PAYMENT') {
    defaultPrefix = 'PAY';
    tableName = 'payments';
    column = 'payment_number';
  } else if (type === 'EXPENSE') {
    defaultPrefix = 'EXP';
    tableName = 'expenses';
    column = 'expense_number';
  } else if (type === 'TRANSACTION') {
    defaultPrefix = 'TXN';
    tableName = 'account_transactions';
    column = 'transaction_number';
  }

  const prefix = prefixOverride || `${defaultPrefix}-${period}-`;

  // Select the highest numbered document matching prefix with FOR UPDATE lock inside transaction
  const sql = `
    SELECT ${column} AS last_number 
    FROM ${tableName} 
    WHERE ${column} LIKE ? 
    ORDER BY id DESC 
    LIMIT 1 
    FOR UPDATE
  `;

  const [rows] = await connection.query(sql, [`${prefix}%`]);

  let nextSequence = 1;
  if (rows && rows.length > 0 && rows[0].last_number) {
    const lastDoc = rows[0].last_number;
    const parts = lastDoc.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, '0');
  return `${prefix}${paddedSequence}`;
}
