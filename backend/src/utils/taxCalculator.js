/**
 * GST Calculation Utility for Indian Retail / Supermarkets
 * Supports Tax-Inclusive & Tax-Exclusive pricing, Intra-state (CGST+SGST) and Inter-state (IGST)
 */

export function round(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates tax breakdown for a single item line
 * 
 * @param {Object} item
 * @param {number} item.unitPrice - Selling price per unit
 * @param {number} item.quantity - Quantity (can be decimal)
 * @param {number} [item.discountPercent=0] - Percentage discount
 * @param {number} [item.discountAmount=0] - Flat discount amount
 * @param {number} [item.gstRate=0] - GST rate percentage (e.g. 5, 12, 18)
 * @param {boolean} [item.isTaxInclusive=true] - Whether unitPrice already includes GST
 * @param {string} [customerStateCode='33'] - Destination state code (33 = Tamil Nadu)
 * @param {string} [storeStateCode='33'] - Store state code
 */
export function calculateItemTaxes({
  unitPrice,
  quantity,
  discountPercent = 0,
  discountAmount = 0,
  gstRate = 0,
  isTaxInclusive = true,
  customerStateCode = '33',
  storeStateCode = '33',
}) {
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const rate = Number(gstRate) || 0;

  // Gross line amount before discounts
  const grossLineAmount = round(price * qty);

  // Calculate discount
  let totalDiscount = 0;
  if (discountPercent > 0) {
    totalDiscount = round((grossLineAmount * discountPercent) / 100);
  } else if (discountAmount > 0) {
    totalDiscount = round(Math.min(discountAmount, grossLineAmount));
  }

  // Net amount after discount
  const discountedLineAmount = Math.max(0, grossLineAmount - totalDiscount);

  let taxableAmount = 0;
  let totalTax = 0;
  let lineTotal = 0;

  if (rate <= 0) {
    // 0% GST (e.g. fresh milk, unpackaged vegetables, salt)
    taxableAmount = discountedLineAmount;
    totalTax = 0;
    lineTotal = discountedLineAmount;
  } else if (isTaxInclusive) {
    // Price includes GST: Taxable = Total / (1 + rate / 100)
    taxableAmount = round(discountedLineAmount / (1 + rate / 100));
    totalTax = round(discountedLineAmount - taxableAmount);
    lineTotal = discountedLineAmount;
  } else {
    // Price excludes GST: Taxable = Price, Tax = Price * (rate / 100)
    taxableAmount = discountedLineAmount;
    totalTax = round((taxableAmount * rate) / 100);
    lineTotal = round(taxableAmount + totalTax);
  }

  // Split into CGST + SGST or IGST
  const isInterState = customerStateCode && storeStateCode && customerStateCode !== storeStateCode;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstAmount = totalTax;
  } else {
    cgstAmount = round(totalTax / 2);
    sgstAmount = round(totalTax - cgstAmount); // Exact sum to avoid rounding disparity
  }

  return {
    quantity: qty,
    unitPrice: price,
    grossLineAmount,
    discountPercent: Number(discountPercent) || 0,
    discountAmount: totalDiscount,
    taxableAmount,
    gstRate: rate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    totalAmount: lineTotal,
  };
}

/**
 * Calculates complete bill totals including invoice-level discount and round-off
 */
export function calculateInvoiceTotals(items, options = {}) {
  const {
    billDiscountPercent = 0,
    billDiscountAmount = 0,
    customerStateCode = '33',
    storeStateCode = '33',
  } = options;

  let subtotal = 0;
  let totalItemDiscount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalTax = 0;
  let preBillDiscountTotal = 0;

  const processedItems = items.map((item) => {
    const calculated = calculateItemTaxes({
      ...item,
      customerStateCode,
      storeStateCode,
    });

    subtotal += calculated.grossLineAmount;
    totalItemDiscount += calculated.discountAmount;
    taxableAmount += calculated.taxableAmount;
    cgstAmount += calculated.cgstAmount;
    sgstAmount += calculated.sgstAmount;
    igstAmount += calculated.igstAmount;
    totalTax += calculated.totalTax;
    preBillDiscountTotal += calculated.totalAmount;

    return {
      ...item,
      ...calculated,
    };
  });

  // Calculate bill-level additional discount
  let additionalBillDiscount = 0;
  if (billDiscountPercent > 0) {
    additionalBillDiscount = round((preBillDiscountTotal * billDiscountPercent) / 100);
  } else if (billDiscountAmount > 0) {
    additionalBillDiscount = round(Math.min(billDiscountAmount, preBillDiscountTotal));
  }

  const rawGrandTotal = Math.max(0, preBillDiscountTotal - additionalBillDiscount);
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = round(grandTotal - rawGrandTotal);

  return {
    items: processedItems,
    subtotal: round(subtotal),
    totalDiscount: round(totalItemDiscount + additionalBillDiscount),
    billDiscountAmount: round(additionalBillDiscount),
    taxableAmount: round(taxableAmount),
    cgstAmount: round(cgstAmount),
    sgstAmount: round(sgstAmount),
    igstAmount: round(igstAmount),
    totalTax: round(totalTax),
    rawGrandTotal: round(rawGrandTotal),
    roundOff,
    grandTotal,
  };
}
