async function test() {
    try {
        const response = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/inspect-users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("Status:", response.status);
        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
