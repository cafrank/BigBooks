// ============================================
// JEST TRANSFORM ISSUE - COMPLETE FIX
// ============================================

// --- jest.config.js (UPDATED - Use this version) ---
module.exports = {
  // Test environment
  // testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!**/node_modules/**',
    '!**/__tests__/**'
  ],
  
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/'
  ],
  
  // CRITICAL: Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { 
      configFile: './babel.config.js'
    }]
  },
  
  // CRITICAL: Don't ignore node_modules for certain packages
  transformIgnorePatterns: [
    'node_modules/(?!(supertest|express-validator)/)'
  ],
  
  // Module resolution
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  
  // Timeouts
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit (use cautiously)
  forceExit: false,
  
  // Module name mapper (if needed for aliases)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
