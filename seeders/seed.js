const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if data already exists
    const userCheck = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count) > 0) {
      console.log('⚠️  Data already exists, skipping seed');
      return;
    }
    
    // Seed admin user
    const hashedPassword = await bcrypt.hash('password', 10);
    await client.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('Admin', 'admin@clothstore.com', $1, 'admin')
    `, [hashedPassword]);
    
    // Seed sample user
    const userPassword = await bcrypt.hash('user123', 10);
    await client.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('John Doe', 'user@clothstore.com', $1, 'user')
    `, [userPassword]);
    
    // Seed sample products
    const products = [
      ['Cotton T-Shirt', 'Comfortable cotton t-shirt for everyday wear', 19.99, 'T-Shirts', 'M', 'Blue', 50],
      ['Denim Jeans', 'Classic blue denim jeans with perfect fit', 49.99, 'Jeans', 'L', 'Blue', 30],
      ['Summer Dress', 'Light and breezy summer dress', 39.99, 'Dresses', 'S', 'Yellow', 25],
      ['Polo Shirt', 'Premium polo shirt for casual occasions', 29.99, 'Shirts', 'M', 'White', 40],
      ['Leather Jacket', 'Stylish leather jacket for winter', 99.99, 'Jackets', 'L', 'Black', 15],
      ['Casual Shorts', 'Comfortable shorts for summer', 24.99, 'Shorts', 'M', 'Khaki', 35],
      ['Formal Shirt', 'Professional formal shirt', 34.99, 'Shirts', 'L', 'White', 20],
      ['Maxi Dress', 'Elegant maxi dress for special occasions', 59.99, 'Dresses', 'M', 'Red', 18]
    ];
    
    for (const product of products) {
      await client.query(`
        INSERT INTO products (name, description, price, category, size, color, stock_quantity) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, product);
    }
    
    await client.query('COMMIT');
    console.log('✅ Sample data seeded successfully');
    console.log('👤 Admin: admin@clothstore.com / password');
    console.log('👤 User: user@clothstore.com / user123');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { seedData };

// Run seeder if called directly
if (require.main === module) {
  seedData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}