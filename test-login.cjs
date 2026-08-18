async function test() {
    const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'login', phone: '0123456789', password: 'test' })
    });
    console.log(await res.text());
}
test();
