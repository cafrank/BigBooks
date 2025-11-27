// --- src/utils/documentNumber.js ---
const db = require('../config/database');

const generateDocNumber = async (orgId, docType) => {
  const result = await db.raw(`SELECT generate_document_number(?, ?) as doc_number`, [orgId, docType]);
  return result.rows[0].doc_number;
};

module.exports = { generateDocNumber };
