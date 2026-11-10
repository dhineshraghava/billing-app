import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }

    // Find user by username or email
    const users = await query(
      `SELECT u.id, u.username, u.email, u.password_hash, u.full_name, u.role_id, u.is_active, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE (u.username = ? OR u.email = ?) LIMIT 1`,
      [username.trim(), username.trim()]
    );

    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact an administrator.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);

    // Issue JWT
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role_name,
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    return res.json({
      success: true,
      message: 'Signed in successfully.',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          roleId: user.role_id,
          roleName: user.role_name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const users = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role_id, u.is_active, u.last_login_at, r.name as role_name, r.display_name as role_display_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? LIMIT 1`,
      [req.user.id]
    );

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res) {
  return res.json({
    success: true,
    message: 'Signed out successfully.',
  });
}

/**
 * Setup Initial Administrator (only allowed if zero users exist in the database)
 */
export async function setupInitialAdmin(req, res, next) {
  try {
    const [countRows] = await query('SELECT COUNT(*) as count FROM users');
    if (countRows.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Initial admin setup is only available on an empty database.',
      });
    }

    const { username, email, password, fullName, phone } = req.body;
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password and full name are required.',
      });
    }

    // Ensure ADMIN role exists
    let adminRole = await query("SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1");
    let roleId;
    if (!adminRole || adminRole.length === 0) {
      const roleResult = await query(
        "INSERT INTO roles (name, display_name, description) VALUES ('ADMIN', 'Administrator', 'Full system access')"
      );
      roleId = roleResult.insertId;
    } else {
      roleId = adminRole[0].id;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await query(
      `INSERT INTO users (role_id, username, email, password_hash, full_name, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [roleId, username.trim(), email.trim(), passwordHash, fullName.trim(), phone || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Initial administrator account created successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const users = await query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role_id, u.is_active, u.last_login_at, u.created_at, r.name as role_name, r.display_name as role_display_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.id ASC`
    );
    return res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { roleId, username, email, password, fullName, phone } = req.body;
    if (!roleId || !username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Role, username, email, password and full name are required.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (role_id, username, email, password_hash, full_name, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [roleId, username.trim(), email.trim(), passwordHash, fullName.trim(), phone || null]
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
}

export async function getRoles(req, res, next) {
  try {
    const roles = await query('SELECT id, name, display_name, description FROM roles ORDER BY id ASC');
    return res.json({ success: true, data: roles });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { roleId, email, fullName, phone, isActive, password } = req.body;

    const [existing] = await query('SELECT id, role_id FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent self-deactivation
    if (Number(id) === req.user.id && isActive === false) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own admin account.' });
    }

    const updates = [];
    const params = [];

    if (roleId) {
      updates.push('role_id = ?');
      params.push(roleId);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email.trim());
    }
    if (fullName) {
      updates.push('full_name = ?');
      params.push(fullName.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone ? phone.trim() : null);
    }
    if (isActive !== undefined) {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }
    if (password && password.trim()) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password.trim(), salt);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    params.push(id);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    return res.json({ success: true, message: 'User account updated successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own admin account.' });
    }

    const [user] = await query('SELECT id, is_active FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = user.is_active ? 0 : 1;
    await query('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]);

    return res.json({
      success: true,
      message: `User account ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      data: { isActive: Boolean(newStatus) },
    });
  } catch (error) {
    next(error);
  }
}
