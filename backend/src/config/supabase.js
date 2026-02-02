const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Use mock if real credentials missing
if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Using mock Supabase - real credentials not configured');
  const mockSupabase = require('./supabase-mock');
  module.exports = mockSupabase;
} else {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    module.exports = supabase;
  } catch (error) {
    console.warn('⚠️  Failed to connect to Supabase, using mock:', error.message);
    const mockSupabase = require('./supabase-mock');
    module.exports = mockSupabase;
  }
}
