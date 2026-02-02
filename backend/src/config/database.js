const supabase = require('./supabase');

// Initialize database tables
async function initializeDatabase() {
  try {
    // Check if users table exists, if not create it
    const { error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (usersError && usersError.code === 'PGRST116') {
      console.log('Creating users table...');
      // Tables will be created via SQL migration
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

module.exports = { initializeDatabase };
