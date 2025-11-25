// --- src/middleware/auth.js ---
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await db('users')
      .join('organization_users', 'users.id', 'organization_users.user_id')
      .where('users.id', decoded.userId)
      .where('organization_users.organization_id', decoded.orgId)
      .first();

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = { id: decoded.userId, orgId: decoded.orgId, role: user.role };
    
    // Set org context for RLS
    await db.raw(`SET app.current_org_id = '${decoded.orgId}'`);
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticate };
