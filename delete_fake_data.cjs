const fs = require('fs');

async function deleteFakeData() {
    const data = JSON.parse(fs.readFileSync('backup_products.json', 'utf8'));
    const csvProducts = data.filter(p => p.id && String(p.id).startsWith('CSV'));
    
    console.log(`Found ${csvProducts.length} CSV products to delete.`);
    
    const BATCH_SIZE = 50;
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < csvProducts.length; i += BATCH_SIZE) {
        const batch = csvProducts.slice(i, i + BATCH_SIZE);
        
        const promises = batch.map(async (p) => {
            try {
                const response = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'delete_product',
                        auth: { phone: '01873827520', password: 'f6f8y6d9' },
                        productId: p.id
                    })
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to delete ${p.id}: ${response.status}`);
                }
            } catch (e) {
                failCount++;
                console.error(`Error deleting ${p.id}:`, e.message);
            }
        });
        
        await Promise.all(promises);
        console.log(`Processed ${Math.min(i + BATCH_SIZE, csvProducts.length)} / ${csvProducts.length}...`);
    }
    
    console.log(`Finished! Successfully deleted: ${successCount}. Failed: ${failCount}.`);
}

deleteFakeData();
