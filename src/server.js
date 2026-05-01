require('dotenv').config();
const http = require('node:http');
const { initializeDatabase } = require('./core/database');
const { parseCookies, sendHtml } = require('./core/http');
const { sendStatic } = require('./core/static');
const sessionModel = require('./models/sessionModel');
const router = require('./routes');
const { SESSION_COOKIE } = require('./controllers/AuthController');

// ป้องกันErrorจากกรณีที่เปลี่ยนไปใช้Supabaseแล้วไม่มีฟังก์ชันนี้แล้ว
try {
  if (typeof initializeDatabase === 'function') {
    initializeDatabase();
  }
} catch (error) {
  console.error('Database Init Error:', error);
}

sessionModel.cleanupExpired().catch(console.error);

const cleanupTimer = setInterval(() => {
  sessionModel.cleanupExpired().catch(console.error);
}, 60 * 60 * 1000);
cleanupTimer.unref();

const server = http.createServer(async (req, res) => {
  try {
    if (sendStatic(req, res)) {
      return;
    }

    req.cookies = parseCookies(req.headers.cookie ?? '');
    
    const session = await sessionModel.findByToken(req.cookies[SESSION_COOKIE]);
    
    if (session) {
      req.currentUser = session.user;
      req.session = {
        csrfToken: session.csrfToken,
        id: session.sessionId
      };
    }

    await router.handle(req, res);
  } catch (error) {
    console.error(error);
    if (!res.writableEnded) {
      sendHtml(
        res,
        '<!doctype html><html lang="th"><meta charset="utf-8"><title>เกิดข้อผิดพลาด</title><body><h1>เกิดข้อผิดพลาด</h1><p>ระบบไม่สามารถทำรายการได้ในขณะนี้</p></body></html>',
        500
      );
    }
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});