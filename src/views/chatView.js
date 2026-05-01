const {
  dateTime,
  escapeHtml,
  selected
} = require('./helpers');

function chatView({ user, rooms, messages, selectedRoomId }) {
  const roomSelect = user.role === 'owner'
    ? `
      <form method="get" action="/chat" class="inline-search">
        <select name="room_id">
          <option value="">ทุกห้อง</option>
          ${rooms.map((room) => `<option value="${room.id}"${selected(selectedRoomId, room.id)}>ห้อง ${escapeHtml(room.room_number)}</option>`).join('')}
        </select>
        <button class="button secondary" type="submit">เปิดห้องแชท</button>
      </form>
    `
    : '';

  const targetControl = user.role === 'owner'
    ? `
      <label>
        <span>ส่งถึง</span>
        <select name="room_id">
          <option value="">ประกาศทุกห้อง</option>
          ${rooms.map((room) => `<option value="${room.id}"${selected(selectedRoomId, room.id)}>ห้อง ${escapeHtml(room.room_number)}</option>`).join('')}
        </select>
      </label>
    `
    : '';

  const messageList = messages.length
    ? messages.map((message) => {
      const mine = message.user_id === user.id ? ' mine' : '';
      const roomLabel = message.room_number ? `ห้อง ${escapeHtml(message.room_number)}` : 'ทุกห้อง';
      return `
        <article class="chat-message${mine}">
          <div class="chat-meta">
            <strong>${escapeHtml(message.display_name || 'ผู้ใช้ที่ถูกลบ')}</strong>
            <span>${escapeHtml(message.role === 'owner' ? 'เจ้าของหอ' : roomLabel)}</span>
            <small>${dateTime(message.created_at)}</small>
          </div>
          <p>${escapeHtml(message.body)}</p>
        </article>
      `;
    }).join('')
    : '<p class="empty-state">ยังไม่มีข้อความในห้องแชทนี้</p>';

  return `
    <section class="content-panel chat-panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Dorm chat</p>
          <h2>พูดคุยระหว่างเจ้าของหอกับลูกหอ</h2>
        </div>
        ${roomSelect}
      </div>
      <div class="chat-list">${messageList}</div>
      <form method="post" action="/chat" class="stack-form chat-form">
        ${targetControl}
        <label>
          <span>ข้อความ</span>
          <textarea name="body" rows="3" maxlength="1000" required></textarea>
        </label>
        <button class="button primary" type="submit">ส่งข้อความ</button>
      </form>
    </section>
  `;
}

module.exports = {
  chatView
};
