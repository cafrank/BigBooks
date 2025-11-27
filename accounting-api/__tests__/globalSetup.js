// --- __tests__/globalSetup.js (optional - runs once before all tests) ---
/*
module.exports = async () => {
  console.log('\n🚀 Global test setup starting...\n');
  
  // Set environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  
  // You can add database creation here if needed
  // const { execSync } = require('child_process');
  // execSync('createdb accounting_test', { stdio: 'ignore' });
  
  console.log('✓ Global test setup completed\n');
};
*/

// --- __tests__/globalTeardown.js (optional - runs once after all tests) ---
/*
module.exports = async () => {
  console.log('\n🧹 Global test teardown starting...\n');
  
  // Clean up resources
  // const { execSync } = require('child_process');
  // execSync('dropdb accounting_test', { stdio: 'ignore' });
  
  console.log('✓ Global test teardown completed\n');
};
*/
