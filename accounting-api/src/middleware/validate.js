// src/middleware/validate.js
const { validationResult } = require('express-validator');

/**
 * Validation middleware
 * Checks for validation errors from express-validator
 * Returns 400 with detailed error messages if validation fails
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
        location: err.location
      }))
    });
  }
  
  next();
};

/**
 * Custom validator: Check if value is a valid decimal/money amount
 */
const isValidMoney = (value) => {
  if (typeof value !== 'number') return false;
  if (isNaN(value)) return false;
  if (value < 0) return false;
  
  // Check decimal places (max 2 for money)
  const decimalPlaces = (value.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
};

/**
 * Custom validator: Check if date is not in the future
 */
const isNotFutureDate = (value) => {
  const inputDate = new Date(value);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  return inputDate <= today;
};

/**
 * Custom validator: Check if date is not too far in the past
 */
const isRecentDate = (value, yearsBack = 5) => {
  const inputDate = new Date(value);
  const cutoffDate = new Date();
  cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsBack);
  
  return inputDate >= cutoffDate;
};

/**
 * Custom validator: Check if due date is after issue date
 */
const isDueDateValid = (dueDate, { req }) => {
  if (!req.body.issueDate) return true; // Skip if no issue date
  
  const issue = new Date(req.body.issueDate);
  const due = new Date(dueDate);
  
  return due >= issue;
};

/**
 * Custom validator: Validate phone number (basic)
 */
const isValidPhone = (value) => {
  if (!value) return true; // Optional field
  
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits)
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Custom validator: Validate UUID v4
 */
const isUUIDv4 = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * Sanitizer: Clean and format money values
 */
const sanitizeMoney = (value) => {
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    value = value.replace(/[$,]/g, '');
    value = parseFloat(value);
  }
  
  // Round to 2 decimal places
  return Math.round(value * 100) / 100;
};

/**
 * Sanitizer: Clean and format phone numbers
 */
const sanitizePhone = (value) => {
  if (!value) return null;
  
  // Remove all non-numeric characters except +
  return value.replace(/[^\d+]/g, '');
};

/**
 * Validator: Check if line items total matches
 */
const validateLineItemsTotal = (lineItems, { req }) => {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new Error('Line items must be a non-empty array');
  }
  
  // Calculate total
  const calculatedTotal = lineItems.reduce((sum, item) => {
    const amount = item.quantity * item.unitPrice;
    const discount = amount * ((item.discountPercent || 0) / 100);
    return sum + (amount - discount);
  }, 0);
  
  // Allow small floating point differences
  if (req.body.subtotal && Math.abs(calculatedTotal - req.body.subtotal) > 0.01) {
    throw new Error(`Line items total (${calculatedTotal}) does not match subtotal (${req.body.subtotal})`);
  }
  
  return true;
};

/**
 * Validator: Check if journal entry balances (debits = credits)
 */
const validateJournalBalance = (lines) => {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new Error('Journal entry must have at least 2 lines');
  }
  
  const totalDebits = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  
  // Allow small floating point differences
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(`Journal entry must balance. Debits: ${totalDebits}, Credits: ${totalCredits}`);
  }
  
  // Check that each line has either debit or credit, not both
  for (const line of lines) {
    const hasDebit = line.debit && parseFloat(line.debit) > 0;
    const hasCredit = line.credit && parseFloat(line.credit) > 0;
    
    if (hasDebit && hasCredit) {
      throw new Error('Each line must have either debit OR credit, not both');
    }
    
    if (!hasDebit && !hasCredit) {
      throw new Error('Each line must have either a debit or credit amount');
    }
  }
  
  return true;
};

/**
 * Validator: Check if payment amount doesn't exceed invoice total
 */
const validatePaymentAmount = async (invoicesApplied, { req }) => {
  if (!Array.isArray(invoicesApplied) || invoicesApplied.length === 0) {
    return true; // No invoices to validate
  }
  
  const totalApplied = invoicesApplied.reduce((sum, app) => sum + parseFloat(app.amount), 0);
  
  if (totalApplied > parseFloat(req.body.amount)) {
    throw new Error(`Total amount applied to invoices (${totalApplied}) exceeds payment amount (${req.body.amount})`);
  }
  
  return true;
};

/**
 * Validator: Validate email format (more strict than built-in)
 */
const isStrictEmail = (value) => {
  if (!value) return true; // Optional
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(value);
};

/**
 * Validator: Check password strength
 */
const isStrongPassword = (value) => {
  if (!value) return false;
  
  // At least 8 characters
  if (value.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  // At least one uppercase letter
  if (!/[A-Z]/.test(value)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  
  // At least one lowercase letter
  if (!/[a-z]/.test(value)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  
  // At least one number
  if (!/\d/.test(value)) {
    throw new Error('Password must contain at least one number');
  }
  
  // At least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
    throw new Error('Password must contain at least one special character');
  }
  
  return true;
};

/**
 * Sanitizer: Normalize account number (remove spaces and special chars)
 */
const sanitizeAccountNumber = (value) => {
  if (!value) return null;
  return value.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
};

/**
 * Validator: Check if fiscal year dates are valid
 */
const isValidFiscalYear = (startMonth) => {
  return startMonth >= 1 && startMonth <= 12;
};

/**
 * Rate limiter for validation-heavy endpoints
 */
const rateLimitByValidation = (maxAttempts = 5, windowMs = 60000) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old entries
    for (const [ip, data] of attempts.entries()) {
      if (now - data.timestamp > windowMs) {
        attempts.delete(ip);
      }
    }
    
    // Check attempts
    const userAttempts = attempts.get(key);
    if (userAttempts && userAttempts.count >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many validation errors. Please try again later.',
        retryAfter: Math.ceil((userAttempts.timestamp + windowMs - now) / 1000)
      });
    }
    
    // Track validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const current = attempts.get(key) || { count: 0, timestamp: now };
      current.count++;
      attempts.set(key, current);
    }
    
    next();
  };
};

module.exports = {
  validate,
  
  // Custom validators
  isValidMoney,
  isNotFutureDate,
  isRecentDate,
  isDueDateValid,
  isValidPhone,
  isUUIDv4,
  isStrictEmail,
  isStrongPassword,
  isValidFiscalYear,
  validateLineItemsTotal,
  validateJournalBalance,
  validatePaymentAmount,
  
  // Sanitizers
  sanitizeMoney,
  sanitizePhone,
  sanitizeAccountNumber,
  
  // Utilities
  rateLimitByValidation
};