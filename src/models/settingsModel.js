const { supabase } = require('../core/database');
const { hashSecret, verifySecret } = require('../utils/security');

const NUMERIC_FIELDS = [
  'electricity_rate',
  'electricity_meter_rate',
  'electricity_min_fee',
  'water_rate',
  'water_meter_rate',
  'water_min_fee'
];

const DEFAULT_PUBLIC_SETTINGS = {
  brand_image_path: '',
  contact_details: '',
  dorm_code: '',
  dorm_name: 'DormEase Cloud',
  electricity_meter_rate: 0,
  electricity_min_fee: 0,
  electricity_rate: 8,
  payment_details: '',
  tenant_join_code_hash: '',
  water_meter_rate: 0,
  water_min_fee: 0,
  water_rate: 18
};

function normalizeDorm(row) {
  if (!row) {
    return { ...DEFAULT_PUBLIC_SETTINGS };
  }

  const normalized = {
    ...DEFAULT_PUBLIC_SETTINGS,
    ...row
  };

  for (const field of NUMERIC_FIELDS) {
    normalized[field] = Number(normalized[field] || 0);
  }

  return normalized;
}

function normalizeDormCode(code) {
  return String(code ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function hasAnyDorm() {
  const { count, error } = await supabase
    .from('dorms')
    .select('*', { count: 'exact', head: true });
    
  if (error) throw error;
  return count > 0;
}

async function findDormById(id) {
  const { data, error } = await supabase
    .from('dorms')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error || !data) return null;
  return normalizeDorm(data);
}

async function findDormByCode(dormCode) {
  const normalizedCode = normalizeDormCode(dormCode);
  const { data, error } = await supabase
    .from('dorms')
    .select('*')
    .eq('dorm_code', normalizedCode)
    .single();
    
  if (error || !data) return null;
  return normalizeDorm(data);
}

async function getSettings(dormId = null) {
  if (!dormId) {
    return { ...DEFAULT_PUBLIC_SETTINGS };
  }

  const dorm = await findDormById(dormId);
  return dorm || { ...DEFAULT_PUBLIC_SETTINGS };
}

async function createDorm({
  dormCode,
  dormName,
  electricityMeterRate = 0,
  electricityMinFee = 0,
  electricityRate = 8,
  paymentDetails = '',
  tenantJoinCodeHash = '',
  contactDetails = '',
  brandImagePath = '',
  waterMeterRate = 0,
  waterMinFee = 0,
  waterRate = 18
}) {
  const { data, error } = await supabase
    .from('dorms')
    .insert([{
      dorm_code: normalizeDormCode(dormCode),
      dorm_name: dormName,
      brand_image_path: brandImagePath,
      electricity_rate: electricityRate,
      electricity_meter_rate: electricityMeterRate,
      electricity_min_fee: electricityMinFee,
      water_rate: waterRate,
      water_meter_rate: waterMeterRate,
      water_min_fee: waterMinFee,
      contact_details: contactDetails,
      payment_details: paymentDetails,
      tenant_join_code_hash: tenantJoinCodeHash
    }])
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

async function updateSettings(dormId, values) {
  const current = await findDormById(dormId);
  if (!current) {
    throw new Error('ไม่พบหอพักที่ต้องการตั้งค่า');
  }

  const next = {
    ...current,
    ...values
  };

  const { error } = await supabase
    .from('dorms')
    .update({
      dorm_name: next.dorm_name,
      brand_image_path: next.brand_image_path || '',
      electricity_rate: Number(next.electricity_rate || 0),
      electricity_meter_rate: Number(next.electricity_meter_rate || 0),
      electricity_min_fee: Number(next.electricity_min_fee || 0),
      water_rate: Number(next.water_rate || 0),
      water_meter_rate: Number(next.water_meter_rate || 0),
      water_min_fee: Number(next.water_min_fee || 0),
      contact_details: next.contact_details || '',
      payment_details: next.payment_details || ''
    })
    .eq('id', dormId);

  if (error) throw error;
}

async function setTenantJoinCode(dormId, code) {
  const { error } = await supabase
    .from('dorms')
    .update({ tenant_join_code_hash: hashSecret(code) })
    .eq('id', dormId);
    
  if (error) throw error;
}

async function verifyTenantJoinCode(dormId, code) {
  const { data, error } = await supabase
    .from('dorms')
    .select('tenant_join_code_hash')
    .eq('id', dormId)
    .single();

  if (error || !data) return false;
  return Boolean(data.tenant_join_code_hash) && verifySecret(code, data.tenant_join_code_hash);
}

module.exports = {
  createDorm,
  findDormByCode,
  findDormById,
  getSettings,
  hasAnyDorm,
  normalizeDormCode,
  setTenantJoinCode,
  updateSettings,
  verifyTenantJoinCode
};