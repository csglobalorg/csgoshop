async function test() {
    const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'login', phone: '01865913916', password: '123' })
    });
    console.log(await res.text());
}
test();
