/**
 * Migration to update v_customer_balances view to include unapplied payments
 *
 * The updated view will:
 * 1. Calculate total amount due from open invoices
 * 2. Subtract any unapplied payment amounts (customer credits)
 * 3. Provide aging breakdown based on invoice due dates
 */

exports.up = async function(knex) {
  // Drop the existing view
  await knex.raw('DROP VIEW IF EXISTS v_customer_balances');

  // Recreate the view with unapplied payments consideration
  await knex.raw(`
    CREATE VIEW v_customer_balances AS
    WITH invoice_balances AS (
      SELECT
        c.id as customer_id,
        c.organization_id,
        c.display_name,
        COALESCE(SUM(i.amount_due), 0) AS total_invoice_balance,
        COALESCE(SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.amount_due ELSE 0 END), 0) AS current,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - 30 THEN i.amount_due ELSE 0 END), 0) AS days_1_30,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 30 AND i.due_date >= CURRENT_DATE - 60 THEN i.amount_due ELSE 0 END), 0) AS days_31_60,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 60 AND i.due_date >= CURRENT_DATE - 90 THEN i.amount_due ELSE 0 END), 0) AS days_61_90,
        COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 90 THEN i.amount_due ELSE 0 END), 0) AS days_90_plus
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id AND i.status NOT IN ('draft', 'voided', 'paid')
      GROUP BY c.id, c.organization_id, c.display_name
    ),
    unapplied_payments AS (
      SELECT
        p.customer_id,
        COALESCE(SUM(p.amount - COALESCE(pa.applied_amount, 0)), 0) AS unapplied_amount
      FROM payments p
      LEFT JOIN (
        SELECT payment_id, SUM(amount) AS applied_amount
        FROM payment_applications
        GROUP BY payment_id
      ) pa ON p.id = pa.payment_id
      WHERE p.is_voided = FALSE
      GROUP BY p.customer_id
    )
    SELECT
      ib.customer_id AS id,
      ib.organization_id,
      ib.display_name,
      GREATEST(ib.total_invoice_balance - COALESCE(up.unapplied_amount, 0), 0) AS total_balance,
      GREATEST(ib.current - COALESCE(up.unapplied_amount, 0), 0) AS current,
      ib.days_1_30,
      ib.days_31_60,
      ib.days_61_90,
      ib.days_90_plus
    FROM invoice_balances ib
    LEFT JOIN unapplied_payments up ON ib.customer_id = up.customer_id;
  `);
};

exports.down = async function(knex) {
  // Revert to the original view without unapplied payments
  await knex.raw('DROP VIEW IF EXISTS v_customer_balances');

  await knex.raw(`
    CREATE VIEW v_customer_balances AS
    SELECT
      c.id,
      c.organization_id,
      c.display_name,
      COALESCE(SUM(i.amount_due), 0) AS total_balance,
      COALESCE(SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.amount_due ELSE 0 END), 0) AS current,
      COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - 30 THEN i.amount_due ELSE 0 END), 0) AS days_1_30,
      COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 30 AND i.due_date >= CURRENT_DATE - 60 THEN i.amount_due ELSE 0 END), 0) AS days_31_60,
      COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 60 AND i.due_date >= CURRENT_DATE - 90 THEN i.amount_due ELSE 0 END), 0) AS days_61_90,
      COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 90 THEN i.amount_due ELSE 0 END), 0) AS days_90_plus
    FROM customers c
    LEFT JOIN invoices i ON c.id = i.customer_id AND i.status NOT IN ('draft', 'voided', 'paid')
    GROUP BY c.id, c.organization_id, c.display_name;
  `);
};
