const { supabase } = require('../core/database');

async function listMessagesForOwner(dormId, roomId = '') {
  let query = supabase
    .from('messages')
    .select(`
      *,
      users ( display_name, role ),
      rooms ( room_number )
    `)
    .eq('dorm_id', dormId)
    .order('created_at', { ascending: true }) 
    .order('id', { ascending: true }); 

  if (roomId) {
    query = query.or(`room_id.is.null,room_id.eq.${roomId}`);
  } else {
    query = query.limit(200);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(m => ({
    ...m,
    display_name: m.users?.display_name || null,
    role: m.users?.role || null,
    room_number: m.rooms?.room_number || null,
    users: undefined,
    rooms: undefined
  }));
}

async function listMessagesForTenant(user) {
  const roomIdToQuery = user.room_id ?? -1;
  
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      users ( display_name, role ),
      rooms ( room_number )
    `)
    .eq('dorm_id', user.dorm_id)
    .or(`room_id.is.null,room_id.eq.${roomIdToQuery}`)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(200);

  if (error) throw error;

  return data.map(m => ({
    ...m,
    display_name: m.users?.display_name || null,
    role: m.users?.role || null,
    room_number: m.rooms?.room_number || null,
    users: undefined,
    rooms: undefined
  }));
}

async function createMessage({ dormId, userId, roomId, body }) {
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      dorm_id: dormId,
      user_id: userId,
      room_id: roomId || null,
      body: body
    }])
    .select()
    .single();

  if (error) throw error;
  return data.id; 
}

module.exports = {
  createMessage,
  listMessagesForOwner,
  listMessagesForTenant
};