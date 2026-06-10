const jwt = require('jsonwebtoken');
const pool = require('../db');
const bcrypt = require('bcrypt');

function signToken(payload){
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });
}

// POST /auth/register
 async function register(req, res) {
    try {
        const {name , email, password, phone_number, code, grade} = req.body;
        const roleCode = code || "STUDENT";
        //1. Validate input
        if(!name || !email || !password){
            return res.status(400).json({message: "Name, email, and password are required"});
        }
        //2. Check if user already exists
        const [existingUser] = await pool.query(
            'SELECT user_id FROM `user` WHERE email = ? LIMIT 1',
            [email]
        )
        if(existingUser.length > 0){
            return res.status(409).json({message: "User already exists"});
        };
        //3. Check role code


        //4. Insert new user into database
        if (roleCode === "STUDENT") {
            const numericGrade = Number(grade);
            if (!Number.isInteger(numericGrade) || numericGrade < 1 || numericGrade > 5) {
                return res.status(400).json({ message: "Grade must be an integer from 1 to 5" });
            }
        }

        const [result] = await pool.query(
            'INSERT INTO `user` (name, email, password, phone_number, code, grade, is_deleted, is_oauth2, created_by) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)',
            [name, email, password, phone_number || null, roleCode, roleCode === "STUDENT" ? Number(grade) : null, 'anonymousUser']
        )

        return res.status(201).json({message: "User registered successfully ", userId: result.insertId});
    } catch (error) {
        console.error('Error during registration:', error);
        return res.status(500).json({message: "Internal server error", error: error.message});

    }
}
// POST /auth/login
async function login(req, res){
    try {
        const { email, password } = req.body;
        
        if(!email || ! password){
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const [rows] = await pool.query(
            "SELECT user_id, email, password, name FROM `user` WHERE email = ? LIMIT 1 ",
            [email]
        )
        if(rows.length === 0){
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = rows[0];
        // const ok = await bcrypt.compare(String(password ?? ''), String(user.password ?? ''));
        const ok = password === user.password;

        if(!ok){
            return res.status(401).json({message: "Invalid email or password"})
        }

        const token = signToken({ user_id: user.user_id, email: user.email});

        return res.json({
            accessToken: token,
            user: {
                user_id: user.user_id,
                email: user.email,
                name: user.name
            }
        })
    }
    catch(error){
        console.error('Error during login:', error);    
        return res.status(500).json({ message: 'Internal server error' });}
    }

module.exports = {
    login,
    register
};
