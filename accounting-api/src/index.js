// --- src/index.js (COMPLETE VERSION) ---
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const customerRoutes = require('./routes/customers');
const vendorRoutes = require('./routes/vendors');
const invoiceRoutes = require('./routes/invoices');
const paymentRoutes = require('./routes/payments');
const expenseRoutes = require('./routes/expenses');
const billRoutes = require('./routes/bills');
const vendorPaymentRoutes = require('./routes/vendorPayments');
const productRoutes = require('./routes/products');
const journalRoutes = require('./routes/journalEntries');
const reportRoutes = require('./routes/reports');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Accounting API Documentation'
}));

// Health check endpoint (should work without auth)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Accounting API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

// API Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/accounts', accountRoutes);
app.use('/v1/customers', customerRoutes);
app.use('/v1/vendors', vendorRoutes);
app.use('/v1/invoices', invoiceRoutes);
app.use('/v1/payments', paymentRoutes);
app.use('/v1/expenses', expenseRoutes);
app.use('/v1/bills', billRoutes);
app.use('/v1/vendor-payments', vendorPaymentRoutes);
app.use('/v1/products', productRoutes);
app.use('/v1/journal-entries', journalRoutes);
app.use('/v1/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

// Error handling (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log('🚀 Accounting API Server Started');
    console.log('========================================');
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Port: ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log('========================================');
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      console.error('Try these solutions:');
      console.error('1. Kill the process: lsof -ti:3000 | xargs kill -9');
      console.error('2. Use a different port: PORT=3001 npm start');
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

module.exports = app;
