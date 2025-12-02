/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.table('bill_payments', (table) => {
    table.string('payment_number', 50);
  });

  // Add unique constraint on payment_number per organization
  await knex.schema.raw('ALTER TABLE bill_payments ADD CONSTRAINT bill_payments_payment_number_unique UNIQUE (organization_id, payment_number)');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('bill_payments', (table) => {
    table.dropColumn('payment_number');
  });
};
