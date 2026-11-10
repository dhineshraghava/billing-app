import { withTransaction, query } from '../config/db.js';
import { generateDocumentNumber } from '../utils/invoiceNumberGenerator.js';

export async function listExpenses(req, res, next) {
  try {
    const { category, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const params = [];
    const conditions = [];

    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }

    if (startDate) {
      conditions.push('DATE(e.expense_date) >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('DATE(e.expense_date) <= ?');
      params.push(endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRow] = await query(`SELECT COUNT(*) AS total FROM expenses e ${where}`, params);
    const totalRecords = countRow?.total || 0;

    const dataSql = `
      SELECT 
        e.id,
        e.expense_number,
        e.expense_date,
        e.category,
        e.title,
        e.description,
        e.amount,
        e.payment_mode,
        fa.account_name,
        e.paid_to,
        u.full_name AS approved_by_name,
        e.created_at
      FROM expenses e
      JOIN financial_accounts fa ON e.account_id = fa.id
      JOIN users u ON e.approved_by_user_id = u.id
      ${where}
      ORDER BY e.expense_date DESC, e.id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit, 10), offset);
    const rows = await query(dataSql, params);

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalRecords,
        totalPages: Math.ceil(totalRecords / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createExpense(req, res, next) {
  try {
    const {
      title,
      category = 'MISCELLANEOUS',
      amount,
      paymentMode = 'CASH',
      accountId = 1,
      paidTo,
      description,
    } = req.body;

    const expenseAmount = Number(amount);
    if (!title || isNaN(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid expense title and positive amount are required.',
      });
    }

    const approvedByUserId = req.user?.id || 1;

    const expense = await withTransaction(async (conn) => {
      const expenseNumber = await generateDocumentNumber(conn, 'EXPENSE');

      const [eResult] = await conn.query(`
        INSERT INTO expenses (
          expense_number, expense_date, category, title, description,
          amount, payment_mode, account_id, paid_to, approved_by_user_id
        ) VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        expenseNumber,
        category,
        title.trim(),
        description || null,
        expenseAmount,
        paymentMode,
        accountId,
        paidTo || null,
        approvedByUserId,
      ]);

      const expenseId = eResult.insertId;

      // Deduct from financial account
      await conn.query('UPDATE financial_accounts SET current_balance = current_balance - ? WHERE id = ?', [expenseAmount, accountId]);

      const [acc] = await conn.query('SELECT current_balance FROM financial_accounts WHERE id = ?', [accountId]);
      const newBal = acc[0]?.current_balance || 0;

      const txnNumber = await generateDocumentNumber(conn, 'TRANSACTION');
      await conn.query(`
        INSERT INTO account_transactions (
          transaction_number, transaction_date, account_id, transaction_type,
          amount, balance_after, reference_type, reference_id, description, created_by_user_id
        ) VALUES (?, NOW(), ?, 'DEBIT', ?, ?, 'EXPENSE', ?, ?, ?)
      `, [
        txnNumber,
        accountId,
        expenseAmount,
        newBal,
        expenseId,
        `Expense: ${title} (${category})`,
        approvedByUserId,
      ]);

      return {
        id: expenseId,
        expenseNumber,
        title,
        amount: expenseAmount,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Expense recorded successfully.',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
}
