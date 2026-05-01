const { supabase } = require('../core/database');
const { randomToken, sha256 } = require('../utils/security');

const SESSION_DAYS = 7;
const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;

async function createSession(userId) {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  const { error } = await supabase
    .from('sessions')
    .insert([{
      user_id: userId,
      token_hash: sha256(token),
      csrf_token: csrfToken,
      expires_at: expiresAt
    }]);

  if (error) throw error;

  return {
    csrfToken,
    maxAge: SESSION_MAX_AGE_SECONDS,
    token
  };
}

async function findByToken(token) {
  if (!token) {
    return null;
  }

  // ดึงข้อมูลsessionsและดึงข้อมูลuserพร้อมตารางที่เชื่อมกันอยู่
  const { data: row, error } = await supabase
    .from('sessions')
    .select(`
      id,
      csrf_token,
      expires_at,
      users (
        id, dorm_id, username, display_name, role, room_id,
        dorms ( dorm_name, dorm_code, brand_image_path ),
        rooms ( room_number )
      )
    `)
    .eq('token_hash', sha256(token))
    .single();

  if (error || !row || !row.users) {
    return null;
  }

  // เช็กว่าSessionหมดอายุหรือยัง
  if (Number(row.expires_at) < Date.now()) {
    await destroySession(token);
    return null;
  }

  const user = row.users;
  
  // จัดเรียงObjectและคืนค่ากลับไป
  return {
    csrfToken: row.csrf_token,
    sessionId: row.id,
    user: {
      brand_image_path: user.dorms?.brand_image_path || null,
      dorm_code: user.dorms?.dorm_code || null,
      dorm_id: user.dorm_id,
      dorm_name: user.dorms?.dorm_name || null,
      display_name: user.display_name,
      id: user.id,
      role: user.role,
      room_id: user.room_id,
      room_number: user.rooms?.room_number || null,
      username: user.username
    }
  };
}

async function destroySession(token) {
  if (!token) {
    return;
  }

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('token_hash', sha256(token));

  if (error) throw error;
}

async function cleanupExpired() {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .lt('expires_at', Date.now()); // ลบข้อมูลที่ expires_at น้อยกว่าเวลาปัจจุบัน

  if (error) throw error;
}

module.exports = {
  cleanupExpired,
  createSession,
  destroySession,
  findByToken,
  SESSION_MAX_AGE_SECONDS
};