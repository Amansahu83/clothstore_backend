const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Create order
router.post('/', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { items, shipping_address } = req.body;
    let total_amount = 0;
    
    // Calculate total and check stock
    for (const item of items) {
      const productResult = await client.query('SELECT price, stock_quantity FROM products WHERE id = $1', [item.product_id]);
      if (productResult.rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found`);
      }
      
      const product = productResult.rows[0];
      if (product.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.product_id}`);
      }
      
      total_amount += product.price * item.quantity;
    }
    
    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, total_amount, shipping_address) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, total_amount, shipping_address]
    );
    
    const order = orderResult.rows[0];
    
    // Create order items and update stock
    for (const item of items) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, (SELECT price FROM products WHERE id = $2))',
        [order.id, item.product_id, item.quantity]
      );
      
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    
    await client.query('COMMIT');
    res.status(201).json(order);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get user orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, json_agg(json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price, 'name', p.name)) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders (Admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email,
       json_agg(json_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'price', oi.price, 'name', p.name)) as items
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       GROUP BY o.id, u.name, u.email
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get revenue stats (Admin only)
router.get('/admin/revenue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalRevenue = await pool.query(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != $1',
      ['cancelled']
    );
    
    const monthlyRevenue = await pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) as monthly 
       FROM orders 
       WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) 
       AND status != $1`,
      ['cancelled']
    );
    
    const totalOrders = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE status != $1',
      ['cancelled']
    );
    
    const pendingOrders = await pool.query(
      'SELECT COUNT(*) as count FROM orders WHERE status = $1',
      ['pending']
    );
    
    res.json({
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      monthlyRevenue: parseFloat(monthlyRevenue.rows[0].monthly),
      totalOrders: parseInt(totalOrders.rows[0].count),
      pendingOrders: parseInt(pendingOrders.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel order (User)
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Check if order belongs to user and is cancellable
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2 AND status IN ($3, $4)',
      [req.params.id, req.user.id, 'pending', 'processing']
    );
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or cannot be cancelled' });
    }
    
    // Get order items to restore stock
    const itemsResult = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [req.params.id]
    );
    
    // Restore stock for each item
    for (const item of itemsResult.rows) {
      await client.query(
        'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }
    
    // Update order status
    const result = await client.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', req.params.id]
    );
    
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;