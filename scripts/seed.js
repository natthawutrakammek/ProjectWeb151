const { initializeDatabase, transaction } = require('../src/core/database');
const activityModel = require('../src/models/activityModel');
const billModel = require('../src/models/billModel');
const chargeModel = require('../src/models/chargeModel');
const messageModel = require('../src/models/messageModel');
const roomModel = require('../src/models/roomModel');
const settingsModel = require('../src/models/settingsModel');
const userModel = require('../src/models/userModel');
const { hashSecret } = require('../src/utils/security');

initializeDatabase();

function monthOffset(offset) {
  const date = new Date();
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 7);
}

if (settingsModel.hasAnyDorm()) {
  console.log('Seed skipped: database already has dorm data.');
  console.log('Open http://localhost:3000 and login with your existing account.');
  process.exit(0);
}

transaction(() => {
  const dormId = settingsModel.createDorm({
    contactDetails: 'โทร 089-123-4567\nLINE: @dormease\nสำนักงานเปิด 09:00-18:00 น.',
    dormCode: 'dormease',
    dormName: 'หอพักต้นแบบ DormEase',
    electricityMeterRate: 2,
    electricityMinFee: 30,
    electricityRate: 8,
    paymentDetails: 'ธนาคารตัวอย่าง 123-4-56789-0\nชื่อบัญชี หอพักต้นแบบ DormEase\nส่งหลักฐานในแชทหลังชำระเงิน',
    tenantJoinCodeHash: hashSecret('tenant2026'),
    waterMeterRate: 5,
    waterMinFee: 50,
    waterRate: 10
  });

  const ownerId = userModel.createUser({
    displayName: 'ผู้ดูแลหอพัก',
    dormId,
    passwordHash: hashSecret('Owner@12345'),
    role: 'owner',
    username: 'owner'
  });

  const room101 = roomModel.createRoom({
    dormId,
    floor: '1',
    note: 'ใกล้ทางเข้า',
    rentPrice: 3500,
    roomNumber: '101',
    status: 'occupied'
  });
  const room102 = roomModel.createRoom({
    dormId,
    floor: '1',
    note: '',
    rentPrice: 3500,
    roomNumber: '102',
    status: 'occupied'
  });
  roomModel.createRoom({
    dormId,
    floor: '2',
    note: 'ห้องมุม',
    rentPrice: 3800,
    roomNumber: '201',
    status: 'vacant'
  });
  roomModel.createRoom({
    dormId,
    floor: '2',
    note: 'รอตรวจระบบไฟ',
    rentPrice: 3800,
    roomNumber: '202',
    status: 'maintenance'
  });

  const tenant101 = userModel.createUser({
    displayName: 'สมชาย ใจดี',
    dormId,
    passwordHash: hashSecret('Tenant@123'),
    role: 'tenant',
    roomId: room101,
    username: 'tenant101'
  });
  const tenant102 = userModel.createUser({
    displayName: 'สุดา สดใส',
    dormId,
    passwordHash: hashSecret('Tenant@123'),
    role: 'tenant',
    roomId: room102,
    username: 'tenant102'
  });

  chargeModel.createCharge({ amount: 150, dormId, isActive: true, name: 'ค่าส่วนกลาง' });
  chargeModel.createCharge({ amount: 100, dormId, isActive: true, name: 'ค่าบำรุงอาคาร' });

  billModel.upsertBill({
    billingMonth: monthOffset(0),
    createdBy: ownerId,
    dormId,
    electricUnits: 86,
    note: 'บิลเดือนปัจจุบัน',
    paidStatus: 'unpaid',
    roomId: room101,
    waterUnits: 12
  });
  billModel.upsertBill({
    billingMonth: monthOffset(0),
    createdBy: ownerId,
    dormId,
    electricUnits: 72,
    note: 'บิลเดือนปัจจุบัน',
    paidStatus: 'paid',
    roomId: room102,
    waterUnits: 10
  });
  billModel.upsertBill({
    billingMonth: monthOffset(-1),
    createdBy: ownerId,
    dormId,
    electricUnits: 80,
    note: 'จ่ายแล้ว',
    paidStatus: 'paid',
    roomId: room101,
    waterUnits: 11
  });
  billModel.upsertBill({
    billingMonth: monthOffset(-1),
    createdBy: ownerId,
    dormId,
    electricUnits: 69,
    note: 'จ่ายแล้ว',
    paidStatus: 'paid',
    roomId: room102,
    waterUnits: 9
  });

  messageModel.createMessage({
    body: 'แจ้งเตือน: กรุณาชำระค่าหอภายในวันที่ 5 ของเดือน',
    dormId,
    roomId: null,
    userId: ownerId
  });
  messageModel.createMessage({
    body: 'รับทราบครับ เดี๋ยวชำระและส่งสลิปให้ในแชท',
    dormId,
    roomId: room101,
    userId: tenant101
  });
  messageModel.createMessage({
    body: 'ขอบคุณค่ะ',
    dormId,
    roomId: room102,
    userId: tenant102
  });

  activityModel.logActivity(dormId, ownerId, 'Seed demo data', 'สร้างข้อมูลตัวอย่างสำหรับการสาธิต');
});

console.log('Seed completed.');
console.log('Dorm code: dormease');
console.log('Owner login: owner / Owner@12345');
console.log('Tenant login: tenant101 / Tenant@123');
console.log('Tenant register code: tenant2026');
