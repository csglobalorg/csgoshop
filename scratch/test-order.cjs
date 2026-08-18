async function test() {
    const orderData = {
        name: "Test Customer",
        phone: "01711111111",
        address: "Dhaka, Bangladesh",
        deliveryArea: "Inside Dhaka",
        subtotal: 1000,
        deliveryCharge: 60,
        total: 1060,
        paymentMethod: "cod",
        senderPhone: "",
        trxId: "",
        products: [
            {
                id: "CSV-26863",
                name: "Premium Drop Shoulder T-Shirt",
                price: 600,
                quantity: 1,
                variants: { Size: "L" }
            }
        ]
    };

    console.log("Submitting order...");
    const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.text());
}
test();
