DormEase หอพัก - Full-Stack MVC Web Application

1) ภาพรวมระบบ
โปรเจกต์นี้เป็นเว็บจัดการหอพักแบบ Full-Stack สำหรับรายวิชา Web Programming
ออกแบบตามรูปแบบ MVC โดยแยก Model, View, Controller ชัดเจน และใช้ฐานข้อมูล SQLite จริง

บทบาทผู้ใช้
- เจ้าของหอ: อ่าน เพิ่ม แก้ไข ลบ และจัดการข้อมูลหอพักได้
- ลูกหอ: อ่านข้อมูลห้องและบิลของตนเองได้ ไม่สามารถแก้ไขข้อมูลระบบได้

แนวคิดล่าสุดของระบบ
- รองรับหลายหอพักในระบบเดียว (multi-dorm)
- แต่ละหอมีรหัสหอ (dorm code) ของตัวเอง
- เจ้าของหอแต่ละคนจัดการข้อมูลของหอตนเองแยกจากหออื่น
- รหัสลงทะเบียนลูกหอแยกตามหอ ไม่ปะปนกัน

2) ฟีเจอร์หลัก
- สร้างหอพักใหม่ได้จากหน้า login
- แต่ละหอกำหนดชื่อหอ รหัสหอ บัญชีเจ้าของหอ และรหัสลงทะเบียนลูกหอของตัวเอง
- Login / Logout / Register ลูกหอ โดยต้องระบุรหัสหอ
- Authorization 2 ระดับ: owner และ tenant
- เจ้าของหอจัดการห้องพักแบบ CRUD
- เจ้าของหอกำหนดค่าเช่ารายห้อง
- เจ้าของหอกำหนดราคาค่าไฟต่อหน่วย, ค่ามิเตอร์ไฟต่อหน่วย, ค่าไฟขั้นต่ำ
- เจ้าของหอกำหนดราคาค่าน้ำต่อหน่วย, ค่ามิเตอร์น้ำต่อหน่วย, ค่าน้ำขั้นต่ำ
- เจ้าของหอเพิ่ม/แก้ไข/ลบค่าใช้จ่ายอื่น เช่น ค่าส่วนกลาง ค่าบำรุง
- เจ้าของหออัปโหลดรูปโปรไฟล์ของหอได้จากหน้า settings
- เจ้าของหอบันทึกบิลรายเดือน เลือกเดือนได้ และระบบเก็บย้อนหลังล่าสุด 14 เดือน
- แสดงยอดรวมค่าไฟ ค่าน้ำ ค่าอื่น และยอดบิล
- ค้นหา/กรองห้องพักและบิล
- ลูกหอดูหน่วยน้ำไฟ ยอดรวม และประวัติเดือนก่อน
- แชทระหว่างเจ้าของหอกับลูกหอ
- รายละเอียดหอพักเพิ่มเติม เช่น ช่องทางติดต่อและช่องทางชำระเงิน
- Activity log สำหรับช่วยสาธิตการใช้งาน

3) Security ที่ใช้
- Hash password ด้วย scrypt ไม่เก็บรหัสผ่านแบบ plain text
- Hash รหัสลงทะเบียนลูกหอ
- ใช้ prepared statement ผ่าน node:sqlite เพื่อลด SQL injection
- Escape ข้อมูลก่อนแสดงบน HTML เพื่อลด XSS
- ตรวจสอบ input ที่รับจาก form เช่น required, ตัวเลข, เดือน, ความยาวรหัสผ่าน
- Session cookie ตั้งค่า HttpOnly และ SameSite=Lax
- หน้า owner และ tenant แยกสิทธิ์ด้วย middleware

4) โครงสร้างไฟล์
package.json                 คำสั่งรันโปรเจกต์
readme.txt                   คำอธิบายโครงสร้างและวิธีรัน
src/server.js                จุดเริ่มต้นของเว็บเซิร์ฟเวอร์
src/routes.js                รวม route ของระบบ
src/core/                    Router, HTTP helper, static server, database connection
src/models/                  Model สำหรับ database และ business data
src/controllers/             Controller สำหรับ auth, owner, tenant, chat
src/middleware/              Middleware ตรวจสอบ login และสิทธิ์
src/views/                   View function สำหรับสร้าง HTML
src/utils/                   Security และ validation helper
public/assets/               CSS และ JavaScript ฝั่ง browser
public/uploads/              รูปโปรไฟล์หอที่เจ้าของอัปโหลด
scripts/seed.js              สร้างข้อมูลตัวอย่างสำหรับ demo
docs/                        เอกสารช่วยทำรายงาน
data/dormitory.sqlite        ฐานข้อมูลจะถูกสร้างหลังรันระบบหรือ seed

5) วิธีรัน
ต้องใช้ Node.js เวอร์ชัน 22.5.0 ขึ้นไป เพราะโปรเจกต์นี้ใช้ node:sqlite

สร้างข้อมูลตัวอย่าง:
npm run seed

เริ่มเว็บ:
npm start

เปิดใน browser:
http://localhost:3000

โหมดพัฒนา:
npm run dev

6) บัญชีตัวอย่างหลังรัน npm run seed
รหัสหอ
- dormease

เจ้าของหอ
- username: owner
- password: Owner@12345

ลูกหอ
- username: tenant101
- password: Tenant@123

รหัสลงทะเบียนลูกหอสำหรับสร้างบัญชีใหม่
- tenant2026

7) การตั้งค่าครั้งแรกโดยไม่ใช้ seed
ถ้าไม่มีบัญชีเจ้าของหอ ระบบจะพาไปหน้า /setup
เจ้าของหอใหม่สามารถสร้างหอใหม่ได้เรื่อย ๆ จากหน้า /setup หรือปุ่ม "สร้างหอพักใหม่" บนหน้า login
แต่ละหอจะมี owner, tenant register code, rooms, charges, bills, messages ของตัวเอง
ลูกหอต้องใช้ "รหัสหอ" + "รหัสลงทะเบียนลูกหอ" ของหอนั้นในการสมัคร

8) เกณฑ์จาก PDF ที่โปรเจกต์นี้รองรับ
- Frontend: มีหลายหน้า, form, แสดงข้อมูลจาก database, UI อ่านง่าย
- Backend: มี route, รับ request, validation, database connection
- Database: มีตารางสัมพันธ์กัน เช่น users, rooms, bills, charges, messages
- CRUD: ห้องพัก, ค่าใช้จ่ายอื่น, บิลรายเดือน
- Search/Filter: ค้นหาห้อง, กรองบิลตามเดือน/สถานะ/คำค้น
- Authentication: setup, register, login, logout
- Authorization: owner กับ tenant
- Validation: ตรวจ required field, ตัวเลข, เดือน, password length
- Security: password hash, prepared statement, output escaping
- UX: navigation ชัดเจน, feedback error/success, responsive layout
