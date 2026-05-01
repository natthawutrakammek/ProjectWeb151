const {
  badgeClass,
  billStatusLabel,
  checked,
  dateTime,
  errorSummary,
  escapeHtml,
  fieldError,
  money,
  monthLabel,
  roomStatusLabel,
  selected,
  todayMonth,
  valueOf
} = require('./helpers');

function ownerDashboardView({ stats, summary, activities, currentMonth, settings }) {
  const activityItems = activities.length
    ? activities.map((item) => `
      <li>
        <strong>${escapeHtml(item.action)}</strong>
        <span>${escapeHtml(item.details)}</span>
        <small>${dateTime(item.created_at)}</small>
      </li>
    `).join('')
    : '<li class="muted">ยังไม่มีบันทึกกิจกรรม</li>';

  return `
    <section class="metric-grid">
      <article class="metric-card">
        <span>จำนวนห้องทั้งหมด</span>
        <strong>${stats.room_count ?? 0}</strong>
      </article>
      <article class="metric-card">
        <span>ห้องมีผู้เช่า</span>
        <strong>${stats.occupied_count ?? 0}</strong>
      </article>
      <article class="metric-card electric-card">
        <span>ค่าไฟรวม ${monthLabel(currentMonth)}</span>
        <strong>${money(summary.electricity_total)} บาท</strong>
      </article>
      <article class="metric-card water-card">
        <span>ค่าน้ำรวม ${monthLabel(currentMonth)}</span>
        <strong>${money(summary.water_total)} บาท</strong>
      </article>
      <article class="metric-card accent">
        <span>ยอดรวมบิลเดือนนี้</span>
        <strong>${money(summary.grand_total)} บาท</strong>
      </article>
      <article class="metric-card">
        <span>บิลรอชำระ</span>
        <strong>${summary.unpaid_count ?? 0}</strong>
      </article>
    </section>

    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Billing rule</p>
          <h2>สูตรคำนวณหน่วย</h2>
        </div>
      </div>
      <p class="muted">
        ค่าไฟที่ใช้ในบิล = (${money(settings.electricity_rate)} + ${money(settings.electricity_meter_rate)}) ต่อหน่วย
        และค่าน้ำที่ใช้ในบิล = (${money(settings.water_rate)} + ${money(settings.water_meter_rate)}) ต่อหน่วย
      </p>
    </section>

    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Activity log</p>
          <h2>ความเคลื่อนไหวล่าสุด</h2>
        </div>
        <a class="button secondary" href="/owner/bills">จัดการบิล</a>
      </div>
      <ul class="activity-list">${activityItems}</ul>
    </section>
  `;
}

function roomsView({ rooms, search, errors = {}, form = {} }) {
  const roomCards = rooms.length
    ? rooms.map((room) => `
      <article class="item-card">
        <div class="item-card-head">
          <div>
            <p class="eyebrow">ห้อง ${escapeHtml(room.room_number)}</p>
            <h3>${escapeHtml(room.tenant_name || 'ยังไม่มีลูกหอ')}</h3>
          </div>
          <span class="${badgeClass(room.status)}">${roomStatusLabel(room.status)}</span>
        </div>
        <form method="post" action="/owner/rooms/${room.id}" class="item-form">
          <div class="form-grid four">
            <label>
              <span>เลขห้อง</span>
              <input name="room_number" value="${escapeHtml(room.room_number)}" required>
            </label>
            <label>
              <span>ชั้น</span>
              <input name="floor" value="${escapeHtml(room.floor)}">
            </label>
            <label>
              <span>ค่าเช่าห้อง</span>
              <input name="rent_price" type="number" min="0" step="0.01" value="${escapeHtml(room.rent_price)}" required>
            </label>
            <label>
              <span>สถานะ</span>
              <select name="status">
                <option value="vacant"${selected(room.status, 'vacant')}>ว่าง</option>
                <option value="occupied"${selected(room.status, 'occupied')}>มีผู้เช่า</option>
                <option value="maintenance"${selected(room.status, 'maintenance')}>ซ่อมบำรุง</option>
              </select>
            </label>
          </div>
          <label>
            <span>หมายเหตุ</span>
            <textarea name="note" rows="2">${escapeHtml(room.note)}</textarea>
          </label>
          <div class="row-actions">
            <button class="button primary" type="submit">บันทึกห้อง</button>
            <button class="button danger" type="submit" formaction="/owner/rooms/${room.id}/delete" data-confirm="ลบห้อง ${escapeHtml(room.room_number)} ใช่ไหม">ลบห้อง</button>
          </div>
        </form>
      </article>
    `).join('')
    : '<p class="empty-state">ยังไม่มีห้องพัก หรือไม่พบผลลัพธ์จากคำค้นนี้</p>';

  return `
    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Rooms</p>
          <h2>เพิ่มห้องและค้นหาห้อง</h2>
        </div>
        <form method="get" action="/owner/rooms" class="inline-search">
          <input name="search" value="${escapeHtml(search)}" placeholder="ค้นหาเลขห้อง ชื่อผู้เช่า หรือสถานะ">
          <button class="button secondary" type="submit">ค้นหา</button>
        </form>
      </div>
      ${errorSummary(errors)}
      <form method="post" action="/owner/rooms" class="stack-form compact">
        <div class="form-grid four">
          <label>
            <span>เลขห้อง</span>
            <input name="room_number" value="${valueOf(form, 'room_number')}" required>
            ${fieldError(errors, 'room_number')}
          </label>
          <label>
            <span>ชั้น</span>
            <input name="floor" value="${valueOf(form, 'floor')}">
          </label>
          <label>
            <span>ค่าเช่าห้อง</span>
            <input name="rent_price" type="number" min="0" step="0.01" value="${valueOf(form, 'rent_price')}" required>
            ${fieldError(errors, 'rent_price')}
          </label>
          <label>
            <span>สถานะ</span>
            <select name="status">
              <option value="vacant"${selected(form.status, 'vacant')}>ว่าง</option>
              <option value="occupied"${selected(form.status, 'occupied')}>มีผู้เช่า</option>
              <option value="maintenance"${selected(form.status, 'maintenance')}>ซ่อมบำรุง</option>
            </select>
          </label>
        </div>
        <label>
          <span>หมายเหตุ</span>
          <textarea name="note" rows="2">${valueOf(form, 'note')}</textarea>
        </label>
        <button class="button primary" type="submit">เพิ่มห้อง</button>
      </form>
    </section>

    <section class="item-list">${roomCards}</section>
  `;
}

function chargesView({ charges, errors = {}, form = {} }) {
  const rows = charges.length
    ? charges.map((charge) => `
      <article class="item-card">
        <form method="post" action="/owner/charges/${charge.id}" class="item-form">
          <div class="form-grid three">
            <label>
              <span>ชื่อค่าใช้จ่าย</span>
              <input name="name" value="${escapeHtml(charge.name)}" required>
            </label>
            <label>
              <span>ราคา</span>
              <input name="amount" type="number" min="0" step="0.01" value="${escapeHtml(charge.amount)}" required>
            </label>
            <label class="check-row">
              <input type="checkbox" name="is_active" value="1"${checked(charge.is_active)}>
              <span>ใช้งานกับบิลใหม่</span>
            </label>
          </div>
          <div class="row-actions">
            <button class="button primary" type="submit">บันทึก</button>
            <button class="button danger" type="submit" formaction="/owner/charges/${charge.id}/delete" data-confirm="ลบรายการ ${escapeHtml(charge.name)} ใช่ไหม">ลบ</button>
          </div>
        </form>
      </article>
    `).join('')
    : '<p class="empty-state">ยังไม่มีค่าใช้จ่ายอื่น</p>';

  return `
    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Extra charges</p>
          <h2>เพิ่มค่าอื่น เช่น ค่าส่วนกลาง ค่าบำรุง</h2>
        </div>
      </div>
      ${errorSummary(errors)}
      <form method="post" action="/owner/charges" class="stack-form compact">
        <div class="form-grid three">
          <label>
            <span>ชื่อค่าใช้จ่าย</span>
            <input name="name" value="${valueOf(form, 'name')}" required>
            ${fieldError(errors, 'name')}
          </label>
          <label>
            <span>ราคา</span>
            <input name="amount" type="number" min="0" step="0.01" value="${valueOf(form, 'amount')}" required>
            ${fieldError(errors, 'amount')}
          </label>
          <label class="check-row">
            <input type="checkbox" name="is_active" value="1" checked>
            <span>ใช้งานกับบิลใหม่</span>
          </label>
        </div>
        <button class="button primary" type="submit">เพิ่มค่าใช้จ่าย</button>
      </form>
    </section>
    <section class="item-list">${rows}</section>
  `;
}

function billsView({ bills, rooms, months, summary, filters, settings, editingBill = null, errors = {}, form = {} }) {
  const source = editingBill ?? form;
  const activeMonth = source.billing_month ?? filters.month ?? todayMonth();
  const electricRateTotal = Number(settings.electricity_rate || 0) + Number(settings.electricity_meter_rate || 0);
  const waterRateTotal = Number(settings.water_rate || 0) + Number(settings.water_meter_rate || 0);

  const billRows = bills.length
    ? bills.map((bill) => `
      <tr>
        <td>${monthLabel(bill.billing_month)}</td>
        <td>ห้อง ${escapeHtml(bill.room_number)}</td>
        <td>${escapeHtml(bill.tenant_name || '-')}</td>
        <td class="electric-text">${money(bill.electric_units)} หน่วย</td>
        <td class="water-text">${money(bill.water_units)} หน่วย</td>
        <td>${money(bill.grand_total)} บาท</td>
        <td><span class="${badgeClass(bill.paid_status)}">${billStatusLabel(bill.paid_status)}</span></td>
        <td class="table-actions">
          <a class="button secondary small" href="/owner/bills/${bill.id}/edit">แก้ไข</a>
          <form method="post" action="/owner/bills/${bill.id}/status">
            <input type="hidden" name="paid_status" value="${bill.paid_status === 'paid' ? 'unpaid' : 'paid'}">
            <button class="button secondary small" type="submit">${bill.paid_status === 'paid' ? 'ตั้งรอชำระ' : 'ชำระแล้ว'}</button>
          </form>
          <form method="post" action="/owner/bills/${bill.id}/delete">
            <button class="button danger small" type="submit" data-confirm="ลบบิลห้อง ${escapeHtml(bill.room_number)} เดือน ${monthLabel(bill.billing_month)} ใช่ไหม">ลบ</button>
          </form>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" class="empty-state">ยังไม่มีบิลตามเงื่อนไขนี้</td></tr>';

  return `
    <section class="metric-grid">
      <article class="metric-card electric-card">
        <span>ค่าไฟรวม</span>
        <strong>${money(summary.electricity_total)} บาท</strong>
      </article>
      <article class="metric-card water-card">
        <span>ค่าน้ำรวม</span>
        <strong>${money(summary.water_total)} บาท</strong>
      </article>
      <article class="metric-card">
        <span>ค่าอื่นรวม</span>
        <strong>${money(summary.extra_total)} บาท</strong>
      </article>
      <article class="metric-card accent">
        <span>ยอดรวมทั้งหมด</span>
        <strong>${money(summary.grand_total)} บาท</strong>
      </article>
    </section>

    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Monthly billing</p>
          <h2>${editingBill ? 'แก้ไขบิลรายเดือน' : 'บันทึกบิลรายเดือน'}</h2>
        </div>
        ${editingBill ? '<a class="button secondary" href="/owner/bills">ยกเลิกแก้ไข</a>' : ''}
      </div>
      <p class="muted">
        ไฟคิดที่ ${money(electricRateTotal)} บาท/หน่วย (${money(settings.electricity_rate)} + มิเตอร์ ${money(settings.electricity_meter_rate)})
        และน้ำคิดที่ ${money(waterRateTotal)} บาท/หน่วย (${money(settings.water_rate)} + มิเตอร์ ${money(settings.water_meter_rate)})
      </p>
      ${errorSummary(errors)}
      <form method="post" action="/owner/bills${editingBill ? `/${editingBill.id}` : ''}" class="stack-form compact">
        <div class="form-grid four">
          <label>
            <span>เดือน/ปี</span>
            <input type="month" name="billing_month" value="${escapeHtml(activeMonth)}" required>
            ${fieldError(errors, 'billing_month')}
          </label>
          <label>
            <span>ห้อง</span>
            <select name="room_id" required>
              <option value="">เลือกห้อง</option>
              ${rooms.map((room) => `
                <option value="${room.id}"${selected(source.room_id, room.id)}>ห้อง ${escapeHtml(room.room_number)} ${room.tenant_name ? `· ${escapeHtml(room.tenant_name)}` : ''}</option>
              `).join('')}
            </select>
            ${fieldError(errors, 'room_id')}
          </label>
          <label class="utility-field electric-field">
            <span>หน่วยไฟ</span>
            <input name="electric_units" type="number" min="0" step="0.01" value="${valueOf(source, 'electric_units', 0)}" required>
            ${fieldError(errors, 'electric_units')}
          </label>
          <label class="utility-field water-field">
            <span>หน่วยน้ำ</span>
            <input name="water_units" type="number" min="0" step="0.01" value="${valueOf(source, 'water_units', 0)}" required>
            ${fieldError(errors, 'water_units')}
          </label>
        </div>
        <div class="form-grid two">
          <label>
            <span>สถานะชำระเงิน</span>
            <select name="paid_status">
              <option value="unpaid"${selected(source.paid_status, 'unpaid')}>รอชำระ</option>
              <option value="paid"${selected(source.paid_status, 'paid')}>ชำระแล้ว</option>
            </select>
          </label>
          <label>
            <span>หมายเหตุ</span>
            <input name="note" value="${valueOf(source, 'note')}">
          </label>
        </div>
        <button class="button primary" type="submit">${editingBill ? 'บันทึกการแก้ไข' : 'บันทึกบิล'}</button>
      </form>
    </section>

    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">History</p>
          <h2>รายการบิล</h2>
        </div>
        <form method="get" action="/owner/bills" class="inline-search">
          <select name="month">
            <option value="">ทุกเดือน</option>
            ${months.map((item) => `<option value="${item.billing_month}"${selected(filters.month, item.billing_month)}>${monthLabel(item.billing_month)}</option>`).join('')}
          </select>
          <select name="status">
            <option value="">ทุกสถานะ</option>
            <option value="unpaid"${selected(filters.status, 'unpaid')}>รอชำระ</option>
            <option value="paid"${selected(filters.status, 'paid')}>ชำระแล้ว</option>
          </select>
          <input name="search" value="${escapeHtml(filters.search ?? '')}" placeholder="ค้นหาเลขห้องหรือชื่อลูกหอ">
          <button class="button secondary" type="submit">กรอง</button>
        </form>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>เดือน</th>
              <th>ห้อง</th>
              <th>ลูกหอ</th>
              <th class="electric-header">ไฟ</th>
              <th class="water-header">น้ำ</th>
              <th>ยอดรวม</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>${billRows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function settingsView({ settings, errors = {}, form = {} }) {
  const source = Object.keys(form).length ? form : settings;
  const preview = source.brand_image_path || settings.brand_image_path;

  return `
    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Dorm settings</p>
          <h2>ตั้งค่าหอพัก รหัสผ่าน รูปภาพ และอัตราหน่วย</h2>
        </div>
      </div>
      ${errorSummary(errors)}
      <form method="post" action="/owner/settings" enctype="multipart/form-data" class="stack-form">
        <div class="form-grid two">
          <label>
            <span>ชื่อหอพัก</span>
            <input name="dorm_name" value="${valueOf(source, 'dorm_name')}" required>
            ${fieldError(errors, 'dorm_name')}
          </label>
          <label>
            <span>รูปโปรไฟล์หอพัก</span>
            <input type="file" name="brand_image" accept="image/png,image/jpeg,image/webp,image/gif">
            <small>รองรับ PNG, JPG, WEBP, GIF ขนาดไม่เกิน 2MB</small>
            ${fieldError(errors, 'brand_image')}
          </label>
        </div>
        ${preview ? `<div class="image-preview"><img src="${escapeHtml(preview)}" alt="รูปโปรไฟล์หอพักปัจจุบัน" class="preview-image"></div>` : ''}
        <div class="form-grid three">
          <label class="utility-field electric-field">
            <span>ราคาค่าไฟต่อหน่วย</span>
            <input name="electricity_rate" type="number" min="0" step="0.01" value="${valueOf(source, 'electricity_rate')}" required>
            ${fieldError(errors, 'electricity_rate')}
          </label>
          <label class="utility-field electric-field">
            <span>ค่ามิเตอร์ไฟต่อหน่วย</span>
            <input name="electricity_meter_rate" type="number" min="0" step="0.01" value="${valueOf(source, 'electricity_meter_rate', 0)}" required>
            ${fieldError(errors, 'electricity_meter_rate')}
          </label>
          <label class="utility-field electric-field">
            <span>ค่าไฟขั้นต่ำ</span>
            <input name="electricity_min_fee" type="number" min="0" step="0.01" value="${valueOf(source, 'electricity_min_fee')}" required>
            ${fieldError(errors, 'electricity_min_fee')}
          </label>
        </div>
        <div class="form-grid three">
          <label class="utility-field water-field">
            <span>ราคาค่าน้ำต่อหน่วย</span>
            <input name="water_rate" type="number" min="0" step="0.01" value="${valueOf(source, 'water_rate')}" required>
            ${fieldError(errors, 'water_rate')}
          </label>
          <label class="utility-field water-field">
            <span>ค่ามิเตอร์น้ำต่อหน่วย</span>
            <input name="water_meter_rate" type="number" min="0" step="0.01" value="${valueOf(source, 'water_meter_rate', 0)}" required>
            ${fieldError(errors, 'water_meter_rate')}
          </label>
          <label class="utility-field water-field">
            <span>ค่าน้ำขั้นต่ำ</span>
            <input name="water_min_fee" type="number" min="0" step="0.01" value="${valueOf(source, 'water_min_fee')}" required>
            ${fieldError(errors, 'water_min_fee')}
          </label>
        </div>
        <div class="form-grid two">
          <label>
            <span>ช่องทางติดต่อ</span>
            <textarea name="contact_details" rows="5">${valueOf(source, 'contact_details')}</textarea>
          </label>
          <label>
            <span>ช่องทางชำระเงิน</span>
            <textarea name="payment_details" rows="5">${valueOf(source, 'payment_details')}</textarea>
          </label>
        </div>
        <div class="form-grid two">
          <label>
            <span>รหัสผ่านเจ้าของหอใหม่</span>
            <input type="password" name="new_owner_password" autocomplete="new-password">
            <small>เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน</small>
            ${fieldError(errors, 'new_owner_password')}
          </label>
          <label>
            <span>รหัสลงทะเบียนลูกหอใหม่</span>
            <input type="password" name="tenant_join_code" autocomplete="new-password">
            <small>แต่ละหอมีรหัสของตัวเองและเก็บแบบ hash</small>
            ${fieldError(errors, 'tenant_join_code')}
          </label>
        </div>
        <button class="button primary" type="submit">บันทึกการตั้งค่า</button>
      </form>
    </section>
  `;
}

module.exports = {
  billsView,
  chargesView,
  ownerDashboardView,
  roomsView,
  settingsView
};
