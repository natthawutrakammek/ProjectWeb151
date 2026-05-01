const Router = require('./core/router');
const AuthController = require('./controllers/AuthController');
const ChatController = require('./controllers/ChatController');
const OwnerController = require('./controllers/OwnerController');
const TenantController = require('./controllers/TenantController');
const { requireAuth, requireRole } = require('./middleware/auth');

const router = new Router();

router.get('/', AuthController.home);
router.get('/login', AuthController.showLogin);
router.post('/login', AuthController.login);
router.get('/logout', AuthController.logout);
router.get('/setup', AuthController.showSetup);
router.post('/setup', AuthController.setup);
router.get('/register', AuthController.showRegister);
router.post('/register', AuthController.register);

router.get('/owner/dashboard', requireRole('owner'), OwnerController.ownerDashboard);
router.get('/owner/rooms', requireRole('owner'), OwnerController.showRooms);
router.post('/owner/rooms', requireRole('owner'), OwnerController.createRoom);
router.post('/owner/rooms/:id', requireRole('owner'), OwnerController.updateRoom);
router.post('/owner/rooms/:id/delete', requireRole('owner'), OwnerController.deleteRoom);

router.get('/owner/charges', requireRole('owner'), OwnerController.showCharges);
router.post('/owner/charges', requireRole('owner'), OwnerController.createCharge);
router.post('/owner/charges/:id', requireRole('owner'), OwnerController.updateCharge);
router.post('/owner/charges/:id/delete', requireRole('owner'), OwnerController.deleteCharge);

router.get('/owner/bills', requireRole('owner'), OwnerController.showBills);
router.post('/owner/bills', requireRole('owner'), OwnerController.createBill);
router.get('/owner/bills/:id/edit', requireRole('owner'), OwnerController.editBill);
router.post('/owner/bills/:id', requireRole('owner'), OwnerController.updateBill);
router.post('/owner/bills/:id/status', requireRole('owner'), OwnerController.updateBillStatus);
router.post('/owner/bills/:id/delete', requireRole('owner'), OwnerController.deleteBill);

router.get('/owner/settings', requireRole('owner'), OwnerController.showSettings);
router.post('/owner/settings', requireRole('owner'), OwnerController.updateSettings);

router.get('/tenant/dashboard', requireRole('tenant'), TenantController.tenantDashboard);
router.get('/tenant/bills', requireRole('tenant'), TenantController.tenantBills);

router.get('/chat', requireAuth, ChatController.showChat);
router.post('/chat', requireAuth, ChatController.sendMessage);

module.exports = router;
