const { supabase } = require('../core/database');

async function hasOwner() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'owner');
    
  if (error) throw error;
  return count > 0;
}

async function createUser({ dormId, username, displayName, role, passwordHash, roomId = null }) {
  const {data, error} = await supabase
    .from('users')
    .insert([
      {
        dorm_id: dormId,
        username: username,
        display_name: displayName, 
        role: role, 
        password_hash: passwordHash, 
        room_id: roomId
      }
    ])
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

async function findByUsername(dormId, username) {
  const { data, error } = await supabase
  .from('users')
  .select(`
    *,
    rooms ( room_number ),
    dorms ( dorm_name, dorm_code, brand_image_path )
  `)
  .eq('dorm_id', dormId)
  .eq('username', username)
  .single();
  
  if (error || !data) return null;
  return {
    ...data,
    room_number: data.rooms?.room_number || null,
    dorm_name: data.dorms?.dorm_name || null,
    dorm_code: data.dorms?.dorm_code || null,
    brand_image_path: data.dorms?.brand_image_path || null,
    rooms: undefined,
    dorms: undefined
  };
}

async function findById(id) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      rooms ( room_number ),
      dorms ( dorm_name, dorm_code, brand_image_path )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    room_number: data.rooms?.room_number || null,
    dorm_name: data.dorms?.dorm_name || null,
    dorm_code: data.dorms?.dorm_code || null,
    brand_image_path: data.dorms?.brand_image_path || null,
    rooms: undefined,
    dorms: undefined
  };
}

async function listTenants(dormId) {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, 
      username, 
      display_name, 
      room_id,
      rooms ( room_number )
    `)
    .eq('dorm_id', dormId)
    .eq('role', 'tenant')
    // การเรียงลำดับในSupabaseไม่สามารถเรียงตามตาราง(rooms)ได้โดยตรงจึงต้องใช้JavaScriptsort()หลังจากดึงข้อมูลมาแล้ว
    .order('display_name', { ascending: true });

  if (error) throw error;

  // แปลงหน้าตาข้อมูลและเรียงลำดับตามroom_number
  const formattedData = data.map(user => ({
    ...user,
    room_number: user.rooms?.room_number || null,
    rooms: undefined
  }));

  // เรียงลำดับตามหมายเลขห้อง
  return formattedData.sort((a, b) => {
    if (a.room_number === b.room_number) return 0;
    if (a.room_number === null) return 1;
    if (b.room_number === null) return -1;
    return a.room_number.localeCompare(b.room_number);
  });
}

async function updatePassword(userId, passwordHash) {
  const { error } = await supabase
    .from('users')
    .update({ password_hash: passwordHash })
    .eq('id', userId);
    
  if (error) throw error;
}

async function assignRoom(userId, roomId) {
  const { error } = await supabase
    .from('users')
    .update({ room_id: roomId })
    .eq('id', userId);
    
  if (error) throw error;
}

module.exports = {
  assignRoom,
  createUser,
  findById,
  findByUsername,
  hasOwner,
  listTenants,
  updatePassword
};
