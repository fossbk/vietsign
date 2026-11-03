const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { isDatabaseError } = require('../db');
const { revokeToken } = require('../services/tokenRevocation.service');
const { hashPassword, verifyPassword } = require('../utils/password');

function signToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });
}

function sendDbUnavailable(res, error) {
    return res.status(503).json({
        message: "Dịch vụ cơ sở dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
}

// POST /auth/register
async function register(req, res) {
    try {
        const { name, email, password, phone_number, code } = req.body || {};
        const roleCode = (code || "STUDENT").toUpperCase();

        // 1. Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email, and password are required" });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const cleanName = String(name).trim();
        const cleanPhone = phone_number ? String(phone_number).trim() : null;

        // 2. Check if user already exists
        const [existingUser] = await pool.query(
            'SELECT user_id FROM `user` WHERE LOWER(email) = ? LIMIT 1',
            [cleanEmail]
        );
        if (existingUser.length > 0) {
            return res.status(409).json({ message: "User already exists" });
        }

        // 3. Insert new user into database
        const hashedPassword = await hashPassword(password);
        const [result] = await pool.query(
            'INSERT INTO `user` (name, email, password, phone_number, code, grade, is_deleted, is_oauth2, created_by, created_date, status, approval_status) VALUES (?, ?, ?, ?, ?, NULL, 0, 0, ?, NOW(), "active", "PENDING")',
            [cleanName, cleanEmail, hashedPassword, cleanPhone, roleCode, 'anonymousUser']
        );

        return res.status(201).json({
            message: "User registered successfully",
            userId: result.insertId
        });
    } catch (error) {
        console.error('Error during registration:', error);
        if (isDatabaseError(error)) {
            return sendDbUnavailable(res, error);
        }
        return res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// POST /auth/login
async function login(req, res) {
    try {
        const { email, password } = req.body || {};
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const cleanEmail = String(email).trim().toLowerCase();

        const [rows] = await pool.query(
            "SELECT user_id, email, password, name, code, approval_status, status FROM `user` WHERE LOWER(email) = ? AND is_deleted = 0 LIMIT 1",
            [cleanEmail]
        );
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = rows[0];

        if (user.status === 'inactive') {
            return res.status(403).json({ message: "Tài khoản của bạn đã bị vô hiệu hóa." });
        }

        const ok = await verifyPassword(password, user.password);
        if (!ok) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const roleCode = user.code || 'USER';
        const token = signToken({
            user_id: user.user_id,
            email: user.email,
            code: roleCode,
            role: roleCode
        });

        return res.json({
            accessToken: token,
            user: {
                user_id: user.user_id,
                email: user.email,
                name: user.name,
                code: roleCode,
                role: roleCode,
                approval_status: user.approval_status
            }
        });
    } catch (error) {
        console.error('Error during login:', error);    
        if (isDatabaseError(error)) {
            return sendDbUnavailable(res, error);
        }
        return res.status(500).json({ 
            message: 'Internal server error', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
}

// POST /auth/logout
async function logout(req, res) {
    try {
        await revokeToken(req.authToken, req.user);
        return res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.error('Error during logout:', error);
        if (isDatabaseError(error)) {
            return sendDbUnavailable(res, error);
        }
        return res.status(500).json({ 
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// GET /auth/verify
async function verify(req, res) {
    try {
        return res.status(200).json({
            valid: true,
            user: req.user
        });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

// POST /auth/forgot-password
async function forgotPassword(req, res) {
    try {
        const { email } = req.body || {};
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const [users] = await pool.query(
            "SELECT user_id, email FROM `user` WHERE LOWER(email) = ? AND is_deleted = 0 LIMIT 1",
            [cleanEmail]
        );

        if (users.length === 0) {
            return res.status(200).json({
                message: "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi."
            });
        }

        const user = users[0];
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        await pool.query(
            "UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0",
            [user.user_id]
        );

        await pool.query(
            "INSERT INTO password_reset_tokens (user_id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)",
            [user.user_id, user.email, resetToken, expiresAt]
        );

        return res.status(200).json({
            message: "Đã tạo yêu cầu đặt lại mật khẩu thành công.",
            resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined
        });
    } catch (error) {
        console.error('Error during forgotPassword:', error);
        if (isDatabaseError(error)) {
            return sendDbUnavailable(res, error);
        }
        return res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// POST /auth/reset-password
async function resetPassword(req, res) {
    try {
        const { token, password } = req.body || {};
        if (!token || !password) {
            return res.status(400).json({ message: "Token và mật khẩu mới là bắt buộc" });
        }

        const [tokens] = await pool.query(
            "SELECT id, user_id, email, expires_at, used FROM password_reset_tokens WHERE token = ? LIMIT 1",
            [token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({ message: "Link đặt lại mật khẩu không hợp lệ" });
        }

        const tokenRecord = tokens[0];
        if (tokenRecord.used) {
            return res.status(400).json({ message: "Link đặt lại mật khẩu này đã được sử dụng" });
        }

        if (new Date(tokenRecord.expires_at) < new Date()) {
            return res.status(400).json({ message: "Link đặt lại mật khẩu đã hết hạn" });
        }

        const hashedPassword = await hashPassword(password);

        await pool.query(
            "UPDATE `user` SET password = ?, modified_date = NOW(), modified_by = ? WHERE user_id = ?",
            [hashedPassword, tokenRecord.email, tokenRecord.user_id]
        );

        await pool.query(
            "UPDATE password_reset_tokens SET used = 1 WHERE id = ?",
            [tokenRecord.id]
        );

        return res.status(200).json({ message: "Đặt lại mật khẩu thành công" });
    } catch (error) {
        console.error('Error during resetPassword:', error);
        if (isDatabaseError(error)) {
            return sendDbUnavailable(res, error);
        }
        return res.status(500).json({
            message: "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = {
    login,
    register,
    logout,
    verify,
    forgotPassword,
    resetPassword
};
