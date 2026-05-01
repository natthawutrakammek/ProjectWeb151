const { supabase } = require('../core/database');

async function listCharges(dormId) {
  const { data, error } = await supabase
    .from('charges')
    .select('*')
    .eq('dorm_id', dormId)
    // เรียงตาม is_active จากมากไปน้อย (1 ขึ้นก่อน 0) แล้วค่อยเรียงตามชื่อ
    .order('is_active', { ascending: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function activeCharges(dormId) {
  const { data, error } = await supabase
    .from('charges')
    .select('*')
    .eq('dorm_id', dormId)
    .eq('is_active', 1) // ดึงเฉพาะที่ยังเปิดใช้งาน
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function findById(id, dormId = null) {
  let query = supabase.from('charges').select('*').eq('id', id);

  if (dormId) {
    query = query.eq('dorm_id', dormId); // ถ้ามี dormId ให้เช็กควบคู่ไปด้วย
  }

  const { data, error } = await query.single();
  
  if (error || !data) return null;
  return data;
}

async function createCharge({ dormId, name, amount, isActive }) {
  const { data, error } = await supabase
    .from('charges')
    .insert([{
      dorm_id: dormId,
      name: name,
      amount: amount,
      is_active: isActive ? 1 : 0 // แปลง Boolean เป็น 1 หรือ 0
    }])
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

async function updateCharge(id, dormId, { name, amount, isActive }) {
  const { error } = await supabase
    .from('charges')
    .update({
      name: name,
      amount: amount,
      is_active: isActive ? 1 : 0 // แปลง Boolean เป็น 1 หรือ 0
    })
    .eq('id', id)
    .eq('dorm_id', dormId);

  if (error) throw error;
}

async function deleteCharge(id, dormId) {
  const { error } = await supabase
    .from('charges')
    .delete()
    .eq('id', id)
    .eq('dorm_id', dormId);

  if (error) throw error;
}

module.exports = {
  activeCharges,
  createCharge,
  deleteCharge,
  findById,
  listCharges,
  updateCharge
};