
// --- src/utils/pagination.js ---
const paginate = async (query, { limit = 25, offset = 0 }) => {
  limit = Math.min(parseInt(limit) || 25, 100);
  offset = parseInt(offset) || 0;

  // Clone the query for counting - clear select and use count distinct on the main table
  const countQuery = query.clone().clearSelect().clearOrder();

  // Get the first table name from the query (assumes it's the main table)
  const fromTable = countQuery._single && countQuery._single.table ? countQuery._single.table : null;

  let count;
  if (fromTable) {
    // Count distinct IDs from the main table to avoid JOIN duplication
    const result = await countQuery.countDistinct(`${fromTable}.id as count`);
    count = result[0].count;
  } else {
    // Fallback to simple count
    const result = await countQuery.count();
    count = result[0].count;
  }

  const data = await query.limit(limit).offset(offset);

  return {
    data,
    pagination: {
      total: parseInt(count),
      limit,
      offset,
      hasMore: offset + data.length < parseInt(count)
    }
  };
};

module.exports = { paginate };
