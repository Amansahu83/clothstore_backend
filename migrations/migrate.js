const { createTables } = require('./001_create_tables');

const runMigrations = async () => {
  console.log('🚀 Running migrations...');
  
  try {
    await createTables();
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

runMigrations();