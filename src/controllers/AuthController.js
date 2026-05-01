const { clearCookie, redirect, sendHtml, setCookie } = require('../core/http');
const activityModel = require('../models/activityModel');
const roomModel = require('../models/roomModel');
const sessionModel = require('../models/sessionModel');
const settingsModel = require('../models/settingsModel');
const userModel = require('../models/userModel');
const { hashSecret, verifySecret } = require('../utils/security');
const {
  addError,
  asText,
  hasErrors,
  requiredText,
  validatePassword
} = require('../utils/validation');
const { loginView, registerView, setupView } = require('../views/authView');
const { dashboardFor } = require('../middleware/auth');

const SESSION_COOKIE = 'dorm_session';

function uniqueError(error) {
  return error?.code === '23505' || String(error?.message ?? '').includes('duplicate key');
}

async function authDormSettings(source) {
  const dormCode = settingsModel.normalizeDormCode(source?.dorm_code || source?.dormCode || '');
  if (dormCode) {
    const dorm = await settingsModel.findDormByCode(dormCode);
    if (dorm) return dorm;
  }
  return await settingsModel.getSettings();
}

function validateDormCode(dormCode, field, errors) {
  if (!dormCode) {
    addError(errors, field, 'กรุณากรอกรหัสหอ');
    return;
  }

  if (!/^[a-z0-9-]{3,30}$/.test(dormCode)) {
    addError(errors, field, 'รหัสหอต้องเป็น a-z, 0-9 หรือ - และยาว 3-30 ตัวอักษร');
  }
}

async function home(req, res) {
  if (req.currentUser) {
    redirect(res, dashboardFor(req.currentUser));
    return;
  }

  const hasDorm = await settingsModel.hasAnyDorm();
  redirect(res, hasDorm ? '/login' : '/setup');
}

async function showLogin(req, res) {
  if (req.currentUser) {
    redirect(res, dashboardFor(req.currentUser));
    return;
  }

  const form = {
    dorm_code: req.query.dorm_code || '',
    username: req.query.username || ''
  };

  const settings = await authDormSettings(form);

  sendHtml(res, loginView({
    errors: req.query.error ? { login: req.query.error } : {},
    form,
    message: req.query.success ?? '',
    settings
  }));
}

async function login(req, res) {
  const errors = {};
  const dormCode = settingsModel.normalizeDormCode(asText(req.body.dorm_code));
  const username = requiredText(req.body, 'username', 'ชื่อผู้ใช้', errors, { max: 60 });
  const password = asText(req.body.password);

  validateDormCode(dormCode, 'dorm_code', errors);

  if (!password) {
    addError(errors, 'password', 'กรุณากรอกรหัสผ่าน');
  }

  const dorm = !errors.dorm_code ? await settingsModel.findDormByCode(dormCode) : null;
  if (!hasErrors(errors) && !dorm) {
    addError(errors, 'dorm_code', 'ไม่พบรหัสหอนี้ในระบบ');
  }

  const user = dorm && username ? await userModel.findByUsername(dorm.id, username) : null;
  if (!hasErrors(errors) && (!user || !verifySecret(password, user.password_hash))) {
    addError(errors, 'password', 'รหัสหอ ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
  }

  if (hasErrors(errors)) {
    const settings = await authDormSettings({ dorm_code: dormCode });
    sendHtml(res, loginView({
      errors,
      form: { dorm_code: dormCode, username },
      settings
    }), 422);
    return;
  }

  const session = await sessionModel.createSession(user.id);
  setCookie(res, SESSION_COOKIE, session.token, { maxAge: session.maxAge });
  await activityModel.logActivity(user.dorm_id, user.id, 'เข้าสู่ระบบ', `${user.display_name} เข้าสู่ระบบ`);
  redirect(res, dashboardFor(user));
}

async function logout(req, res) {
  if (req.cookies?.[SESSION_COOKIE]) {
    await sessionModel.destroySession(req.cookies[SESSION_COOKIE]);
  }
  clearCookie(res, SESSION_COOKIE);
  redirect(res, '/login?success=' + encodeURIComponent('ออกจากระบบแล้ว'));
}

async function showSetup(req, res) {
  if (req.currentUser) {
    redirect(res, dashboardFor(req.currentUser));
    return;
  }

  const settings = await settingsModel.getSettings();

  sendHtml(res, setupView({
    form: {
      dorm_code: '',
      owner_name: 'ผู้ดูแลหอพัก',
      owner_username: 'owner'
    },
    settings
  }));
}

async function setup(req, res) {
  if (req.currentUser) {
    redirect(res, dashboardFor(req.currentUser));
    return;
  }

  const errors = {};
  const dormName = requiredText(req.body, 'dorm_name', 'ชื่อหอพัก', errors, { max: 120 });
  const dormCode = settingsModel.normalizeDormCode(asText(req.body.dorm_code));
  const ownerUsername = requiredText(req.body, 'owner_username', 'ชื่อผู้ใช้เจ้าของหอ', errors, { min: 3, max: 60 });
  const ownerName = requiredText(req.body, 'owner_name', 'ชื่อแสดงผล', errors, { max: 120 });
  const ownerPassword = asText(req.body.owner_password);
  const tenantJoinCode = asText(req.body.tenant_join_code);

  validateDormCode(dormCode, 'dorm_code', errors);
  validatePassword(ownerPassword, 'owner_password', 'รหัสผ่านเจ้าของหอ', errors);
  validatePassword(tenantJoinCode, 'tenant_join_code', 'รหัสลงทะเบียนลูกหอ', errors, 4);

  if (hasErrors(errors)) {
    const settings = await settingsModel.getSettings();
    sendHtml(res, setupView({
      errors,
      form: { ...req.body, dorm_code: dormCode },
      settings
    }), 422);
    return;
  }

  try {
    const dormId = await settingsModel.createDorm({
      dormCode,
      dormName,
      tenantJoinCodeHash: hashSecret(tenantJoinCode)
    });
    const ownerId = await userModel.createUser({
      displayName: ownerName,
      dormId,
      passwordHash: hashSecret(ownerPassword),
      role: 'owner',
      username: ownerUsername
    });
    await activityModel.logActivity(dormId, ownerId, 'สร้างหอพักใหม่', `สร้างหอ ${dormName} (${dormCode})`);
  } catch (error) {
    if (uniqueError(error)) {
      if (String(error.message).includes('dorm_code') || String(error.details).includes('dorm_code')) {
        addError(errors, 'dorm_code', 'รหัสหอนี้ถูกใช้แล้ว');
      } else {
        addError(errors, 'owner_username', 'ชื่อผู้ใช้เจ้าของหอนี้ถูกใช้แล้วในหอนี้');
      }
    } else {
      addError(errors, 'dorm_name', 'ไม่สามารถสร้างหอพักใหม่ได้ กรุณาลองใหม่');
    }

    const settings = await settingsModel.getSettings();
    sendHtml(res, setupView({
      errors,
      form: { ...req.body, dorm_code: dormCode },
      settings
    }), 422);
    return;
  }

  redirect(
    res,
    `/login?success=${encodeURIComponent('สร้างหอพักใหม่สำเร็จแล้ว เข้าสู่ระบบได้ทันที')}&dorm_code=${encodeURIComponent(dormCode)}`
  );
}

async function showRegister(req, res) {
  const hasDorm = await settingsModel.hasAnyDorm();
  if (!hasDorm) {
    redirect(res, '/setup');
    return;
  }

  const form = { dorm_code: req.query.dorm_code || '' };
  const settings = await authDormSettings(form);

  sendHtml(res, registerView({
    form,
    message: req.query.success ?? '',
    settings
  }));
}

async function register(req, res) {
  const hasDorm = await settingsModel.hasAnyDorm();
  if (!hasDorm) {
    redirect(res, '/setup');
    return;
  }

  const errors = {};
  const dormCode = settingsModel.normalizeDormCode(asText(req.body.dorm_code));
  const roomNumber = requiredText(req.body, 'room_number', 'เลขห้อง', errors, { max: 30 });
  const displayName = requiredText(req.body, 'display_name', 'ชื่อ-นามสกุล', errors, { max: 120 });
  const username = requiredText(req.body, 'username', 'ชื่อผู้ใช้', errors, { min: 3, max: 60 });
  const password = asText(req.body.password);
  const tenantJoinCode = asText(req.body.tenant_join_code);

  validateDormCode(dormCode, 'dorm_code', errors);
  validatePassword(password, 'password', 'รหัสผ่านส่วนตัว', errors);

  const dorm = !errors.dorm_code ? await settingsModel.findDormByCode(dormCode) : null;
  if (!hasErrors(errors) && !dorm) {
    addError(errors, 'dorm_code', 'ไม่พบรหัสหอนี้ในระบบ');
  }

  if (!hasErrors(errors) && (!tenantJoinCode || !(await settingsModel.verifyTenantJoinCode(dorm.id, tenantJoinCode)))) {
    addError(errors, 'tenant_join_code', 'รหัสลงทะเบียนลูกหอไม่ถูกต้อง');
  }

  const room = dorm && roomNumber ? await roomModel.findByRoomNumber(dorm.id, roomNumber) : null;
  const roomWithTenant = room ? await roomModel.findById(room.id, dorm.id) : null;

  if (dorm && !room) {
    addError(errors, 'room_number', 'ไม่พบเลขห้องนี้ในหอที่เลือก');
  } else if (room?.status === 'maintenance') {
    addError(errors, 'room_number', 'ห้องนี้อยู่ระหว่างซ่อมบำรุง');
  } else if (roomWithTenant?.tenant_id) {
    addError(errors, 'room_number', 'ห้องนี้มีบัญชีลูกหอแล้ว');
  }

  if (hasErrors(errors)) {
    const settings = await authDormSettings({ dorm_code: dormCode });
    sendHtml(res, registerView({
      errors,
      form: { ...req.body, dorm_code: dormCode },
      settings
    }), 422);
    return;
  }

  try {
    const userId = await userModel.createUser({
      displayName,
      dormId: dorm.id,
      passwordHash: hashSecret(password),
      role: 'tenant',
      roomId: room.id,
      username
    });

    await roomModel.updateRoom(room.id, dorm.id, {
      floor: room.floor,
      note: room.note,
      rentPrice: room.rent_price,
      roomNumber: room.room_number,
      status: 'occupied'
    });
    await activityModel.logActivity(dorm.id, userId, 'ลงทะเบียนลูกหอ', `${displayName} ลงทะเบียนห้อง ${room.room_number}`);
  } catch (error) {
    if (uniqueError(error)) {
      addError(errors, 'username', 'ชื่อผู้ใช้นี้ถูกใช้แล้วในหอนี้');
    } else {
      addError(errors, 'username', 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่');
    }

    const settings = await authDormSettings({ dorm_code: dormCode });
    sendHtml(res, registerView({
      errors,
      form: { ...req.body, dorm_code: dormCode },
      settings
    }), 422);
    return;
  }

  redirect(
    res,
    `/login?success=${encodeURIComponent('ลงทะเบียนสำเร็จ เข้าสู่ระบบด้วยบัญชีลูกหอได้เลย')}&dorm_code=${encodeURIComponent(dormCode)}`
  );
}

module.exports = {
  SESSION_COOKIE,
  home,
  login,
  logout,
  register,
  setup,
  showLogin,
  showRegister,
  showSetup
};