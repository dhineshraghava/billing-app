import { query } from '../config/db.js';

export async function getCurrentShift(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Look for active open shift for this user
    const shifts = await query(`
      SELECT cs.*, u.full_name AS cashier_name
      FROM cashier_shifts cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.user_id = ? AND cs.status = 'OPEN'
      ORDER BY cs.id DESC
      LIMIT 1
    `, [userId]);

    if (!shifts || shifts.length === 0) {
      return res.json({
        success: true,
        data: null, // No open shift
      });
    }

    const shift = shifts[0];

    // Compute live sales in this shift
    const [salesSummary] = await query(`
      SELECT 
        COUNT(id) AS total_bills,
        COALESCE(SUM(grand_total), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount_paid ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount_paid ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'CARD' THEN amount_paid ELSE 0 END), 0) AS card_sales,
        COALESCE(SUM(CASE WHEN payment_mode NOT IN ('CASH', 'UPI', 'CARD') THEN amount_paid ELSE 0 END), 0) AS other_sales
      FROM sales_invoices
      WHERE cashier_id = ? 
        AND invoice_date >= ?
        AND status = 'COMPLETED'
    `, [userId, shift.opened_at]);

    const openingCash = Number(shift.opening_cash) || 0;
    const cashSales = Number(salesSummary?.cash_sales) || 0;
    const expectedCash = openingCash + cashSales;

    return res.json({
      success: true,
      data: {
        ...shift,
        liveStats: {
          totalBills: Number(salesSummary?.total_bills) || 0,
          totalSales: Number(salesSummary?.total_sales) || 0,
          cashSales,
          upiSales: Number(salesSummary?.upi_sales) || 0,
          cardSales: Number(salesSummary?.card_sales) || 0,
          otherSales: Number(salesSummary?.other_sales) || 0,
          expectedCash,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function openShift(req, res, next) {
  try {
    const userId = req.user?.id;
    const { openingCash = 0, registerName = 'Counter 1', notes } = req.body;

    // Check if user already has an active shift
    const existing = await query(
      "SELECT id FROM cashier_shifts WHERE user_id = ? AND status = 'OPEN' LIMIT 1",
      [userId]
    );

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'An active shift is already open for this user. Please close it first.',
        data: { shiftId: existing[0].id },
      });
    }

    const [result] = await query(`
      INSERT INTO cashier_shifts (user_id, register_name, opened_at, opening_cash, status, notes)
      VALUES (?, ?, NOW(), ?, 'OPEN', ?)
    `, [userId, registerName, Number(openingCash) || 0, notes || null]);

    const newShiftId = result?.insertId;

    return res.status(201).json({
      success: true,
      message: 'Cash counter opened successfully.',
      data: {
        id: newShiftId,
        registerName,
        openingCash: Number(openingCash) || 0,
        openedAt: new Date(),
        status: 'OPEN',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function closeShift(req, res, next) {
  try {
    const userId = req.user?.id;
    const { actualCash, notes } = req.body;

    const shifts = await query(
      "SELECT * FROM cashier_shifts WHERE user_id = ? AND status = 'OPEN' ORDER BY id DESC LIMIT 1",
      [userId]
    );

    if (!shifts || shifts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No open shift found to close.',
      });
    }

    const shift = shifts[0];

    // Compute final sales numbers for the shift
    const [salesSummary] = await query(`
      SELECT 
        COUNT(id) AS total_bills,
        COALESCE(SUM(grand_total), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount_paid ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount_paid ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'CARD' THEN amount_paid ELSE 0 END), 0) AS card_sales
      FROM sales_invoices
      WHERE cashier_id = ? 
        AND invoice_date >= ?
        AND status = 'COMPLETED'
    `, [userId, shift.opened_at]);

    const openingCash = Number(shift.opening_cash) || 0;
    const cashSales = Number(salesSummary?.cash_sales) || 0;
    const expectedCash = openingCash + cashSales;
    const countedCash = Number(actualCash) >= 0 ? Number(actualCash) : expectedCash;
    const cashDifference = countedCash - expectedCash;

    await query(`
      UPDATE cashier_shifts
      SET 
        closed_at = NOW(),
        status = 'CLOSED',
        expected_cash = ?,
        actual_cash = ?,
        cash_difference = ?,
        total_sales_amount = ?,
        total_bills_count = ?,
        total_cash_sales = ?,
        total_upi_sales = ?,
        total_card_sales = ?,
        notes = CONCAT(COALESCE(notes, ''), IF(? IS NOT NULL, CONCAT(' | ', ?), ''))
      WHERE id = ?
    `, [
      expectedCash,
      countedCash,
      cashDifference,
      Number(salesSummary?.total_sales) || 0,
      Number(salesSummary?.total_bills) || 0,
      cashSales,
      Number(salesSummary?.upi_sales) || 0,
      Number(salesSummary?.card_sales) || 0,
      notes,
      notes,
      shift.id,
    ]);

    return res.json({
      success: true,
      message: 'Cash counter closed and shift reconciled successfully.',
      data: {
        shiftId: shift.id,
        openingCash,
        cashSales,
        expectedCash,
        actualCash: countedCash,
        cashDifference,
        totalSales: Number(salesSummary?.total_sales) || 0,
        totalBills: Number(salesSummary?.total_bills) || 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getShiftHistory(req, res, next) {
  try {
    const { limit = 20 } = req.query;
    const rows = await query(`
      SELECT 
        cs.*,
        u.full_name AS cashier_name,
        u.username AS cashier_username
      FROM cashier_shifts cs
      JOIN users u ON cs.user_id = u.id
      ORDER BY cs.id DESC
      LIMIT ?
    `, [parseInt(limit, 10)]);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

