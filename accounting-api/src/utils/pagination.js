
// --- src/utils/pagination.js ---
const paginate = async (query, { limit = 25, offset = 0 }) => {
  limit = Math.min(parseInt(limit) || 25, 100);
  offset = parseInt(offset) || 0;

  const [{ count }] = await query.clone().clearOrder().count();
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
