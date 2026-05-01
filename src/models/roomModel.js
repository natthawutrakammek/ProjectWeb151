const { supabase } = require('../core/database');

async function listRooms(dormId, search = '') {
  // ดึงข้อมูลห้อง ผู้เช่า และบิลทั้งหมดของห้องนั้นมา
  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      users ( id, display_name, username, role ),
      bills ( id )
    `)
    .eq('dorm_id', dormId);

  if (error) throw error;

  let formatted = data.map(r => {
    const tenant = r.users?.find(u => u.role === 'tenant');
    return {
      ...r,
      tenant_id: tenant ? tenant.id : null,
      tenant_name: tenant ? tenant.display_name : null,
      tenant_username: tenant ? tenant.username : null,
      bill_count: r.bills ? r.bills.length : 0,
      users: undefined,
      bills: undefined
    };
  });

  if (search.trim() !== '') {
    const keyword = search.trim().toLowerCase();
    formatted = formatted.filter(r => 
      (r.room_number && r.room_number.toLowerCase().includes(keyword)) ||
      (r.floor && r.floor.toLowerCase().includes(keyword)) ||
      (r.status && r.status.toLowerCase().includes(keyword)) ||
      (r.tenant_name && r.tenant_name.toLowerCase().includes(keyword))
    );
  }

  // เรียงลำดับตามหมายเลขห้อง
  return formatted.sort((a, b) => {
    if (!a.room_number) return 1;
    if (!b.room_number) return -1;
    return a.room_number.localeCompare(b.room_number);
  });
}

async function listRoomsForSelect(dormId) {
  const { data, error } = await supabase
    .from('rooms')
    .select(`*, users ( display_name, role )`)
    .eq('dorm_id', dormId);

  if (error) throw error;

  const formatted = data.map(r => {
    const tenant = r.users?.find(u => u.role === 'tenant');
    return {
      ...r,
      tenant_name: tenant ? tenant.display_name : null,
      users: undefined
    };
  });

  return formatted.sort((a, b) => (a.room_number || '').localeCompare(b.room_number || ''));
}

async function findById(id, dormId = null) {
  let query = supabase
    .from('rooms')
    .select(`*, users ( id, display_name, username, role )`)
    .eq('id', id);

  if (dormId) {
    query = query.eq('dorm_id', dormId);
  }

  const { data, error } = await query.single();
  if (error || !data) return null;

  const tenant = data.users?.find(u => u.role === 'tenant');
  return {
    ...data,
    tenant_id: tenant ? tenant.id : null,
    tenant_name: tenant ? tenant.display_name : null,
    tenant_username: tenant ? tenant.username : null,
    users: undefined
  };
}

async function findByRoomNumber(dormId, roomNumber) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('dorm_id', dormId)
    .eq('room_number', roomNumber)
    .single();

  if (error || !data) return null;
  return data;
}

async function getTenantRoom(userId, dormId = null) {
  //หาข้อมูล user ก่อนว่าอยู่ห้องไหน
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('room_id')
    .eq('id', userId)
    .single();

  if (userError || !userData || !userData.room_id) return null;

  //เอาroom_idมาหาข้อมูลห้อง
  let roomQuery = supabase
    .from('rooms')
    .select('*')
    .eq('id', userData.room_id);

  if (dormId) {
    roomQuery = roomQuery.eq('dorm_id', dormId);
  }

  const { data: roomData, error: roomError } = await roomQuery.single();
  if (roomError || !roomData) return null;
  return roomData;
}

async function createRoom({ dormId, roomNumber, floor, rentPrice, status, note }) {
  const { data, error } = await supabase
    .from('rooms')
    .insert([{
      dorm_id: dormId,
      room_number: roomNumber,
      floor: floor,
      rent_price: rentPrice,
      status: status,
      note: note
    }])
    .select()
    .single();

  if (error) throw error;
  return data.id; // คืนค่าไอดีของห้องที่เพิ่งสร้าง
}

async function updateRoom(id, dormId, { roomNumber, floor, rentPrice, status, note }) {
  const { error } = await supabase
    .from('rooms')
    .update({
      room_number: roomNumber,
      floor: floor,
      rent_price: rentPrice,
      status: status,
      note: note
    })
    .eq('id', id)
    .eq('dorm_id', dormId);

  if (error) throw error;
}

async function deleteRoom(id, dormId) {
  const { error } = await supabase
    .from('rooms')
    .delete()
    .eq('id', id)
    .eq('dorm_id', dormId);

  if (error) throw error;
}

async function dashboardStats(dormId) {
  
  const { data, error } = await supabase
    .from('rooms')
    .select('status')
    .eq('dorm_id', dormId);

  if (error) throw error;

  let occupied_count = 0;
  let vacant_count = 0;
  let maintenance_count = 0;

  data.forEach(room => {
    if (room.status === 'occupied') occupied_count++;
    else if (room.status === 'vacant') vacant_count++;
    else if (room.status === 'maintenance') maintenance_count++;
  });

  return {
    room_count: data.length,
    occupied_count,
    vacant_count,
    maintenance_count
  };
}

module.exports = {
  createRoom,
  dashboardStats,
  deleteRoom,
  findById,
  findByRoomNumber,
  getTenantRoom,
  listRooms,
  listRoomsForSelect,
  updateRoom
};