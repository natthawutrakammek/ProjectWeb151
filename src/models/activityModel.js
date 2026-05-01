const { supabase } = require('../core/database');

async function logActivity(dormId, userId, action, details = '') {
  const { error } = await supabase
    .from('activity_logs')
    .insert([
      {
        dorm_id: dormId,
        user_id: userId ?? null,
        action: action,
        details: details
      }
    ]);

  if (error) throw error;
}

async function recentActivities(dormId, limit = 8) {
  const { data, error } = await supabase
    .from('activity_logs')
    .select(`
      *,
      users ( display_name )
    `)
    .eq('dorm_id', dormId)
    // เรียงลำดับจากใหม่ไปเก่า (DESC)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data.map(log => ({
    ...log,
    display_name: log.users?.display_name || null,
    users: undefined
  }));
}

module.exports = {
  logActivity,
  recentActivities
};
