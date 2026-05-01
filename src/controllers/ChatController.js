const activityModel = require('../models/activityModel');
const messageModel = require('../models/messageModel');
const roomModel = require('../models/roomModel');
const { asText } = require('../utils/validation');
const { chatView } = require('../views/chatView');
const { redirectWithMessage, renderApp } = require('./render');

async function showChat(req, res) {
  const dormId = req.currentUser.dorm_id;
  
  const rooms = await roomModel.listRoomsForSelect(dormId);
  const selectedRoomId = req.currentUser.role === 'owner' ? asText(req.query.room_id) : '';
  
  
  const messages = req.currentUser.role === 'owner'
    ? await messageModel.listMessagesForOwner(dormId, selectedRoomId)
    : await messageModel.listMessagesForTenant(req.currentUser);

  const body = chatView({
    messages,
    rooms,
    selectedRoomId,
    user: req.currentUser
  });

  renderApp(req, res, { active: 'chat', body, title: 'แชทหอพัก' });
}

async function sendMessage(req, res) {
  const dormId = req.currentUser.dorm_id;
  const body = asText(req.body.body);
  if (!body) {
    redirectWithMessage(res, '/chat', 'error', 'กรุณากรอกข้อความ');
    return;
  }

  const messageBody = body.length > 1000 ? body.slice(0, 1000) : body;
  let roomId = null;

  if (req.currentUser.role === 'owner') {
    const rawRoomId = asText(req.body.room_id);
    roomId = rawRoomId ? Number.parseInt(rawRoomId, 10) : null;
    
    
    if (roomId && !(await roomModel.findById(roomId, dormId))) {
      redirectWithMessage(res, '/chat', 'error', 'ไม่พบห้องที่เลือก');
      return;
    }
  } else {
    roomId = req.currentUser.room_id;
    if (!roomId) {
      redirectWithMessage(res, '/chat', 'error', 'บัญชีนี้ยังไม่ได้ผูกกับห้องพัก');
      return;
    }
  }

  
  await messageModel.createMessage({
    body: messageBody,
    dormId,
    roomId,
    userId: req.currentUser.id
  });
  
  await activityModel.logActivity(dormId, req.currentUser.id, 'ส่งข้อความ', req.currentUser.role === 'owner' ? 'เจ้าของหอส่งข้อความ' : 'ลูกหอส่งข้อความ');

  const target = req.currentUser.role === 'owner' && roomId ? `/chat?room_id=${roomId}` : '/chat';
  redirectWithMessage(res, target, 'success', 'ส่งข้อความแล้ว');
}

module.exports = {
  sendMessage,
  showChat
};