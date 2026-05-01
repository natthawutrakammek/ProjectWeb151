const {
  badgeClass,
  billStatusLabel,
  escapeHtml,
  money,
  monthLabel,
  nl2br,
  selected
} = require('./helpers');

function billBreakdown(bill) {
  if (!bill) {
    return '<p class="empty-state">ยังไม่มีบิลของห้องนี้</p>';
  }

  return `
    <div class="bill-breakdown">
      <div><span>ค่าเช่าห้อง</span><strong>${money(bill.rent_price)} บาท</strong></div>
      <div><span>ค่าไฟ ${money(bill.electric_units)} หน่วย</span><strong>${money(bill.electric_total)} บาท</strong></div>
      <div><span>ค่าน้ำ ${money(bill.water_units)} หน่วย</span><strong>${money(bill.water_total)} บาท</strong></div>
      <div><span>ค่าอื่น</span><strong>${money(bill.extra_total)} บาท</strong></div>
      <div class="total"><span>รวมต้องชำระ</span><strong>${money(bill.grand_total)} บาท</strong></div>
    </div>
    <p><span class="${badgeClass(bill.paid_status)}">${billStatusLabel(bill.paid_status)}</span></p>
  `;
}

function historyTable(bills) {
  const rows = bills.length
    ? bills.map((bill) => `
      <tr>
        <td>${monthLabel(bill.billing_month)}</td>
        <td>${money(bill.electric_units)} หน่วย</td>
        <td>${money(bill.water_units)} หน่วย</td>
        <td>${money(bill.grand_total)} บาท</td>
        <td><span class="${badgeClass(bill.paid_status)}">${billStatusLabel(bill.paid_status)}</span></td>
      </tr>
    `).join('')
    : '<tr><td colspan="5" class="empty-state">ยังไม่มีประวัติบิล</td></tr>';

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>เดือน</th>
            <th>ไฟ</th>
            <th>น้ำ</th>
            <th>ยอดรวม</th>
            <th>สถานะ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function tenantDashboardView({ user, room, latestBill, bills, settings }) {
  const electricRateTotal = Number(settings.electricity_rate || 0) + Number(settings.electricity_meter_rate || 0);
  const waterRateTotal = Number(settings.water_rate || 0) + Number(settings.water_meter_rate || 0);

  return `
    <section class="metric-grid">
      <article class="metric-card accent">
        <span>ห้องของคุณ</span>
        <strong>${room ? escapeHtml(room.room_number) : 'ยังไม่ผูกห้อง'}</strong>
      </article>
      <article class="metric-card electric-card">
        <span>ค่าไฟรวมมิเตอร์ต่อหน่วย</span>
        <strong>${money(electricRateTotal)} บาท</strong>
      </article>
      <article class="metric-card water-card">
        <span>ค่าน้ำรวมมิเตอร์ต่อหน่วย</span>
        <strong>${money(waterRateTotal)} บาท</strong>
      </article>
      <article class="metric-card">
        <span>บิลล่าสุด</span>
        <strong>${latestBill ? monthLabel(latestBill.billing_month) : '-'}</strong>
      </article>
    </section>

    <section class="content-grid">
      <article class="content-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Current bill</p>
            <h2>ยอดชำระล่าสุด</h2>
          </div>
        </div>
        ${billBreakdown(latestBill)}
      </article>
      <article class="content-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Dorm details</p>
            <h2>ช่องทางติดต่อและชำระเงิน</h2>
          </div>
        </div>
        <div class="detail-block">
          <h3>ติดต่อหอพัก</h3>
          <p>${settings.contact_details ? nl2br(settings.contact_details) : 'ยังไม่มีข้อมูลติดต่อ'}</p>
        </div>
        <div class="detail-block">
          <h3>ชำระเงิน</h3>
          <p>${settings.payment_details ? nl2br(settings.payment_details) : 'ยังไม่มีข้อมูลการชำระเงิน'}</p>
        </div>
      </article>
    </section>

    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">History</p>
          <h2>ประวัติบิลล่าสุด</h2>
        </div>
        <a class="button secondary" href="/tenant/bills">ดูประวัติทั้งหมด</a>
      </div>
      ${historyTable(bills)}
    </section>
  `;
}

function tenantBillsView({ bills, months, selectedMonth }) {
  return `
    <section class="content-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Readonly billing</p>
          <h2>ประวัติบิลย้อนหลัง</h2>
        </div>
        <form method="get" action="/tenant/bills" class="inline-search">
          <select name="month">
            <option value="">ทุกเดือน</option>
            ${months.map((bill) => `<option value="${bill.billing_month}"${selected(selectedMonth, bill.billing_month)}>${monthLabel(bill.billing_month)}</option>`).join('')}
          </select>
          <button class="button secondary" type="submit">กรอง</button>
        </form>
      </div>
      ${historyTable(bills)}
    </section>
  `;
}

module.exports = {
  tenantBillsView,
  tenantDashboardView
};
