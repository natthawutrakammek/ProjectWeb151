const { supabase } = require('../core/database');

const chargeModel = require('./chargeModel');
const roomModel = require('./roomModel');
const settingsModel = require('./settingsModel');

function calculateBill(room, settings, charges, electricUnits, waterUnits) {
  const electricityRate = Number(settings.electricity_rate || 0) + Number(settings.electricity_meter_rate || 0);
  const electricityMinFee = Number(settings.electricity_min_fee || 0);
  const waterRate = Number(settings.water_rate || 0) + Number(settings.water_meter_rate || 0);
  const waterMinFee = Number(settings.water_min_fee || 0);

  const electricTotal = Math.max(electricUnits * electricityRate, electricityMinFee);
  const waterTotal = Math.max(waterUnits * waterRate, waterMinFee);
  const extraTotal = charges.reduce((sum, charge) => sum + Number(charge.amount || 0), 0);
  const rentPrice = Number(room.rent_price || 0);

  return {
    electricTotal,
    extraTotal,
    grandTotal: rentPrice + electricTotal + waterTotal + extraTotal,
    rentPrice,
    waterTotal
  };
}

async function upsertBill({ dormId, roomId, billingMonth, electricUnits, waterUnits, note, paidStatus, createdBy }) {
  
  const room = await roomModel.findById(roomId, dormId);
  if (!room) throw new Error('ไม่พบห้องพัก');

  const charges = await chargeModel.activeCharges(dormId);
  const settings = await settingsModel.getSettings(dormId);
  const totals = calculateBill(room, settings, charges, electricUnits, waterUnits);

  // เช็กว่ามีบิลเดือนนี้ของห้องนี้หรือยัง
  const { data: existing } = await supabase
    .from('bills')
    .select('id')
    .eq('dorm_id', dormId)
    .eq('room_id', roomId)
    .eq('billing_month', billingMonth)
    .single();

  let billId;

  if (existing) {
    billId = existing.id;
    // อัปเดตบิลเดิม
    await supabase.from('bills').update({
      electric_units: electricUnits,
      water_units: waterUnits,
      electric_total: totals.electricTotal,
      water_total: totals.waterTotal,
      rent_price: totals.rentPrice,
      extra_total: totals.extraTotal,
      grand_total: totals.grandTotal,
      paid_status: paidStatus,
      note: note,
      created_by: createdBy,
      updated_at: new Date().toISOString()
    }).eq('id', billId).eq('dorm_id', dormId);

    // ลบรายการชาร์จเดิมทิ้ง
    await supabase.from('bill_charges').delete().eq('bill_id', billId);
  } else {
    // สร้างบิลใหม่
    const { data: inserted, error } = await supabase.from('bills').insert([{
      dorm_id: dormId,
      room_id: roomId,
      billing_month: billingMonth,
      electric_units: electricUnits,
      water_units: waterUnits,
      electric_total: totals.electricTotal,
      water_total: totals.waterTotal,
      rent_price: totals.rentPrice,
      extra_total: totals.extraTotal,
      grand_total: totals.grandTotal,
      paid_status: paidStatus,
      note: note,
      created_by: createdBy
    }]).select().single();
    
    if (error) throw error;
    billId = inserted.id;
  }

  // เพิ่มรายการชาร์จใหม่
  if (charges && charges.length > 0) {
    const chargeInserts = charges.map(charge => ({
      bill_id: billId,
      charge_name: charge.name,
      amount: Number(charge.amount || 0)
    }));
    await supabase.from('bill_charges').insert(chargeInserts);
  }

  await pruneOldMonths(dormId);
  return billId;
}

async function updateBill(id, { dormId, roomId, billingMonth, electricUnits, waterUnits, note, paidStatus, createdBy }) {
  const current = await findById(id, dormId);
  if (!current) throw new Error('ไม่พบบิลที่ต้องการแก้ไข');

  const room = await roomModel.findById(roomId, dormId);
  if (!room) throw new Error('ไม่พบห้องพัก');

  const charges = await chargeModel.activeCharges(dormId);
  const settings = await settingsModel.getSettings(dormId);
  const totals = calculateBill(room, settings, charges, electricUnits, waterUnits);

  await supabase.from('bills').update({
    room_id: roomId,
    billing_month: billingMonth,
    electric_units: electricUnits,
    water_units: waterUnits,
    electric_total: totals.electricTotal,
    water_total: totals.waterTotal,
    rent_price: totals.rentPrice,
    extra_total: totals.extraTotal,
    grand_total: totals.grandTotal,
    paid_status: paidStatus,
    note: note,
    created_by: createdBy,
    updated_at: new Date().toISOString()
  }).eq('id', id).eq('dorm_id', dormId);

  await supabase.from('bill_charges').delete().eq('bill_id', id);

  if (charges && charges.length > 0) {
    const chargeInserts = charges.map(charge => ({
      bill_id: id,
      charge_name: charge.name,
      amount: Number(charge.amount || 0)
    }));
    await supabase.from('bill_charges').insert(chargeInserts);
  }

  await pruneOldMonths(dormId);
  return id;
}

async function pruneOldMonths(dormId) {
  // ดึงเดือนทั้งหมดมาเพื่อหาเดือนที่เก่าเกิน 14 เดือน
  const { data } = await supabase
    .from('bills')
    .select('billing_month')
    .eq('dorm_id', dormId);

  if (!data || data.length === 0) return;

  const uniqueMonths = [...new Set(data.map(b => b.billing_month))];
  uniqueMonths.sort((a, b) => b.localeCompare(a)); // เรียงใหม่ไปเก่า
  
  const keepMonths = uniqueMonths.slice(0, 14);

  if (keepMonths.length > 0) {
    await supabase
      .from('bills')
      .delete()
      .eq('dorm_id', dormId)
      .not('billing_month', 'in', `(${keepMonths.join(',')})`);
  }
}

async function listBills(dormId, filters = {}) {
  let query = supabase
    .from('bills')
    .select(`
      *,
      rooms ( room_number, users ( display_name, role ) )
    `)
    .eq('dorm_id', dormId)
    .order('billing_month', { ascending: false });

  if (filters.month) query = query.eq('billing_month', filters.month);
  if (filters.status) query = query.eq('paid_status', filters.status);

  const { data, error } = await query;
  if (error) throw error;

  let formatted = data.map(b => {
    const tenant = b.rooms?.users?.find(u => u.role === 'tenant');
    return {
      ...b,
      room_number: b.rooms?.room_number || null,
      tenant_name: tenant ? tenant.display_name : null,
      rooms: undefined
    };
  });

  if (filters.search && filters.search.trim() !== '') {
    const keyword = filters.search.trim().toLowerCase();
    formatted = formatted.filter(b => 
      (b.room_number && b.room_number.toLowerCase().includes(keyword)) ||
      (b.tenant_name && b.tenant_name.toLowerCase().includes(keyword))
    );
  }

  // เรียงลำดับหมายเลขห้องเพิ่มเติม
  return formatted.sort((a, b) => {
    if (a.billing_month !== b.billing_month) return 0; // ปล่อยให้เรียงตามเดือนไปก่อน
    return (a.room_number || '').localeCompare(b.room_number || '');
  });
}

async function listMonths(dormId) {
  const { data } = await supabase
    .from('bills')
    .select('billing_month')
    .eq('dorm_id', dormId);

  if (!data) return [];
  const uniqueMonths = [...new Set(data.map(b => b.billing_month))];
  return uniqueMonths.sort((a, b) => b.localeCompare(a)).slice(0, 14).map(m => ({ billing_month: m }));
}

async function findById(id, dormId = null) {
  let query = supabase
    .from('bills')
    .select(`
      *,
      rooms ( room_number, floor, users ( display_name, role ) ),
      bill_charges ( * )
    `)
    .eq('id', id);

  if (dormId) query = query.eq('dorm_id', dormId);

  const { data, error } = await query.single();
  if (error || !data) return null;

  const tenant = data.rooms?.users?.find(u => u.role === 'tenant');
  
  return {
    ...data,
    room_number: data.rooms?.room_number || null,
    floor: data.rooms?.floor || null,
    tenant_name: tenant ? tenant.display_name : null,
    charges: data.bill_charges || [],
    rooms: undefined,
    bill_charges: undefined
  };
}

async function deleteBill(id, dormId) {
  await supabase.from('bills').delete().eq('id', id).eq('dorm_id', dormId);
}

async function updateStatus(id, dormId, paidStatus) {
  await supabase
    .from('bills')
    .update({ 
      paid_status: paidStatus, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', id)
    .eq('dorm_id', dormId);
}

async function tenantBills(userId, dormId, month = '') {
  // หา room_id ของ tenant ก่อน
  const { data: user } = await supabase.from('users').select('room_id').eq('id', userId).single();
  if (!user || !user.room_id) return [];

  let query = supabase
    .from('bills')
    .select('*, rooms ( room_number )')
    .eq('dorm_id', dormId)
    .eq('room_id', user.room_id)
    .order('billing_month', { ascending: false })
    .limit(14);

  if (month) query = query.eq('billing_month', month);

  const { data } = await query;
  return (data || []).map(b => ({
    ...b,
    room_number: b.rooms?.room_number || null,
    rooms: undefined
  }));
}

async function latestTenantBill(userId, dormId) {
  const bills = await tenantBills(userId, dormId);
  return bills.length > 0 ? bills[0] : null;
}

async function monthlySummary(dormId, month = '') {
  let query = supabase.from('bills').select('*').eq('dorm_id', dormId);
  if (month) query = query.eq('billing_month', month);

  const { data } = await query;
  if (!data) return { bill_count: 0, electricity_total: 0, water_total: 0, extra_total: 0, grand_total: 0, unpaid_count: 0 };

  return data.reduce((acc, bill) => {
    acc.bill_count += 1;
    acc.electricity_total += Number(bill.electric_total || 0);
    acc.water_total += Number(bill.water_total || 0);
    acc.extra_total += Number(bill.extra_total || 0);
    acc.grand_total += Number(bill.grand_total || 0);
    if (bill.paid_status === 'unpaid') acc.unpaid_count += 1;
    return acc;
  }, { bill_count: 0, electricity_total: 0, water_total: 0, extra_total: 0, grand_total: 0, unpaid_count: 0 });
}

module.exports = {
  deleteBill,
  findById,
  latestTenantBill,
  listBills,
  listMonths,
  monthlySummary,
  tenantBills,
  updateBill,
  updateStatus,
  upsertBill
};