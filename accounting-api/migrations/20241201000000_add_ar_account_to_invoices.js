exports.up = function(knex) {
  return knex.schema.table('invoices', function(table) {
    table.uuid('ar_account_id').references('id').inTable('accounts').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.table('invoices', function(table) {
    table.dropColumn('ar_account_id');
  });
};
