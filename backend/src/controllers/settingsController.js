import { query } from '../config/db.js';

export async function getSettings(req, res, next) {
  try {
    const [settings] = await query('SELECT * FROM business_settings LIMIT 1');
    return res.json({
      success: true,
      data: settings || {},
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    // Only Admin (or Store Manager) can change business/loyalty settings
    if (req.user && req.user.roleName !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only Administrators can update store settings.',
      });
    }

    const {
      storeName,
      tagline,
      gstin,
      panNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      stateCode,
      pincode,
      phone,
      email,
      website,
      invoicePrefix,
      thermalReceiptHeader,
      thermalReceiptFooter,
      loyaltyEnabled,
      loyaltyMinPurchase,
      loyaltyPointsPerInvoice,
      loyaltyRedemptionRate,
      loyaltyRedemptionEnabled,
    } = req.body;

    await query(`
      UPDATE business_settings SET
        store_name = COALESCE(?, store_name),
        tagline = COALESCE(?, tagline),
        gstin = COALESCE(?, gstin),
        pan_number = COALESCE(?, pan_number),
        address_line1 = COALESCE(?, address_line1),
        address_line2 = COALESCE(?, address_line2),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        state_code = COALESCE(?, state_code),
        pincode = COALESCE(?, pincode),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        website = COALESCE(?, website),
        invoice_prefix = COALESCE(?, invoice_prefix),
        thermal_receipt_header = COALESCE(?, thermal_receipt_header),
        thermal_receipt_footer = COALESCE(?, thermal_receipt_footer),
        loyalty_enabled = COALESCE(?, loyalty_enabled),
        loyalty_min_purchase = COALESCE(?, loyalty_min_purchase),
        loyalty_points_per_invoice = COALESCE(?, loyalty_points_per_invoice),
        loyalty_redemption_rate = COALESCE(?, loyalty_redemption_rate),
        loyalty_redemption_enabled = COALESCE(?, loyalty_redemption_enabled)
      WHERE id = 1
    `, [
      storeName, tagline, gstin, panNumber, addressLine1, addressLine2,
      city, state, stateCode, pincode, phone, email, website,
      invoicePrefix, thermalReceiptHeader, thermalReceiptFooter,
      loyaltyEnabled !== undefined ? (loyaltyEnabled ? 1 : 0) : null,
      loyaltyMinPurchase !== undefined ? Number(loyaltyMinPurchase) : null,
      loyaltyPointsPerInvoice !== undefined ? Number(loyaltyPointsPerInvoice) : null,
      loyaltyRedemptionRate !== undefined ? Number(loyaltyRedemptionRate) : null,
      loyaltyRedemptionEnabled !== undefined ? (loyaltyRedemptionEnabled ? 1 : 0) : null,
    ]);

    return res.json({
      success: true,
      message: 'Business settings updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}
