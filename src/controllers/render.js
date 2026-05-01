const { sendHtml } = require('../core/http');
const settingsModel = require('../models/settingsModel');
const { page } = require('../views/layout');

function flashFromQuery(req) {
  if (req.query?.error) {
    return { type: 'error', message: req.query.error };
  }

  if (req.query?.success) {
    return { type: 'success', message: req.query.success };
  }

  return null;
}

async function renderApp(req, res, { title, active, body, statusCode = 200 }) {
  
  const settings = req.currentUser
    ? await settingsModel.getSettings(req.currentUser.dorm_id)
    : await settingsModel.getSettings();

  sendHtml(
    res,
    page({
      active,
      body,
      flash: flashFromQuery(req),
      settings,
      title,
      user: req.currentUser
    }),
    statusCode
  );
}

function redirectWithMessage(res, path, type, message) {
  const separator = path.includes('?') ? '&' : '?';
  const key = type === 'error' ? 'error' : 'success';
  res.writeHead(303, {
    Location: `${path}${separator}${key}=${encodeURIComponent(message)}`,
    'Cache-Control': 'no-store'
  });
  res.end();
}

module.exports = {
  redirectWithMessage,
  renderApp
};