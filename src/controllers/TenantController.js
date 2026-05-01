const billModel = require('../models/billModel');
const roomModel = require('../models/roomModel');
const settingsModel = require('../models/settingsModel');
const { isValidMonth } = require('../utils/validation');
const { tenantBillsView, tenantDashboardView } = require('../views/tenantViews');
const { renderApp } = require('./render');

async function tenantDashboard(req, res) {
  const dormId = req.currentUser.dorm_id;
  
  const [bills, latestBill, room, settings] = await Promise.all([
    billModel.tenantBills(req.currentUser.id, dormId),
    billModel.latestTenantBill(req.currentUser.id, dormId),
    roomModel.getTenantRoom(req.currentUser.id, dormId),
    settingsModel.getSettings(dormId)
  ]);

  const body = tenantDashboardView({
    bills,
    latestBill,
    room,
    settings,
    user: req.currentUser
  });

  await renderApp(req, res, { active: 'dashboard', body, title: 'ภาพรวมลูกหอ' });
}

async function tenantBills(req, res) {
  const dormId = req.currentUser.dorm_id;
  const selectedMonth = isValidMonth(req.query.month) ? req.query.month : '';
  
  const [allBills, filteredBills] = await Promise.all([
    billModel.tenantBills(req.currentUser.id, dormId),
    billModel.tenantBills(req.currentUser.id, dormId, selectedMonth)
  ]);

  const body = tenantBillsView({
    bills: filteredBills,
    months: allBills,
    selectedMonth
  });

  
  await renderApp(req, res, { active: 'bills', body, title: 'ประวัติบิลของฉัน' });
}

module.exports = {
  tenantBills,
  tenantDashboard
};