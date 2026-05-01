function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function money(value) {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function monthLabel(value) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(value))) {
    return escapeHtml(value);
  }

  const [year, month] = value.split('-');
  const months = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม'
  ];

  return `${months[Number(month) - 1]} ${year}`;
}

function todayMonth() {
  return new Date().toISOString().slice(0, 7);
}

function valueOf(source, key, fallback = '') {
  const value = source?.[key];
  return escapeHtml(value ?? fallback);
}

function selected(current, expected) {
  return String(current ?? '') === String(expected ?? '') ? ' selected' : '';
}

function checked(current) {
  return current ? ' checked' : '';
}

function fieldError(errors, field) {
  if (!errors?.[field]) {
    return '';
  }
  return `<p class="field-error">${escapeHtml(errors[field])}</p>`;
}

function errorSummary(errors) {
  const messages = Object.values(errors ?? {});
  if (messages.length === 0) {
    return '';
  }

  return `
    <div class="alert alert-error">
      <strong>ตรวจสอบข้อมูลอีกครั้ง</strong>
      <ul>
        ${messages.map((message) => `<li>${escapeHtml(message)}</li>`).join('')}
      </ul>
    </div>
  `;
}

function flashMessage(flash) {
  if (!flash?.message) {
    return '';
  }

  const type = flash.type === 'error' ? 'alert-error' : 'alert-success';
  return `<div class="alert ${type}">${escapeHtml(flash.message)}</div>`;
}

function roomStatusLabel(status) {
  const labels = {
    vacant: 'ว่าง',
    occupied: 'มีผู้เช่า',
    maintenance: 'ซ่อมบำรุง'
  };
  return labels[status] ?? status;
}

function billStatusLabel(status) {
  return status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ';
}

function badgeClass(status) {
  const classes = {
    vacant: 'badge badge-ok',
    occupied: 'badge badge-info',
    maintenance: 'badge badge-warn',
    paid: 'badge badge-ok',
    unpaid: 'badge badge-warn'
  };
  return classes[status] ?? 'badge';
}

function nl2br(value) {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

function dateTime(value) {
  if (!value) {
    return '';
  }

  const normalized = String(value).replace(' ', 'T');
  const date = new Date(`${normalized}Z`);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok'
  }).format(date);
}

module.exports = {
  badgeClass,
  billStatusLabel,
  checked,
  dateTime,
  errorSummary,
  escapeHtml,
  fieldError,
  flashMessage,
  money,
  monthLabel,
  nl2br,
  roomStatusLabel,
  selected,
  todayMonth,
  valueOf
};
