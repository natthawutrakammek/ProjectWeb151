const {
  errorSummary,
  escapeHtml,
  fieldError,
  valueOf
} = require('./helpers');
const { authPage } = require('./layout');

function loginView({ settings, errors = {}, form = {}, message = '' }) {
  const body = `
    ${message ? `<div class="alert alert-success">${escapeHtml(message)}</div>` : ''}
    <p class="lead">กรอกรหัสหอ ชื่อผู้ใช้ และรหัสผ่าน เพื่อเข้าสู่ระบบของหอพักคุณ</p>
    ${errorSummary(errors)}
    <form method="post" action="/login" class="stack-form">
      <label>
        <span>รหัสหอ</span>
        <input name="dorm_code" value="${valueOf(form, 'dorm_code')}" placeholder="เช่น dormease" autocomplete="organization" required>
        ${fieldError(errors, 'dorm_code')}
      </label>
      <label>
        <span>ชื่อผู้ใช้</span>
        <input name="username" value="${valueOf(form, 'username')}" autocomplete="username" required>
        ${fieldError(errors, 'username')}
      </label>
      <label>
        <span>รหัสผ่าน</span>
        <input type="password" name="password" autocomplete="current-password" required>
        ${fieldError(errors, 'password')}
      </label>
      <button class="button primary" type="submit">เข้าสู่ระบบ</button>
    </form>
    <div class="auth-links">
      <a href="/setup">สร้างหอพักใหม่</a>
      <a href="/register">ลงทะเบียนลูกหอ</a>
    </div>
  `;

  return authPage({ title: 'เข้าสู่ระบบหอพักออนไลน์', body, settings });
}

function setupView({ settings, errors = {}, form = {} }) {
  const body = `
    <p class="lead">สร้างหอพักใหม่ พร้อมบัญชีเจ้าของหอและรหัสสำหรับให้ลูกหอลงทะเบียนแยกตามหอ</p>
    ${errorSummary(errors)}
    <form method="post" action="/setup" class="stack-form">
      <div class="form-grid">
        <label>
          <span>ชื่อหอพัก</span>
          <input name="dorm_name" value="${valueOf(form, 'dorm_name', settings?.dorm_name ?? '')}" required>
          ${fieldError(errors, 'dorm_name')}
        </label>
        <label>
          <span>รหัสหอ</span>
          <input name="dorm_code" value="${valueOf(form, 'dorm_code')}" placeholder="เช่น dormease" required>
          <small>ใช้สำหรับ login และ register ของหอนี้</small>
          ${fieldError(errors, 'dorm_code')}
        </label>
      </div>
      <div class="form-grid">
        <label>
          <span>ชื่อผู้ใช้เจ้าของหอ</span>
          <input name="owner_username" value="${valueOf(form, 'owner_username', 'owner')}" autocomplete="username" required>
          ${fieldError(errors, 'owner_username')}
        </label>
        <label>
          <span>ชื่อแสดงผล</span>
          <input name="owner_name" value="${valueOf(form, 'owner_name', 'ผู้ดูแลหอพัก')}" required>
          ${fieldError(errors, 'owner_name')}
        </label>
      </div>
      <label>
        <span>รหัสผ่านเจ้าของหอ</span>
        <input type="password" name="owner_password" autocomplete="new-password" required>
        ${fieldError(errors, 'owner_password')}
      </label>
      <label>
        <span>รหัสลงทะเบียนลูกหอ</span>
        <input type="password" name="tenant_join_code" autocomplete="new-password" required>
        ${fieldError(errors, 'tenant_join_code')}
      </label>
      <button class="button primary" type="submit">สร้างหอพักใหม่</button>
    </form>
    <div class="auth-links">
      <a href="/login">กลับไปหน้าเข้าสู่ระบบ</a>
    </div>
  `;

  return authPage({ title: 'สร้างหอพักใหม่', body, settings });
}

function registerView({ settings, errors = {}, form = {}, message = '' }) {
  const body = `
    ${message ? `<div class="alert alert-success">${escapeHtml(message)}</div>` : ''}
    <p class="lead">ใช้รหัสหอและรหัสลงทะเบียนของหอนั้น เพื่อให้บัญชีลูกหอไม่ปนกับหออื่น</p>
    ${errorSummary(errors)}
    <form method="post" action="/register" class="stack-form">
      <div class="form-grid">
        <label>
          <span>รหัสหอ</span>
          <input name="dorm_code" value="${valueOf(form, 'dorm_code')}" placeholder="เช่น dormease" required>
          ${fieldError(errors, 'dorm_code')}
        </label>
        <label>
          <span>เลขห้อง</span>
          <input name="room_number" value="${valueOf(form, 'room_number')}" required>
          ${fieldError(errors, 'room_number')}
        </label>
      </div>
      <label>
        <span>รหัสลงทะเบียนลูกหอ</span>
        <input type="password" name="tenant_join_code" required>
        ${fieldError(errors, 'tenant_join_code')}
      </label>
      <label>
        <span>ชื่อ-นามสกุล</span>
        <input name="display_name" value="${valueOf(form, 'display_name')}" required>
        ${fieldError(errors, 'display_name')}
      </label>
      <div class="form-grid">
        <label>
          <span>ชื่อผู้ใช้</span>
          <input name="username" value="${valueOf(form, 'username')}" autocomplete="username" required>
          ${fieldError(errors, 'username')}
        </label>
        <label>
          <span>รหัสผ่านส่วนตัว</span>
          <input type="password" name="password" autocomplete="new-password" required>
          ${fieldError(errors, 'password')}
        </label>
      </div>
      <button class="button primary" type="submit">ลงทะเบียนลูกหอ</button>
    </form>
    <div class="auth-links">
      <a href="/login">มีบัญชีแล้ว เข้าสู่ระบบ</a>
    </div>
  `;

  return authPage({ title: 'ลงทะเบียนลูกหอ', body, settings });
}

module.exports = {
  loginView,
  registerView,
  setupView
};
