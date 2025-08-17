const pool = require('../config/database');

const addSoftDelete = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add deleted_at column to products table
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL
    `);
    
    await client.query('COMMIT');
    console.log('✅ Soft delete column added successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding soft delete column:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { addSoftDelete };

// Run migration if called directly
if (require.main === module) {
  addSoftDelete()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}