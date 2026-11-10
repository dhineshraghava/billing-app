import React, { useState } from 'react';
import { Printer, X, Check, Copy, Share2, QrCode } from 'lucide-react';
import { BusinessSettings, SaleInvoice, SaleInvoiceItem } from '../../types';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleInvoice;
  items: SaleInvoiceItem[];
  payments: any[];
  store: Partial<BusinessSettings>;
}

// Code 39 Barcode Patterns for crisp vector SVG rendering on thermal & paper printers
const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000000', '$': '010101000',
  '/': '010100010', '+': '010001010', '%': '000101010', '*': '010010100',
};

// Vector SVG Invoice Barcode Component
const InvoiceBarcodeSvg: React.FC<{ value: string; height?: number; className?: string }> = ({
  value,
  height = 36,
  className = '',
}) => {
  const clean = '*' + (value || '').toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '') + '*';
  const bars: { x: number; width: number }[] = [];
  let currentX = 0;
  const narrowWidth = 1.3;
  const wideWidth = 3.1;

  for (let c = 0; c < clean.length; c++) {
    const ch = clean[c];
    const pattern = CODE39_PATTERNS[ch] || CODE39_PATTERNS['-'];
    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const width = pattern[i] === '1' ? wideWidth : narrowWidth;
      if (isBar) {
        bars.push({ x: currentX, width });
      }
      currentX += width;
    }
    currentX += narrowWidth; // inter-character space
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox={`0 0 ${currentX} ${height}`}
        className="w-full max-w-[210px]"
        style={{ height: `${height}px` }}
        shapeRendering="crispEdges"
      >
        {bars.map((bar, idx) => (
          <rect key={idx} x={bar.x} y={0} width={bar.width} height={height} fill="#000000" />
        ))}
      </svg>
      <span className="font-mono text-[9px] font-bold text-slate-800 tracking-wider mt-0.5">
        *{value}*
      </span>
      <span className="text-[8px] uppercase tracking-wider text-slate-500 font-sans">
        Invoice Lookup Barcode
      </span>
    </div>
  );
};

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  items,
  payments,
  store,
}) => {
  const [format, setFormat] = useState<'A4' | '80mm' | '58mm'>('80mm');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const copyInvoiceNumber = () => {
    navigator.clipboard.writeText(invoice.invoice_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const rawPhone = invoice.customer_phone ? String(invoice.customer_phone).replace(/[^0-9]/g, '') : '';
    const phone = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone;
    const storeTitle = store?.store_name || 'SuperMart Hypermarket';
    const itemsList = items
      .map((it) => `• ${it.item_name} (Barcode: ${it.barcode || it.sku || '-'}) x ${Number(it.quantity)} = ₹${Number(it.total_amount).toFixed(2)}`)
      .slice(0, 15)
      .join('\n');

    const text = `*${storeTitle}*\nInvoice: ${invoice.invoice_number}\nDate: ${new Date(invoice.invoice_date).toLocaleString()}\n\n*Bill Summary:*\n${itemsList}\n${items.length > 15 ? `...and ${items.length - 15} more items\n` : ''}\n*Net Payable: ₹${Number(invoice.grand_total).toFixed(2)}*\nPayment: ${invoice.payment_mode} (${invoice.payment_status})\n\nThank you for shopping at SuperMart!`;

    const waUrl = phone.length >= 10
      ? `https://api.whatsapp.com/send?phone=${phone}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Store metadata
  const storeName = store?.store_name || 'SuperMart Hypermarket';
  const storeAddress = `${store?.address_line1 || '123, Gandhi Road'}, ${store?.city || 'Chennai'} - ${store?.pincode || '600040'}`;
  const storeGstin = store?.gstin || '33ABCDE1234F1Z5';
  const storePhone = store?.phone || '+91 98765 43210';
  const storeEmail = store?.email || 'support@supermart.com';

  // Customer info fallback to Walk-in Customer
  const customerName = invoice.customer_name || 'Walk-in Customer';
  const customerPhone = invoice.customer_phone || '9999999999';

  // Financial reconciliation
  const totalItemCount = items.length;
  const totalQuantity = items.reduce((s, it) => s + Number(it.quantity), 0);
  const tenderAmount = Number(payments[0]?.tender_amount) || Number(invoice.amount_paid) || Number(invoice.grand_total);
  const changeReturned = Number(payments[0]?.change_returned) || (tenderAmount > Number(invoice.grand_total) ? tenderAmount - Number(invoice.grand_total) : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 print:p-0 print:bg-transparent">
      {/* Container Dialog */}
      <div className="relative flex max-h-[95vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl overflow-hidden print:max-h-none print:w-full print:shadow-none print:rounded-none">
        
        {/* Modal Top Bar (Hidden during printing) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 print:hidden">
          <div className="flex items-center gap-3">
            <Printer className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Receipt & Tax Invoice</h3>
              <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                {invoice.invoice_number}
                <button
                  onClick={copyInvoiceNumber}
                  title="Copy invoice number"
                  className="hover:text-blue-600 text-slate-400"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </p>
            </div>
          </div>

          {/* Format Selector Pills */}
          <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg">
            <button
              onClick={() => setFormat('A4')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                format === 'A4' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 Tax Invoice
            </button>
            <button
              onClick={() => setFormat('80mm')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                format === '80mm' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80mm Thermal (POS)
            </button>
            <button
              onClick={() => setFormat('58mm')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                format === '58mm' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58mm Compact
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
              title="Share invoice summary on WhatsApp"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-blue-700 transition"
              title="Print Receipt or Save as PDF"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Preview Body */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 print:p-0 print:bg-white flex justify-center">
          
          {/* ============================================================== */}
          {/* 1. 80mm THERMAL RECEIPT FORMAT (Standard POS Printer)         */}
          {/* ============================================================== */}
          {format === '80mm' && (
            <div className="w-[310px] bg-white p-4 shadow-sm border border-slate-200 text-slate-900 font-mono text-[11px] print:shadow-none print:border-none print:w-full print:p-2">
              
              {/* STORE HEADER */}
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="text-base font-black tracking-tight uppercase leading-tight">{storeName}</h2>
                <p className="text-[10px] text-slate-600 leading-tight mt-0.5">{storeAddress}</p>
                <p className="text-[10px] text-slate-700 mt-0.5">Contact: {storePhone}</p>
                <p className="text-[10px] font-bold text-slate-800">GSTIN: {storeGstin}</p>
              </div>

              {/* INVOICE DETAILS */}
              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No: <strong className="text-slate-900 font-bold">{invoice.invoice_number}</strong></span>
                  <span>{new Date(invoice.invoice_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time: {new Date(invoice.invoice_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>Cashier: <strong className="text-slate-800">{invoice.cashier_name || 'Cashier'}</strong></span>
                </div>
                <div>Customer: <strong className="text-slate-900">{customerName}</strong></div>
                <div>Contact: <span className="font-mono">{customerPhone}</span></div>
              </div>

              {/* PRODUCT DETAILS */}
              <div className="py-2 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold border-b border-slate-300 pb-1 mb-1 text-[10px]">
                  <span>ITEM &amp; BARCODE</span>
                  <div className="flex gap-2">
                    <span>QTY</span>
                    <span>PRICE</span>
                    <span>TOTAL</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {items.map((it, i) => (
                    <div key={i} className="border-b border-dotted border-slate-200 pb-1">
                      <div className="font-bold text-slate-900 leading-snug">{it.item_name}</div>
                      <div className="text-[9px] text-slate-600 flex justify-between">
                        <span>Barcode: <strong className="text-slate-800 font-mono">{it.barcode || it.sku || '-'}</strong></span>
                        <span>HSN: {it.hsn_code || '-'}</span>
                      </div>
                      <div className="flex justify-between text-slate-700 text-[10px] mt-0.5">
                        <span>
                          {Number(it.quantity)} {it.unit_code || 'PCS'} x ₹{Number(it.unit_price).toFixed(2)}
                          {Number(it.discount_amount) > 0 ? ` (Disc: -₹${Number(it.discount_amount).toFixed(2)})` : ''}
                          {` [GST ${Number(it.gst_rate)}%]`}
                        </span>
                        <span className="font-bold text-slate-900 font-mono">₹{Number(it.total_amount).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BILL SUMMARY */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Total Items / Qty:</span>
                  <span className="font-bold">{totalItemCount} Items / {totalQuantity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(invoice.total_discount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Total Discount:</span>
                    <span>-₹{Number(invoice.total_discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.loyalty_discount_amount) > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>Loyalty Points Redeemed ({invoice.loyalty_points_redeemed} pts):</span>
                    <span>-₹{Number(invoice.loyalty_discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxable Value:</span>
                  <span>₹{Number(invoice.taxable_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span>₹{Number(invoice.cgst_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span>₹{Number(invoice.sgst_amount).toFixed(2)}</span>
                </div>
                {Number(invoice.round_off) !== 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Round Off:</span>
                    <span>{Number(invoice.round_off) > 0 ? `+₹${Number(invoice.round_off).toFixed(2)}` : `-₹${Math.abs(Number(invoice.round_off)).toFixed(2)}`}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-400 pt-1 text-sm font-black text-slate-900">
                  <span>NET PAYABLE AMOUNT:</span>
                  <span>₹{Number(invoice.grand_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 text-slate-800">
                  <span>Payment Method:</span>
                  <span className="font-bold">{invoice.payment_mode}</span>
                </div>
                <div className="flex justify-between text-slate-800">
                  <span>Amount Received:</span>
                  <span className="font-bold font-mono">₹{tenderAmount.toFixed(2)}</span>
                </div>
                {changeReturned > 0 && (
                  <div className="flex justify-between text-slate-900 font-bold">
                    <span>Change Returned:</span>
                    <span className="font-mono text-emerald-800">₹{changeReturned.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* CUSTOMER LOYALTY SUMMARY (if registered customer) */}
              {invoice.customer_id !== 1 && (
                <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-[9px] flex items-center justify-between">
                    <span>Customer Loyalty Rewards</span>
                    <span className="text-[9px] text-amber-700 font-bold">★ Program</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Available Points Before Billing:</span>
                    <span className="font-bold font-mono">{invoice.customer_points_before ?? 0}</span>
                  </div>
                  {Number(invoice.loyalty_points_redeemed) > 0 && (
                    <div className="flex justify-between text-amber-800 font-medium">
                      <span>Points Redeemed in Current Bill:</span>
                      <span className="font-bold font-mono">-{invoice.loyalty_points_redeemed} (₹{Number(invoice.loyalty_discount_amount || 0).toFixed(2)})</span>
                    </div>
                  )}
                  <div className="flex justify-between text-emerald-800 font-medium">
                    <span>Points Earned in Current Bill:</span>
                    <span className="font-bold font-mono">+{invoice.loyalty_points_earned || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-dotted border-slate-300 pt-0.5 font-bold text-slate-900">
                    <span>Remaining Points After Billing:</span>
                    <span className="font-mono text-blue-900">{invoice.customer_points_after ?? 0} pts</span>
                  </div>
                </div>
              )}

              {/* INVOICE LOOKUP BARCODE */}
              <div className="py-2.5 border-b border-dashed border-slate-400 text-center">
                <InvoiceBarcodeSvg value={invoice.invoice_number} height={34} />
              </div>

              {/* FOOTER */}
              <div className="pt-2 text-center text-[10px] text-slate-600 space-y-1">
                <p className="font-bold text-slate-800">*** THANK YOU FOR SHOPPING! ***</p>
                <p className="text-[9px]">Exchange Policy: Goods once sold can be exchanged within 7 days in original condition with bill.</p>
                <p className="text-[9px] text-slate-700">Store Contact: {storePhone} | {storeEmail}</p>
                <p className="text-[8px] font-mono text-slate-400 pt-0.5">SuperMart POS • Relational MySQL Engine</p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. 58mm COMPACT THERMAL FORMAT (2-Inch Handheld Printer)      */}
          {/* ============================================================== */}
          {format === '58mm' && (
            <div className="w-[220px] bg-white p-2.5 shadow-sm border border-slate-200 text-slate-900 font-mono text-[9px] print:shadow-none print:border-none print:w-full print:p-1">
              
              {/* STORE HEADER */}
              <div className="text-center pb-1.5 border-b border-dashed border-slate-400">
                <div className="font-black text-xs uppercase leading-tight">{storeName}</div>
                <div className="text-[8px] text-slate-600 leading-tight mt-0.5">{storeAddress}</div>
                <div className="text-[8px] text-slate-700">Ph: {storePhone}</div>
                <div className="text-[8px] font-bold">GSTIN: {storeGstin}</div>
              </div>

              {/* INVOICE DETAILS */}
              <div className="py-1 border-b border-dashed border-slate-400 text-[8px] space-y-0.5">
                <div>Inv: <strong className="font-bold text-slate-900">{invoice.invoice_number}</strong></div>
                <div className="flex justify-between">
                  <span>{new Date(invoice.invoice_date).toLocaleDateString()}</span>
                  <span>{new Date(invoice.invoice_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>Cashier: {invoice.cashier_name || 'Cashier'}</div>
                <div>Cust: {customerName} ({customerPhone})</div>
              </div>

              {/* PRODUCT DETAILS */}
              <div className="py-1 border-b border-dashed border-slate-400 space-y-1.5">
                {items.map((it, i) => (
                  <div key={i} className="border-b border-dotted border-slate-200 pb-0.5">
                    <div className="font-bold text-slate-900 truncate">{it.item_name}</div>
                    <div className="text-[7.5px] text-slate-500">
                      Barcode: <strong className="font-mono text-slate-700">{it.barcode || it.sku || '-'}</strong> | HSN: {it.hsn_code || '-'}
                    </div>
                    <div className="flex justify-between font-bold text-[8.5px]">
                      <span>{Number(it.quantity)}x{Number(it.unit_price).toFixed(0)}</span>
                      <span>₹{Number(it.total_amount).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* BILL SUMMARY */}
              <div className="py-1 border-b border-dashed border-slate-400 space-y-0.5 text-[8.5px]">
                <div className="flex justify-between">
                  <span>Items / Qty:</span>
                  <span>{totalItemCount} / {totalQuantity.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                {Number(invoice.total_discount) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{Number(invoice.total_discount).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.loyalty_discount_amount) > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>Loyalty Disc (-{invoice.loyalty_points_redeemed}p):</span>
                    <span>-₹{Number(invoice.loyalty_discount_amount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxable:</span>
                  <span>₹{Number(invoice.taxable_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST+SGST:</span>
                  <span>₹{Number(invoice.total_tax).toFixed(2)}</span>
                </div>
                {Number(invoice.round_off) !== 0 && (
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span>{Number(invoice.round_off) > 0 ? `+${invoice.round_off}` : invoice.round_off}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-[10px] pt-1 border-t border-slate-400">
                  <span>NET TOTAL:</span>
                  <span>₹{Number(invoice.grand_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Paid ({invoice.payment_mode}):</span>
                  <span>₹{tenderAmount.toFixed(2)}</span>
                </div>
                {changeReturned > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Change:</span>
                    <span>₹{changeReturned.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* LOYALTY REWARDS (58mm) */}
              {invoice.customer_id !== 1 && (
                <div className="py-1 border-b border-dashed border-slate-400 space-y-0.5 text-[8px]">
                  <div className="font-bold text-slate-800">LOYALTY POINTS</div>
                  <div className="flex justify-between">
                    <span>Before: {invoice.customer_points_before ?? 0}</span>
                    {Number(invoice.loyalty_points_redeemed) > 0 && (
                      <span className="text-amber-800">Redeemed: -{invoice.loyalty_points_redeemed}</span>
                    )}
                    <span className="text-emerald-800">Earned: +{invoice.loyalty_points_earned || 0}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900 border-t border-dotted border-slate-300 pt-0.5">
                    <span>Balance After:</span>
                    <span className="font-mono">{invoice.customer_points_after ?? 0} pts</span>
                  </div>
                </div>
              )}

              {/* INVOICE LOOKUP BARCODE */}
              <div className="py-2 border-b border-dashed border-slate-400 text-center">
                <InvoiceBarcodeSvg value={invoice.invoice_number} height={28} />
              </div>

              {/* FOOTER */}
              <div className="pt-1.5 text-center text-[7.5px] text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-800">Thank you for shopping!</p>
                <p>Exchange in 7 days with bill.</p>
                <p>Ph: {storePhone}</p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. A4 TAX INVOICE FORMAT                                      */}
          {/* ============================================================== */}
          {format === 'A4' && (
            <div className="w-[794px] min-h-[1123px] bg-white p-8 shadow-sm border border-slate-200 text-slate-800 print:shadow-none print:border-none print:w-full print:p-4 text-xs">
              
              {/* STORE HEADER */}
              <div className="border-b-2 border-blue-600 pb-4 mb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-blue-900 tracking-tight uppercase">{storeName}</h1>
                  <p className="text-slate-600 text-xs mt-0.5">{store?.tagline || 'Quality Groceries & Fresh Everyday'}</p>
                  <p className="text-slate-700 text-xs mt-1">{storeAddress}</p>
                  <p className="text-slate-700 text-xs">Contact: <span className="font-semibold">{storePhone}</span> | Email: {storeEmail}</p>
                  <p className="text-slate-900 font-bold text-xs mt-1">GSTIN: <span className="font-mono">{storeGstin}</span></p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-blue-600 text-white font-extrabold px-3 py-1 rounded text-sm tracking-wider uppercase">
                    TAX INVOICE
                  </span>
                  <div className="mt-2 text-xs">
                    <p className="text-slate-500">Invoice No:</p>
                    <p className="font-mono font-bold text-slate-900 text-sm">{invoice.invoice_number}</p>
                    <p className="text-slate-500 mt-1">Date & Time:</p>
                    <p className="font-medium text-slate-800">{new Date(invoice.invoice_date).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* INVOICE DETAILS & CUSTOMER META */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200 mb-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Customer Details (Bill To)</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{customerName}</p>
                  <p className="text-slate-600">Contact Number: <span className="font-mono font-semibold">{customerPhone}</span></p>
                  {invoice.customer_gstin && <p className="font-mono text-slate-800">GSTIN: {invoice.customer_gstin}</p>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Invoice Metadata</span>
                  <p className="text-slate-700 mt-0.5">Cashier: <strong className="text-slate-900">{invoice.cashier_name || 'Counter Cashier'}</strong></p>
                  <p className="text-slate-600">Payment Method: <span className="font-semibold">{invoice.payment_mode}</span></p>
                  <p className="text-slate-600">Payment Status: <span className="font-bold text-emerald-700">{invoice.payment_status}</span></p>
                </div>
              </div>

              {/* PRODUCT DETAILS TABLE */}
              <table className="w-full text-left border-collapse border border-slate-300 mb-4 text-xs">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-slate-300">Product Name &amp; Barcode</th>
                    <th className="p-2 border-r border-slate-300 text-center">HSN</th>
                    <th className="p-2 border-r border-slate-300 text-center">Quantity</th>
                    <th className="p-2 border-r border-slate-300 text-right">Unit Price (₹)</th>
                    <th className="p-2 border-r border-slate-300 text-right">Discount</th>
                    <th className="p-2 border-r border-slate-300 text-right">Taxable (₹)</th>
                    <th className="p-2 border-r border-slate-300 text-center">GST %</th>
                    <th className="p-2 border-r border-slate-300 text-right">GST (₹)</th>
                    <th className="p-2 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{item.item_name}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          Barcode: <span className="font-bold text-slate-800">{item.barcode || item.sku || '-'}</span>
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-200 text-center font-mono">{item.hsn_code || '-'}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-bold">
                        {Number(item.quantity)} {item.unit_code || 'PCS'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right">{Number(item.unit_price).toFixed(2)}</td>
                      <td className="p-2 border-r border-slate-200 text-right text-emerald-600">
                        {Number(item.discount_amount) > 0 ? `-${Number(item.discount_amount).toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right">{Number(item.taxable_amount).toFixed(2)}</td>
                      <td className="p-2 border-r border-slate-200 text-center font-semibold">{Number(item.gst_rate)}%</td>
                      <td className="p-2 border-r border-slate-200 text-right">{Number(item.total_tax).toFixed(2)}</td>
                      <td className="p-2 text-right font-bold text-slate-900">{Number(item.total_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* BILL SUMMARY & TAX BREAKDOWN */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                
                {/* GST Tax Analysis */}
                <div className="border border-slate-200 rounded p-3 bg-slate-50">
                  <span className="font-bold text-slate-700 text-xs uppercase tracking-wider block mb-2">GST Tax Breakdown</span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Items &amp; Quantity:</span>
                      <span className="font-semibold text-slate-900">{totalItemCount} Items ({totalQuantity.toFixed(2)} Units)</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Taxable Value:</span>
                      <span className="font-semibold text-slate-900">₹{Number(invoice.taxable_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (Central Tax):</span>
                      <span className="font-semibold text-slate-900">₹{Number(invoice.cgst_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (State Tax):</span>
                      <span className="font-semibold text-slate-900">₹{Number(invoice.sgst_amount).toFixed(2)}</span>
                    </div>
                    {Number(invoice.igst_amount) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST (Integrated Tax):</span>
                        <span className="font-semibold text-slate-900">₹{Number(invoice.igst_amount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-300 pt-1 font-bold text-slate-900">
                      <span>Total GST Tax:</span>
                      <span>₹{Number(invoice.total_tax).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Final Calculation Totals */}
                <div className="border border-slate-200 rounded p-3 bg-slate-50 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{Number(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(invoice.total_discount) > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Total Discount:</span>
                      <span>-₹{Number(invoice.total_discount).toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.loyalty_discount_amount) > 0 && (
                    <div className="flex justify-between text-amber-800 font-semibold">
                      <span>Loyalty Discount (-{invoice.loyalty_points_redeemed} pts):</span>
                      <span>-₹{Number(invoice.loyalty_discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Value:</span>
                    <span>₹{Number(invoice.taxable_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST + SGST:</span>
                    <span>₹{Number(invoice.total_tax).toFixed(2)}</span>
                  </div>
                  {Number(invoice.round_off) !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off:</span>
                      <span>{Number(invoice.round_off) > 0 ? `+₹${Number(invoice.round_off).toFixed(2)}` : `-₹${Math.abs(Number(invoice.round_off)).toFixed(2)}`}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 text-base font-black text-slate-900">
                    <span>NET PAYABLE AMOUNT:</span>
                    <span>₹{Number(invoice.grand_total).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-700 pt-1">
                    <span>Payment Method:</span>
                    <span className="font-bold">{invoice.payment_mode}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-semibold">
                    <span>Amount Received:</span>
                    <span>₹{tenderAmount.toFixed(2)}</span>
                  </div>
                  {changeReturned > 0 && (
                    <div className="flex justify-between text-blue-800 font-bold">
                      <span>Change Returned:</span>
                      <span>₹{changeReturned.toFixed(2)}</span>
                    </div>
                  )}
                  {Number(invoice.balance_due) > 0 && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Balance Due:</span>
                      <span>₹{Number(invoice.balance_due).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* INVOICE BARCODE & FOOTER */}
              <div className="border-t border-slate-300 pt-4 flex justify-between items-end text-[11px] text-slate-600">
                <div className="max-w-md space-y-1">
                  <p className="font-bold text-slate-800">*** Thank you for shopping with SuperMart Hypermarket! ***</p>
                  <p><strong>Exchange Policy:</strong> Goods once sold can be exchanged within 7 days in original condition with this tax invoice. Perishable items and cut produce are non-returnable.</p>
                  <p><strong>Store Contact:</strong> {storePhone} | {storeEmail}</p>
                </div>
                
                {/* Visual Barcode for Invoice Lookup */}
                <div className="text-center">
                  <InvoiceBarcodeSvg value={invoice.invoice_number} height={38} />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
