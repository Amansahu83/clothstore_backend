const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

console.log('Razorpay credentials:', {
  key_id: process.env.RAZORPAY_KEY_ID ? 'Set' : 'Missing',
  key_secret: process.env.RAZORPAY_KEY_SECRET ? 'Set' : 'Missing'
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create payment order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    console.log('Creating Razorpay order:', req.body);
    const { amount, currency = 'INR' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    const options = {
      amount: Math.round(amount * 100), // Convert to paise and round
      currency,
      receipt: `order_${Date.now()}`,
    };

    console.log('Razorpay options:', options);
    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created:', order);
    res.json(order);
  } catch (error) {
    console.error('Razorpay order creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify payment
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
    
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment verified, create order
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        const orderResult = await client.query(
          'INSERT INTO orders (user_id, total_amount, status, shipping_address) VALUES ($1, $2, $3, $4) RETURNING *',
          [req.user.id, orderData.total_amount, 'paid', orderData.shipping_address]
        );
        
        const orderId = orderResult.rows[0].id;
        
        for (const item of orderData.items) {
          await client.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
            [orderId, item.product_id, item.quantity, item.price]
          );
        }
        
        await client.query('COMMIT');
        res.json({ success: true, order: orderResult.rows[0] });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      res.status(400).json({ error: 'Payment verification failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;