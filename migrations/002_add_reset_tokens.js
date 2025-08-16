const pool = require('../config/database');

const addResetTokenColumns = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Add reset token columns to users table
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP
    `);
    
    await client.query('COMMIT');
    console.log('✅ Reset token columns added successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error adding reset token columns:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { addResetTokenColumns };

// Run migration if called directly
if (require.main === module) {
  addResetTokenColumns()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}