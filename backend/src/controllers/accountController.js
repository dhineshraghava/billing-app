import { query } from '../config/db.js';

export async function listAccounts(req, res, next) {
  try {
    const rows = await query(`
      SELECT 
        id,
        account_name,
        account_type,
        account_number,
        bank_name,
        ifsc_code,
        upi_id,
        current_balance,
        is_active,
        created_at
      FROM financial_accounts
      WHERE is_active = 1
      ORDER BY id ASC
    `);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}
