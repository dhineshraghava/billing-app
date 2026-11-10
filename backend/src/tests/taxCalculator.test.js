import test from 'node:test';
import assert from 'node:assert';
import { calculateItemTaxes, calculateInvoiceTotals } from '../utils/taxCalculator.js';

test('Tax Calculator - 18% Tax-Inclusive Item Calculation', () => {
  // Price = ₹118 (inclusive of 18% GST), Qty = 1
  const result = calculateItemTaxes({
    unitPrice: 118,
    quantity: 1,
    gstRate: 18,
    isTaxInclusive: true,
    customerStateCode: '33',
    storeStateCode: '33',
  });

  assert.strictEqual(result.taxableAmount, 100);
  assert.strictEqual(result.totalTax, 18);
  assert.strictEqual(result.cgstAmount, 9);
  assert.strictEqual(result.sgstAmount, 9);
  assert.strictEqual(result.igstAmount, 0);
  assert.strictEqual(result.totalAmount, 118);
});

test('Tax Calculator - 5% Tax-Exclusive Item Calculation', () => {
  // Price = ₹100 (exclusive of 5% GST), Qty = 2
  const result = calculateItemTaxes({
    unitPrice: 100,
    quantity: 2,
    gstRate: 5,
    isTaxInclusive: false,
    customerStateCode: '33',
    storeStateCode: '33',
  });

  assert.strictEqual(result.taxableAmount, 200);
  assert.strictEqual(result.totalTax, 10);
  assert.strictEqual(result.cgstAmount, 5);
  assert.strictEqual(result.sgstAmount, 5);
  assert.strictEqual(result.totalAmount, 210);
});

test('Tax Calculator - Inter-State IGST Calculation', () => {
  // Store is in Tamil Nadu (33), Customer is in Karnataka (29)
  const result = calculateItemTaxes({
    unitPrice: 118,
    quantity: 1,
    gstRate: 18,
    isTaxInclusive: true,
    customerStateCode: '29',
    storeStateCode: '33',
  });

  assert.strictEqual(result.cgstAmount, 0);
  assert.strictEqual(result.sgstAmount, 0);
  assert.strictEqual(result.igstAmount, 18);
  assert.strictEqual(result.totalTax, 18);
});

test('Tax Calculator - Decimal Quantity (e.g. 1.250 kg of apples)', () => {
  // 1.250 kg @ ₹200/kg, 0% GST (fresh fruit)
  const result = calculateItemTaxes({
    unitPrice: 200,
    quantity: 1.25,
    gstRate: 0,
    isTaxInclusive: true,
  });

  assert.strictEqual(result.totalAmount, 250);
  assert.strictEqual(result.totalTax, 0);
});

test('Tax Calculator - Invoice Totals with Bill-level Discount & Round Off', () => {
  const items = [
    { unitPrice: 100, quantity: 1, gstRate: 18, isTaxInclusive: true },
    { unitPrice: 55.45, quantity: 1, gstRate: 0, isTaxInclusive: true },
  ];

  const invoice = calculateInvoiceTotals(items, {
    billDiscountAmount: 5,
  });

  // Raw total = (100 + 55.45) - 5 = 150.45
  // Grand total rounded = 150
  // Round off = -0.45
  assert.strictEqual(invoice.rawGrandTotal, 150.45);
  assert.strictEqual(invoice.grandTotal, 150);
  assert.strictEqual(invoice.roundOff, -0.45);
});
