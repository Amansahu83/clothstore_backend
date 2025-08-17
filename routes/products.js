const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const router = express.Router();

// Configure multer for memory storage (for Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Get all products (exclude soft deleted)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single product (exclude soft deleted)
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create product (Admin only)
router.post('/', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, size, color, stock_quantity } = req.body;
    let image_url = null;
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'clothstore' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });
        image_url = result.secure_url;
      } catch (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }
    
    const result = await pool.query(
      'INSERT INTO products (name, description, price, category, size, color, stock_quantity, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, description, price, category, size, color, stock_quantity, image_url]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product (Admin only)
router.put('/:id', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, size, color, stock_quantity } = req.body;
    let image_url = req.body.image_url;
    
    if (req.file) {
      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'clothstore' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          ).end(req.file.buffer);
        });
        image_url = result.secure_url;
      } catch (error) {
        console.error('Cloudinary upload error:', error);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }
    
    const result = await pool.query(
      'UPDATE products SET name = $1, description = $2, price = $3, category = $4, size = $5, color = $6, stock_quantity = $7, image_url = $8 WHERE id = $9 RETURNING *',
      [name, description, price, category, size, color, stock_quantity, image_url, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Soft delete product (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *', 
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found or already deleted' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;