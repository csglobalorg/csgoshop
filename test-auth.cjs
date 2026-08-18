async function test() {
    const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            type: 'register', 
            phone: '01999999999', 
            password: 'testpassword',
            name: 'Test User',
            username: 'testuser'
        })
    });
    console.log("Register:", await res.text());
    
    const res2 = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            type: 'login', 
            phone: '01999999999', 
            password: 'testpassword'
        })
    });
    console.log("Login (phone):", await res2.text());
}
test();
