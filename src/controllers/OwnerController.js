const fs = require('node:fs');
const path = require('node:path');
const { UPLOAD_DIR } = require('../core/database');
const activityModel = require('../models/activityModel');
const billModel = require('../models/billModel');
const chargeModel = require('../models/chargeModel');
const roomModel = require('../models/roomModel');
const settingsModel = require('../models/settingsModel');
const userModel = require('../models/userModel');
const { hashSecret } = require('../utils/security');
const {
  addError,
  asText,
  hasErrors,
  optionalText,
  parseMoney,
  parseMonth,
  parseNumber,
  requiredText,
  validatePassword
} = require('../utils/validation');
const {
  billsView,
  chargesView,
  ownerDashboardView,
  roomsView,
  settingsView
} = require('../views/ownerViews');
const { todayMonth } = require('../views/helpers');
const { redirectWithMessage, renderApp } = require('./render');

const ROOM_STATUSES = new Set(['vacant', 'occupied', 'maintenance']);
const BILL_STATUSES = new Set(['unpaid', 'paid']);
const IMAGE_TYPES = {
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

function uniqueError(error) {
  return error?.code === '23505' || String(error?.message ?? '').includes('duplicate key');
}

async function ownerDashboard(req, res) {
  const dormId = req.currentUser.dorm_id;
  const currentMonth = todayMonth();
  
  // เรียกข้อมูลหลายๆ อย่างพร้อมกันเพื่อให้หน้าเว็บโหลดเร็วขึ้น
  const [activities, settings, stats, summary] = await Promise.all([
    activityModel.recentActivities(dormId, 8),
    settingsModel.getSettings(dormId),
    roomModel.dashboardStats(dormId),
    billModel.monthlySummary(dormId, currentMonth)
  ]);

  const body = ownerDashboardView({
    activities,
    currentMonth,
    settings,
    stats,
    summary
  });

  renderApp(req, res, { active: 'dashboard', body, title: 'ภาพรวมเจ้าของหอ' });
}

function validateRoomForm(body) {
  const errors = {};
  const roomNumber = requiredText(body, 'room_number', 'เลขห้อง', errors, { max: 30 });
  const floor = optionalText(body, 'floor', 30);
  const rentPrice = parseMoney(body, 'rent_price', 'ค่าเช่าห้อง', errors);
  const status = asText(body.status) || 'vacant';
  const note = optionalText(body, 'note', 1000);

  if (!ROOM_STATUSES.has(status)) {
    addError(errors, 'status', 'สถานะห้องไม่ถูกต้อง');
  }

  return {
    errors,
    values: { floor, note, rentPrice, roomNumber, status }
  };
}

async function showRooms(req, res, options = {}) {
  const dormId = req.currentUser.dorm_id;
  const search = req.query.search ?? '';
  const rooms = await roomModel.listRooms(dormId, search);

  const body = roomsView({
    errors: options.errors ?? {},
    form: options.form ?? {},
    rooms,
    search
  });

  renderApp(req, res, {
    active: 'rooms',
    body,
    statusCode: options.statusCode ?? 200,
    title: 'จัดการห้องพัก'
  });
}

async function createRoom(req, res) {
  const dormId = req.currentUser.dorm_id;
  const { errors, values } = validateRoomForm(req.body);
  if (hasErrors(errors)) {
    await showRooms(req, res, { errors, form: req.body, statusCode: 422 });
    return;
  }

  try {
    await roomModel.createRoom({ dormId, ...values });
    await activityModel.logActivity(dormId, req.currentUser.id, 'เพิ่มห้องพัก', `เพิ่มห้อง ${values.roomNumber}`);
    redirectWithMessage(res, '/owner/rooms', 'success', 'เพิ่มห้องพักแล้ว');
  } catch (error) {
    addError(errors, 'room_number', uniqueError(error) ? 'เลขห้องนี้มีอยู่แล้วในหอนี้' : 'ไม่สามารถเพิ่มห้องได้');
    await showRooms(req, res, { errors, form: req.body, statusCode: 422 });
  }
}

async function updateRoom(req, res) {
  const dormId = req.currentUser.dorm_id;
  const room = await roomModel.findById(req.params.id, dormId);
  if (!room) {
    redirectWithMessage(res, '/owner/rooms', 'error', 'ไม่พบห้องที่ต้องการแก้ไข');
    return;
  }

  const { errors, values } = validateRoomForm(req.body);
  if (hasErrors(errors)) {
    await showRooms(req, res, { errors, form: req.body, statusCode: 422 });
    return;
  }

  try {
    await roomModel.updateRoom(room.id, dormId, values);
    await activityModel.logActivity(dormId, req.currentUser.id, 'แก้ไขห้องพัก', `แก้ไขห้อง ${values.roomNumber}`);
    redirectWithMessage(res, '/owner/rooms', 'success', 'บันทึกข้อมูลห้องแล้ว');
  } catch (error) {
    addError(errors, 'room_number', uniqueError(error) ? 'เลขห้องนี้มีอยู่แล้วในหอนี้' : 'ไม่สามารถแก้ไขห้องได้');
    await showRooms(req, res, { errors, form: req.body, statusCode: 422 });
  }
}

async function deleteRoom(req, res) {
  const dormId = req.currentUser.dorm_id;
  const room = await roomModel.findById(req.params.id, dormId);
  if (!room) {
    redirectWithMessage(res, '/owner/rooms', 'error', 'ไม่พบห้องที่ต้องการลบ');
    return;
  }

  await roomModel.deleteRoom(room.id, dormId);
  await activityModel.logActivity(dormId, req.currentUser.id, 'ลบห้องพัก', `ลบห้อง ${room.room_number}`);
  redirectWithMessage(res, '/owner/rooms', 'success', 'ลบห้องพักแล้ว');
}

function validateChargeForm(body) {
  const errors = {};
  const name = requiredText(body, 'name', 'ชื่อค่าใช้จ่าย', errors, { max: 120 });
  const amount = parseMoney(body, 'amount', 'ราคา', errors);
  const isActive = asText(body.is_active) === '1';

  return { errors, values: { amount, isActive, name } };
}

async function showCharges(req, res, options = {}) {
  const dormId = req.currentUser.dorm_id;
  const charges = await chargeModel.listCharges(dormId);

  const body = chargesView({
    charges,
    errors: options.errors ?? {},
    form: options.form ?? {}
  });

  renderApp(req, res, {
    active: 'charges',
    body,
    statusCode: options.statusCode ?? 200,
    title: 'ค่าใช้จ่ายอื่น'
  });
}

async function createCharge(req, res) {
  const dormId = req.currentUser.dorm_id;
  const { errors, values } = validateChargeForm(req.body);
  if (hasErrors(errors)) {
    await showCharges(req, res, { errors, form: req.body, statusCode: 422 });
    return;
  }

  try {
    await chargeModel.createCharge({ dormId, ...values });
    await activityModel.logActivity(dormId, req.currentUser.id, 'เพิ่มค่าใช้จ่าย', `เพิ่ม ${values.name}`);
    redirectWithMessage(res, '/owner/charges', 'success', 'เพิ่มค่าใช้จ่ายแล้ว');
  } catch (error) {
    addError(errors, 'name', uniqueError(error) ? 'ชื่อค่าใช้จ่ายนี้มีอยู่แล้วในหอนี้' : 'ไม่สามารถเพิ่มค่าใช้จ่ายได้');
    await showCharges(req, res, { errors, form: req.body, statusCode: 422 });
  }
}

async function updateCharge(req, res) {
  const dormId = req.currentUser.dorm_id;
  const charge = await chargeModel.findById(req.params.id, dormId);
  if (!charge) {
    redirectWithMessage(res, '/owner/charges', 'error', 'ไม่พบค่าใช้จ่ายที่ต้องการแก้ไข');
    return;
  }

  const { errors, values } = validateChargeForm(req.body);
  if (hasErrors(errors)) {
    await showCharges(req, res, { errors, form: req.body, statusCode: 422 });
    return;
  }

  try {
    await chargeModel.updateCharge(charge.id, dormId, values);
    await activityModel.logActivity(dormId, req.currentUser.id, 'แก้ไขค่าใช้จ่าย', `แก้ไข ${values.name}`);
    redirectWithMessage(res, '/owner/charges', 'success', 'บันทึกค่าใช้จ่ายแล้ว');
  } catch (error) {
    addError(errors, 'name', uniqueError(error) ? 'ชื่อค่าใช้จ่ายนี้มีอยู่แล้วในหอนี้' : 'ไม่สามารถแก้ไขค่าใช้จ่ายได้');
    await showCharges(req, res, { errors, form: req.body, statusCode: 422 });
  }
}

async function deleteCharge(req, res) {
  const dormId = req.currentUser.dorm_id;
  const charge = await chargeModel.findById(req.params.id, dormId);
  if (!charge) {
    redirectWithMessage(res, '/owner/charges', 'error', 'ไม่พบค่าใช้จ่ายที่ต้องการลบ');
    return;
  }

  await chargeModel.deleteCharge(charge.id, dormId);
  await activityModel.logActivity(dormId, req.currentUser.id, 'ลบค่าใช้จ่าย', `ลบ ${charge.name}`);
  redirectWithMessage(res, '/owner/charges', 'success', 'ลบค่าใช้จ่ายแล้ว');
}

function validateBillForm(body) {
  const errors = {};
  const billingMonth = parseMonth(body, 'billing_month', 'เดือน/ปี', errors);
  const roomId = Number.parseInt(asText(body.room_id), 10);
  const electricUnits = parseNumber(body, 'electric_units', 'หน่วยไฟ', errors, { min: 0, max: 100000 });
  const waterUnits = parseNumber(body, 'water_units', 'หน่วยน้ำ', errors, { min: 0, max: 100000 });
  const paidStatus = asText(body.paid_status) || 'unpaid';
  const note = optionalText(body, 'note', 1000);

  if (!Number.isInteger(roomId) || roomId <= 0) {
    addError(errors, 'room_id', 'กรุณาเลือกห้อง');
  }

  if (!BILL_STATUSES.has(paidStatus)) {
    addError(errors, 'paid_status', 'สถานะชำระเงินไม่ถูกต้อง');
  }

  return {
    errors,
    values: {
      billingMonth,
      electricUnits,
      note,
      paidStatus,
      roomId,
      waterUnits
    }
  };
}

async function showBills(req, res, options = {}) {
  const dormId = req.currentUser.dorm_id;
  const filters = {
    month: req.query.month ?? '',
    search: req.query.search ?? '',
    status: BILL_STATUSES.has(req.query.status) ? req.query.status : ''
  };
  const summaryMonth = filters.month || todayMonth();

  const [bills, months, rooms, settings, summary] = await Promise.all([
    billModel.listBills(dormId, filters),
    billModel.listMonths(dormId),
    roomModel.listRoomsForSelect(dormId),
    settingsModel.getSettings(dormId),
    billModel.monthlySummary(dormId, summaryMonth)
  ]);

  const body = billsView({
    bills,
    editingBill: options.editingBill ?? null,
    errors: options.errors ?? {},
    filters,
    form: options.form ?? {},
    months,
    rooms,
    settings,
    summary
  });

  renderApp(req, res, {
    active: 'bills',
    body,
    statusCode: options.statusCode ?? 200,
    title: 'จัดการบิลรายเดือน'
  });
}

async function editBill(req, res) {
  const dormId = req.currentUser.dorm_id;
  const bill = await billModel.findById(req.params.id, dormId);
  if (!bill) {
    redirectWithMessage(res, '/owner/bills', 'error', 'ไม่พบบิลที่ต้องการแก้ไข');
    return;
  }

  await showBills(req, res, { editingBill: bill });
}

async function createBill(req, res) {
  const dormId = req.currentUser.dorm_id;
  const { errors, values } = validateBillForm(req.body);
  if (hasErrors(errors)) {
    await showBills(req, res, { errors, form: req.body, statusCode: 422 });
    return;
  }

  try {
    await billModel.upsertBill({ ...values, createdBy: req.currentUser.id, dormId });
    await activityModel.logActivity(dormId, req.currentUser.id, 'บันทึกบิล', `บันทึกบิลเดือน ${values.billingMonth}`);
    redirectWithMessage(res, '/owner/bills', 'success', 'บันทึกบิลรายเดือนแล้ว');
  } catch (error) {
    addError(errors, 'billing_month', uniqueError(error) ? 'ห้องนี้มีบิลของเดือนนี้แล้ว' : error.message);
    await showBills(req, res, { errors, form: req.body, statusCode: 422 });
  }
}

async function updateBill(req, res) {
  const dormId = req.currentUser.dorm_id;
  const bill = await billModel.findById(req.params.id, dormId);
  if (!bill) {
    redirectWithMessage(res, '/owner/bills', 'error', 'ไม่พบบิลที่ต้องการแก้ไข');
    return;
  }

  const { errors, values } = validateBillForm(req.body);
  if (hasErrors(errors)) {
    await showBills(req, res, { editingBill: bill, errors, form: req.body, statusCode: 422 });
    return;
  }

  try {
    await billModel.updateBill(bill.id, { ...values, createdBy: req.currentUser.id, dormId });
    await activityModel.logActivity(dormId, req.currentUser.id, 'แก้ไขบิล', `แก้ไขบิลเดือน ${values.billingMonth}`);
    redirectWithMessage(res, '/owner/bills', 'success', 'บันทึกการแก้ไขบิลแล้ว');
  } catch (error) {
    addError(errors, 'billing_month', uniqueError(error) ? 'ห้องนี้มีบิลของเดือนนี้แล้ว' : error.message);
    await showBills(req, res, { editingBill: bill, errors, form: req.body, statusCode: 422 });
  }
}

async function deleteBill(req, res) {
  const dormId = req.currentUser.dorm_id;
  const bill = await billModel.findById(req.params.id, dormId);
  if (!bill) {
    redirectWithMessage(res, '/owner/bills', 'error', 'ไม่พบบิลที่ต้องการลบ');
    return;
  }

  await billModel.deleteBill(bill.id, dormId);
  await activityModel.logActivity(dormId, req.currentUser.id, 'ลบบิล', `ลบบิลห้อง ${bill.room_number} เดือน ${bill.billing_month}`);
  redirectWithMessage(res, '/owner/bills', 'success', 'ลบบิลแล้ว');
}

async function updateBillStatus(req, res) {
  const dormId = req.currentUser.dorm_id;
  const bill = await billModel.findById(req.params.id, dormId);
  const paidStatus = asText(req.body.paid_status);

  if (!bill || !BILL_STATUSES.has(paidStatus)) {
    redirectWithMessage(res, '/owner/bills', 'error', 'ไม่สามารถเปลี่ยนสถานะบิลได้');
    return;
  }

  await billModel.updateStatus(bill.id, dormId, paidStatus);
  await activityModel.logActivity(dormId, req.currentUser.id, 'เปลี่ยนสถานะบิล', `ห้อง ${bill.room_number} เป็น ${paidStatus}`);
  redirectWithMessage(res, '/owner/bills', 'success', 'เปลี่ยนสถานะบิลแล้ว');
}

async function showSettings(req, res, options = {}) {
  const dormId = req.currentUser.dorm_id;
  const settings = await settingsModel.getSettings(dormId);

  const body = settingsView({
    errors: options.errors ?? {},
    form: options.form ?? {},
    settings
  });

  renderApp(req, res, {
    active: 'settings',
    body,
    statusCode: options.statusCode ?? 200,
    title: 'ตั้งค่าหอพัก'
  });
}

function persistBrandImage(file, dormId) {
  if (!file || !file.filename || file.size === 0) {
    return '';
  }

  if (!IMAGE_TYPES[file.contentType]) {
    throw new Error('รองรับเฉพาะไฟล์รูปภาพ PNG, JPG, WEBP หรือ GIF');
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error('รูปภาพต้องมีขนาดไม่เกิน 2MB');
  }

  const extension = IMAGE_TYPES[file.contentType] || path.extname(file.filename).toLowerCase() || '.png';
  const filename = `dorm-${dormId}-${Date.now()}${extension}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.data);
  return `/uploads/${filename}`;
}

async function updateSettings(req, res) {
  const dormId = req.currentUser.dorm_id;
  const currentSettings = await settingsModel.getSettings(dormId);
  const errors = {};
  const dormName = requiredText(req.body, 'dorm_name', 'ชื่อหอพัก', errors, { max: 120 });
  const electricityRate = parseMoney(req.body, 'electricity_rate', 'ราคาค่าไฟต่อหน่วย', errors);
  const electricityMeterRate = parseMoney(req.body, 'electricity_meter_rate', 'ค่ามิเตอร์ไฟต่อหน่วย', errors);
  const electricityMinFee = parseMoney(req.body, 'electricity_min_fee', 'ค่าไฟขั้นต่ำ', errors);
  const waterRate = parseMoney(req.body, 'water_rate', 'ราคาค่าน้ำต่อหน่วย', errors);
  const waterMeterRate = parseMoney(req.body, 'water_meter_rate', 'ค่ามิเตอร์น้ำต่อหน่วย', errors);
  const waterMinFee = parseMoney(req.body, 'water_min_fee', 'ค่าน้ำขั้นต่ำ', errors);
  const contactDetails = optionalText(req.body, 'contact_details', 2000);
  const paymentDetails = optionalText(req.body, 'payment_details', 2000);
  const newOwnerPassword = asText(req.body.new_owner_password);
  const tenantJoinCode = asText(req.body.tenant_join_code);

  if (newOwnerPassword) {
    validatePassword(newOwnerPassword, 'new_owner_password', 'รหัสผ่านเจ้าของหอใหม่', errors);
  }

  if (tenantJoinCode) {
    validatePassword(tenantJoinCode, 'tenant_join_code', 'รหัสลงทะเบียนลูกหอใหม่', errors, 4);
  }

  let brandImagePath = currentSettings.brand_image_path || '';
  if (req.files?.brand_image?.size) {
    try {
      brandImagePath = persistBrandImage(req.files.brand_image, dormId);
    } catch (error) {
      addError(errors, 'brand_image', error.message);
    }
  }

  if (hasErrors(errors)) {
    await showSettings(req, res, {
      errors,
      form: {
        ...req.body,
        brand_image_path: brandImagePath || currentSettings.brand_image_path
      },
      statusCode: 422
    });
    return;
  }

  await settingsModel.updateSettings(dormId, {
    brand_image_path: brandImagePath,
    contact_details: contactDetails,
    dorm_name: dormName,
    electricity_meter_rate: electricityMeterRate,
    electricity_min_fee: electricityMinFee,
    electricity_rate: electricityRate,
    payment_details: paymentDetails,
    water_meter_rate: waterMeterRate,
    water_min_fee: waterMinFee,
    water_rate: waterRate
  });

  if (newOwnerPassword) {
    await userModel.updatePassword(req.currentUser.id, hashSecret(newOwnerPassword));
  }

  if (tenantJoinCode) {
    await settingsModel.setTenantJoinCode(dormId, tenantJoinCode);
  }

  await activityModel.logActivity(dormId, req.currentUser.id, 'แก้ไขตั้งค่า', 'บันทึกข้อมูลหอพัก ราคา และรูปโปรไฟล์');
  redirectWithMessage(res, '/owner/settings', 'success', 'บันทึกการตั้งค่าแล้ว');
}

module.exports = {
  createBill,
  createCharge,
  createRoom,
  deleteBill,
  deleteCharge,
  deleteRoom,
  editBill,
  ownerDashboard,
  showBills,
  showCharges,
  showRooms,
  showSettings,
  updateBill,
  updateBillStatus,
  updateCharge,
  updateRoom,
  updateSettings
};