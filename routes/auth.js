const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');
const pool = require('../config/database');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, role',
      [name, email, hashedPassword]
    );
    
    const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token, user: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour
    
    // Save token to database
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [resetToken, resetTokenExpires, email]
    );
    
    // Send email using Python script
    const scriptPath = path.resolve(__dirname, '..', 'mail.py');
    const python = spawn('python', [scriptPath, email, resetToken], {
      cwd: path.resolve(__dirname, '..')
    });
    
    let errorOutput = '';
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    python.on('close', (code) => {
      if (code === 0) {
        res.json({ message: 'Reset token sent to email' });
      } else {
        console.error('Python script error:', errorOutput);
        // Fallback: log reset link to console
        const resetUrl = `http://localhost:3000/reset-password?email=${encodeURIComponent(email)}&token=${resetToken}`;
        console.log(`\n=== PASSWORD RESET LINK (Email failed) ===`);
        console.log(`Email: ${email}`);
        console.log(`Reset Link: ${resetUrl}`);
        console.log(`==========================================\n`);
        res.json({ message: 'Reset token generated. Check server console for token.' });
      }
    });
    
    python.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      res.status(500).json({ error: 'Failed to send email' });
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [email, token]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset token
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2',
      [hashedPassword, email]
    );
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;