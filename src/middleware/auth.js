const { redirect } = require('../core/http');

function dashboardFor(user) {
  return user?.role === 'owner' ? '/owner/dashboard' : '/tenant/dashboard';
}

async function requireAuth(req, res, next) {
  if (!req.currentUser) {
    redirect(res, '/login?error=' + encodeURIComponent('กรุณาเข้าสู่ระบบก่อน'));
    return;
  }

  await next();
}

function requireRole(role) {
  return async (req, res, next) => {
    if (!req.currentUser) {
      redirect(res, '/login?error=' + encodeURIComponent('กรุณาเข้าสู่ระบบก่อน'));
      return;
    }

    if (req.currentUser.role !== role) {
      redirect(res, dashboardFor(req.currentUser));
      return;
    }

    await next();
  };
}

module.exports = {
  dashboardFor,
  requireAuth,
  requireRole
};
