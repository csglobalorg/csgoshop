const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://sdbgeuyzepwnxpresktm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkYmdldXl6ZXB3bnhwcmVza3RtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ2NDg0OSwiZXhwIjoyMDkxMDQwODQ5fQ.kY_Z73e44V3K6aW3yE7O8L1zZtJ1wT13m_J6r9f_k_Q';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Fetching products...');
    const res = await fetch('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products');
    const data = await res.json();
    const products = data.products;
    const error = null;
    if (!products) { console.error('Error fetching products'); return; }

    const catMap = new Map();

    products.forEach(p => {
        if (!p.category) return;
        const c = p.category.trim();
        if (!catMap.has(c)) catMap.set(c, { subs: new Map() });
        
        if (p.subcategory) {
            const sc = p.subcategory.trim();
            if (!catMap.get(c).subs.has(sc)) catMap.get(c).subs.set(sc, new Set());
            
            if (p.sub_subcategory) {
                catMap.get(c).subs.get(sc).add(p.sub_subcategory.trim());
            }
        }
    });

    console.log(`Found ${catMap.size} root categories.`);
    
    for (const [catName, catData] of catMap.entries()) {
        let { data: cat1 } = await supabase.from('categories').select('id').eq('name', catName).eq('level', 1).single();
        if (!cat1) {
            const { data: newCat1, error: err1 } = await supabase.from('categories').insert({ name: catName, level: 1 }).select('id').single();
            if (err1) { console.error('Error inserting L1:', err1); continue; }
            cat1 = newCat1;
            console.log('Inserted L1:', catName);
        }

        for (const [subName, subsubs] of catData.subs.entries()) {
            let { data: cat2 } = await supabase.from('categories').select('id').eq('name', subName).eq('level', 2).eq('parent_id', cat1.id).single();
            if (!cat2) {
                const { data: newCat2, error: err2 } = await supabase.from('categories').insert({ name: subName, level: 2, parent_id: cat1.id }).select('id').single();
                if (err2) { console.error('Error inserting L2:', err2); continue; }
                cat2 = newCat2;
                console.log('  Inserted L2:', subName);
            }

            for (const subsubName of subsubs) {
                let { data: cat3 } = await supabase.from('categories').select('id').eq('name', subsubName).eq('level', 3).eq('parent_id', cat2.id).single();
                if (!cat3) {
                    await supabase.from('categories').insert({ name: subsubName, level: 3, parent_id: cat2.id });
                    console.log('    Inserted L3:', subsubName);
                }
            }
        }
    }
    console.log('Done!');
}
run();
