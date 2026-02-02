require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkUser() {
    console.log('Checking for user: csgoshop@admin.com');
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'csgoshop@admin.com');

    if (error) {
        console.error('Error fetching user:', error);
    } else {
        console.log('User found:', data);
    }
}

checkUser();
