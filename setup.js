const { createTables } = require('./migrations/001_create_tables');
const { seedData } = require('./seeders/seed');

const setupDatabase = async () => {
  console.log('🚀 Setting up database...');
  
  try {
    // Run migrations
    console.log('📋 Creating tables...');
    await createTables();
    
    // Run seeders
    console.log('🌱 Seeding data...');
    await seedData();
    
    console.log('✅ Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

setupDatabase();