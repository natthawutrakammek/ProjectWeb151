const {
  escapeHtml,
  flashMessage
} = require('./helpers');

function brandMedia(settings, className) {
  const brandImagePath = settings?.brand_image_path || '';
  const dormName = settings?.dorm_name || 'DormEase Cloud';
  const initial = escapeHtml(dormName.slice(0, 1).toUpperCase() || 'D');

  if (brandImagePath) {
    return `<img src="${escapeHtml(brandImagePath)}" alt="โปรไฟล์หอพัก" class="${className}">`;
  }

  return `<div class="${className} brand-photo-fallback">${initial}</div>`;
}

function authVisual(settings) {
  const dormCode = (settings?.dorm_code || '').trim();
  const helperCopy = dormCode
    ? `รหัสหอ: ${dormCode}`
    : 'รองรับหลายหอ แยกข้อมูลและผู้ใช้งานของแต่ละหอออกจากกัน';

  return `
    <div class="auth-visual">
      <img
        src="/images/main_page_picture.png"
        alt="ภาพประกอบการจัดการหอพักออนไลน์และการรับลูกหอเข้าพัก"
        class="auth-photo"
      >
      <div class="auth-visual-body">
        <p class="eyebrow">Dormitory Management</p>
        <h2>ดูแลห้อง บิล และลูกหอในพื้นที่ของหอคุณ</h2>
        <p class="auth-visual-lead">เริ่มสร้างหอใหม่ เข้าสู่ระบบ หรือให้ลูกหอลงทะเบียนด้วยรหัสหอของตัวเองได้ในที่เดียว</p>
        <div class="auth-highlight-list">
          <span class="auth-highlight">แยกข้อมูลแต่ละหอชัดเจน</span>
          <span class="auth-highlight">จัดการห้องและบิลได้ง่าย</span>
          <span class="auth-highlight">ใช้งานได้ทั้งเจ้าของหอและลูกหอ</span>
        </div>
        <p class="auth-visual-copy">${escapeHtml(helperCopy)}</p>
      </div>
    </div>
  `;
}

function navLink(active, key, href, label) {
  const current = active === key ? ' aria-current="page"' : '';
  return `<a href="${href}" class="nav-link${active === key ? ' active' : ''}"${current}>${label}</a>`;
}

function appNav(user, active, settings) {
  if (!user) {
    return '';
  }

  const ownerLinks = [
    ['dashboard', '/owner/dashboard', 'ภาพรวม'],
    ['rooms', '/owner/rooms', 'ห้องพัก'],
    ['bills', '/owner/bills', 'บิลรายเดือน'],
    ['charges', '/owner/charges', 'ค่าใช้จ่ายอื่น'],
    ['chat', '/chat', 'แชท'],
    ['settings', '/owner/settings', 'ตั้งค่า']
  ];

  const tenantLinks = [
    ['dashboard', '/tenant/dashboard', 'ภาพรวม'],
    ['bills', '/tenant/bills', 'ประวัติบิล'],
    ['chat', '/chat', 'แชท']
  ];

  const links = user.role === 'owner' ? ownerLinks : tenantLinks;
  const dormName = settings?.dorm_name || user.dorm_name || 'DormEase Cloud';

  return `
    <aside class="sidebar">
      <a class="brand" href="${user.role === 'owner' ? '/owner/dashboard' : '/tenant/dashboard'}">
        ${brandMedia(settings, 'brand-photo')}
        <span>
          <strong>${escapeHtml(dormName)}</strong>
          <small>${escapeHtml(user.role === 'owner' ? `เจ้าของหอ · ${user.dorm_code}` : `ลูกหอ · ${user.dorm_code}`)}</small>
        </span>
      </a>
      <nav class="nav">
        ${links.map(([key, href, label]) => navLink(active, key, href, label)).join('')}
      </nav>
      <a class="logout-link" href="/logout">ออกจากระบบ</a>
    </aside>
  `;
}

function page({ title, body, user, settings, active = '', flash = null }) {
  const dormName = settings?.dorm_name ?? user?.dorm_name ?? 'DormEase Cloud';
  const fullTitle = `${title} | ${dormName}`;

  return `<!doctype html>
  <html lang="th">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(fullTitle)}</title>
      <link rel="stylesheet" href="/assets/styles.css">
      <script src="/assets/app.js" defer></script>
    </head>
    <body>
      <div class="app-shell">
        ${appNav(user, active, settings)}
        <main class="main-panel">
          <header class="topbar">
            <div>
              <p class="eyebrow">${escapeHtml(dormName)}</p>
              <h1>${escapeHtml(title)}</h1>
            </div>
            ${user ? `<p class="user-chip">${escapeHtml(user.display_name)} · ${escapeHtml(user.username)}</p>` : ''}
          </header>
          ${flashMessage(flash)}
          ${body}
        </main>
      </div>
    </body>
  </html>`;
}

function authPage({ title, body, settings }) {
  const dormName = settings?.dorm_name ?? 'DormEase Cloud';

  return `<!doctype html>
  <html lang="th">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${escapeHtml(title)} | ${escapeHtml(dormName)}</title>
      <link rel="stylesheet" href="/assets/styles.css">
    </head>
    <body>
      <main class="auth-page">
        <section class="auth-card">
          <div class="auth-copy">
            <p class="eyebrow">${escapeHtml(dormName)}</p>
            <h1>${escapeHtml(title)}</h1>
            ${body}
          </div>
          ${authVisual(settings)}
        </section>
      </main>
    </body>
  </html>`;
}

module.exports = {
  authPage,
  page
};
