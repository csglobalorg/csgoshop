import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const { data: products, error } = await supabase.from('products').select('category, subcategory');
  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  const catMap = new Map();

  products.forEach(p => {
      if (!p.category) return;
      const c = p.category.trim();
      if (!catMap.has(c)) catMap.set(c, new Set());
      
      if (p.subcategory) {
          catMap.get(c).add(p.subcategory.trim());
      }
  });

  const logs = [];
  for (const [catName, subcategories] of catMap.entries()) {
      let { data: cat1 } = await supabase.from('categories').select('id').eq('name', catName).eq('level', 1).single();
      if (!cat1) {
          const { data: newCat1 } = await supabase.from('categories').insert({ name: catName, level: 1 }).select('id').single();
          cat1 = newCat1;
          logs.push('Inserted L1: ' + catName);
      }

      for (const subName of subcategories) {
          let { data: cat2 } = await supabase.from('categories').select('id').eq('name', subName).eq('level', 2).eq('parent_id', cat1.id).single();
          if (!cat2) {
              const { data: newCat2 } = await supabase.from('categories').insert({ name: subName, level: 2, parent_id: cat1.id }).select('id').single();
              cat2 = newCat2;
              logs.push('Inserted L2: ' + subName);
          }
      }
  }

  return new Response(JSON.stringify({ message: 'Categories extracted', logs }), { headers: { 'Content-Type': 'application/json' } });
})
