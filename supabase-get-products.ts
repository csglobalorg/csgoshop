import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const debug: any = { merrono_count: 0, mohasagor_count: 0, custom_count: 0, merrono_pages_fetched: 0, total_time: 0 };
  const startTime = Date.now();
  
  // ═══ Category Normalization ═══
    const normalizeCategory = (cat: string): string => {
      if (!cat) return 'Others';
      const c = cat.trim().replace(/\s+/g, ' ').toLowerCase();
      if (c.includes('woman') || c.includes('women')) return "Women's Fashion";
      if (c.includes('men')) return "Men's Fashion";
      if (c.includes('gedget') || c.includes('gadget') || c.includes('electronic')) return 'Gadgets & Electronics';
      if (c.includes('home') || c.includes('lifestyle') || c === 'lifestyle') return 'Home & Lifestyle';
      if (c.includes('kid')) return 'Kids Zone';
      if (c.includes('gift') || c.includes('custom')) return 'Customize & Gift';
      if (c.includes('offer')) return 'Offer';
      if (c.includes('watch')) return 'Watch';
      if (c.includes('food')) return 'Foods';
      if (c.includes('winter')) return 'Winter';
      // Return with proper casing if no match
      return cat.trim().replace(/\s+/g, ' ');
    };

    // ═══ Smart Subcategory Inference ═══
    const inferSubcategory = (name: string, category: string): string | null => {
      if (!name) return null;
      const n = name.toLowerCase();
      // Men's Fashion
      if (category === "Men's Fashion") {
        if (n.includes('polo')) return 'Polo Shirt';
        if (n.includes('t-shirt') || n.includes('tshirt') || n.includes('t shirt') || n.includes('drop sholder') || n.includes('drop shoulder')) return 'T-Shirt';
        if (n.includes('panjabi') || n.includes('punjabi')) return 'Panjabi';
        if (n.includes('shirt')) return 'Shirt';
        if (n.includes('pant') || n.includes('trouser') || n.includes('jeans') || n.includes('jogger')) return 'Pants';
        if (n.includes('hoodie') || n.includes('jacket') || n.includes('sweater')) return 'Jacket & Hoodie';
        if (n.includes('shoe') || n.includes('sandal') || n.includes('sneaker') || n.includes('slipper') || n.includes('loafer')) return 'Footwear';
        if (n.includes('watch')) return 'Watch';
        if (n.includes('belt') || n.includes('wallet') || n.includes('cap') || n.includes('sunglass') || n.includes('bag')) return 'Accessories';
        if (n.includes('boxer') || n.includes('brief') || n.includes('underwear')) return 'Underwear';
      }
      // Women's Fashion
      if (category === "Women's Fashion") {
        if (n.includes('three piece') || n.includes('3 piece') || n.includes('3piece')) return 'Three Piece';
        if (n.includes('saree') || n.includes('shari') || n.includes('sari')) return 'Saree';
        if (n.includes('burka') || n.includes('borka') || n.includes('abaya')) return 'Borka';
        if (n.includes('kurti') || n.includes('kameez') || n.includes('salwar')) return 'Kurti & Salwar';
        if (n.includes('shoe') || n.includes('sandal') || n.includes('heel') || n.includes('flat')) return 'Footwear';
        if (n.includes('bag') || n.includes('purse') || n.includes('clutch')) return 'Bags';
        if (n.includes('jewel') || n.includes('necklace') || n.includes('earring') || n.includes('bangle') || n.includes('bracelet')) return 'Jewelry';
        if (n.includes('hijab') || n.includes('scarf') || n.includes('dupatta')) return 'Hijab & Scarf';
        if (n.includes('night') || n.includes('bra') || n.includes('inner')) return 'Innerwear';
      }
      // Gadgets & Electronics
      if (category === 'Gadgets & Electronics') {
        if (n.includes('headphone') || n.includes('earphone') || n.includes('earbuds') || n.includes('airpod') || n.includes('speaker') || n.includes('bluetooth')) return 'Audio';
        if (n.includes('charger') || n.includes('cable') || n.includes('power bank') || n.includes('adapter')) return 'Charger & Cable';
        if (n.includes('watch') || n.includes('smartwatch') || n.includes('smart watch') || n.includes('band')) return 'Smart Watch';
        if (n.includes('phone') || n.includes('mobile') || n.includes('case') || n.includes('cover') || n.includes('holder') || n.includes('screen')) return 'Phone Accessories';
        if (n.includes('fan') || n.includes('light') || n.includes('lamp') || n.includes('led') || n.includes('bulb')) return 'Lighting & Fan';
        if (n.includes('camera') || n.includes('tripod') || n.includes('mic') || n.includes('ring light')) return 'Camera & Accessories';
        if (n.includes('keyboard') || n.includes('mouse') || n.includes('pad')) return 'Computer Accessories';
      }
      // Home & Lifestyle
      if (category === 'Home & Lifestyle') {
        if (n.includes('bed') || n.includes('pillow') || n.includes('blanket') || n.includes('mattress') || n.includes('comforter')) return 'Bedding';
        if (n.includes('kitchen') || n.includes('cookware') || n.includes('pot') || n.includes('pan') || n.includes('blender') || n.includes('mixer')) return 'Kitchen';
        if (n.includes('decor') || n.includes('vase') || n.includes('frame') || n.includes('mirror') || n.includes('curtain') || n.includes('clock')) return 'Home Decor';
        if (n.includes('organizer') || n.includes('storage') || n.includes('basket') || n.includes('rack') || n.includes('shelf') || n.includes('box')) return 'Storage & Organizer';
        if (n.includes('toy') || n.includes('game') || n.includes('puzzle')) return 'Toys & Games';
        if (n.includes('bottle') || n.includes('flask') || n.includes('cup') || n.includes('glass')) return 'Bottle & Cup';
      }
      return null;
    };

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const standardHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    };

    // 1. Fetch Overrides and Settings in parallel
    const [overridesResult, settingsResult, customProductsResult] = await Promise.all([
      supabaseClient.from('product_overrides').select('*'),
      supabaseClient.from('site_settings').select('key, value'),
      supabaseClient.from('products').select('id, name, price, category, subcategory, thumbnail_img, image, details, status, product_variants, product_images, is_hidden, is_featured').order('id')
    ]);
    
    const { data: overrides } = overridesResult;
    const { data: settingsData } = settingsResult;
    const { data: allCustomProducts } = customProductsResult;
    
    const overrideMap = new Map();
    overrides?.forEach(ov => overrideMap.set(ov.source_id, ov));

    const settings: any = {};
    settingsData?.forEach(s => settings[s.key] = s.value);

    // Pricing Engine Helper
    const applySmartPricing = (basePrice: number, sourceId: string) => {
        const override = overrideMap.get(sourceId);
        
        // If hidden, return null
        if (override?.is_hidden) return null;

        let finalPrice = basePrice;
        let originalPrice = basePrice;

        if (override?.custom_price) {
            finalPrice = override.custom_price;
        } else {
            // Apply Smart Rules
            if (basePrice < 500) {
                finalPrice = basePrice + 80;
            } else if (basePrice <= 1500) {
                finalPrice = basePrice + 150;
            } else {
                finalPrice = basePrice * 1.10; // +10%
            }
        }

        return { 
            price: originalPrice, 
            sale_price: Math.round(finalPrice),
            is_featured: override?.is_featured || false
        };
    }

    const processMohasagorProduct = (p: any) => {
        const sourceId = "MH-" + p.id;
        const pricing = applySmartPricing(p.price, sourceId);
        if (!pricing) return null;
        
        const cat = normalizeCategory(p.category || '');
        const subcat = p.subcategory || p.sub_category || inferSubcategory(p.name || '', cat);
        
        return {
            id: sourceId,
            name: p.name,
            product_code: p.product_code,
            category: cat,
            subcategory: subcat,
            thumbnail_img: p.thumbnail_img,
            image: p.thumbnail_img,
            details: p.details ? p.details.substring(0, 1000) : '',
            status: p.status,
            product_variants: p.product_variants || [],
            product_images: p.product_images || [],
            provider: 'mohasagor',
            custom: false,
            ...pricing
        };
    };

    // 2. Process Custom Products from DB (CSV products) - already fetched
    let customProducts = [];
    try {
      if (allCustomProducts) {
        const mapped = allCustomProducts.map(p => {
            const sourceId = "CSV-" + p.id;
            const pricing = applySmartPricing(p.price, sourceId);
            if (!pricing) return null;
            const cat = normalizeCategory(p.category || '');
            const subcat = p.subcategory || inferSubcategory(p.name || '', cat);
            return { ...p, id: sourceId, category: cat, subcategory: subcat, ...pricing, custom: true };
        }).filter(p => p !== null);
        
        customProducts = mapped;
        debug.custom_count = customProducts.length;
      }
    } catch (e) { console.error("Error processing custom products:", e); }

    // 3. Fetch External APIs
    const mohasagorPage1Promise = fetch('https://mohasagor.com.bd/api/reseller/product?page=1', {
      headers: { ...standardHeaders, 'API-KEY': 'A8niclztH9JtzS4t', 'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8' }
    });

    let merronoProductsRaw = [];
    let merronoPage = 1;
    const merronoBatchSize = 25; 
    const merronoMaxPages = 250; // Increased limit for better coverage

    while (merronoPage <= merronoMaxPages) {
        const batchPromises = [];
        for (let i = 0; i < merronoBatchSize; i++) {
            const p = merronoPage + i;
            if (p > merronoMaxPages) break;
            batchPromises.push(
                fetch(`https://merrono.com/api/v1/products?page=${p}`, {
                    headers: { ...standardHeaders, 'API-KEY': '07d5LhLeSvvIZyxLgQ5cACJOHDI1iPEX', 'SECRET-KEY': 'EeCcdF3CvaSMNkNcAL2ohIZb8wJSyH8h3eYf3E6LtAXCiHYPAB86yZ0wgiyZgHcw' }
                })
            );
        }

        const results = await Promise.allSettled(batchPromises);
        let productsInBatch = 0;

        for (const res of results) {
            if (res.status === 'fulfilled' && res.value.ok) {
                try {
                    const mrData = await res.value.json();
                    const productsArray = Array.isArray(mrData) ? mrData : (mrData.data || mrData.products || mrData.result || []);
                    if (productsArray.length > 0) {
                        productsInBatch += productsArray.length;
                        productsArray.forEach((p: any) => {
                             const basePrice = parseFloat(p.base_price || p.price) || 0;
                             const sourceId = "MR-" + p.id;
                             const pricing = applySmartPricing(basePrice, sourceId);
                             
                             if (pricing) {
                                let imgPath = p.thumbnail_image || p.thumbnail_img || p.image || '';
                                if (imgPath && !imgPath.startsWith('http')) imgPath = `https://merrono.com/${imgPath}`;
                                const cat = normalizeCategory(p.category || 'Lifestyle');
                                const subcat = p.subcategory || p.sub_category || p.type || inferSubcategory(p.name || p.title || '', cat);
                                merronoProductsRaw.push({
                                    id: sourceId,
                                    name: p.name || p.title || '',
                                    product_code: p.product_code || p.sku || '',
                                    category: cat,
                                    subcategory: subcat,
                                    thumbnail_img: imgPath,
                                    image: imgPath,
                                    details: p.details || p.description || '',
                                    status: p.status === 1 ? 'active' : (p.status || 'active'),
                                    product_variants: p.product_variants || p.variants || [],
                                    product_images: p.product_images || p.images || [],
                                    provider: 'merrono',
                                    custom: false,
                                    ...pricing
                                });
                              }
                        });
                    }
                    debug.merrono_pages_fetched++;
                } catch (e) {}
            }
        }
        if (productsInBatch === 0) break;
        merronoPage += merronoBatchSize;
    }
    debug.merrono_count = merronoProductsRaw.length;

    let mohasagorProducts: any[] = [];
    try {
        const mRes = await mohasagorPage1Promise;
        if (mRes && mRes.ok) {
            const mData = await mRes.json();
            const lastPage = mData.last_page || 1;
            
            if (mData && mData.products) {
                mData.products.forEach((p: any) => {
                    const mapped = processMohasagorProduct(p);
                    if (mapped) mohasagorProducts.push(mapped);
                });
            }

            if (lastPage > 1) {
                const batchPromises = [];
                for (let page = 2; page <= lastPage; page++) {
                    batchPromises.push(
                        fetch(`https://mohasagor.com.bd/api/reseller/product?page=${page}`, {
                            headers: { ...standardHeaders, 'API-KEY': 'A8niclztH9JtzS4t', 'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8' }
                        })
                    );
                }

                const results = await Promise.allSettled(batchPromises);
                for (const res of results) {
                    if (res.status === 'fulfilled' && res.value.ok) {
                        try {
                            const pageData = await res.value.json();
                            if (pageData.products) {
                                pageData.products.forEach((p: any) => {
                                    const mapped = processMohasagorProduct(p);
                                    if (mapped) mohasagorProducts.push(mapped);
                                });
                            }
                        } catch (e) {
                            console.error("Error parsing Mohasagor page:", e);
                        }
                    }
                }
            }
            debug.mohasagor_count = mohasagorProducts.length;
        }
    } catch (e) {
        console.error("Error fetching Mohasagor products:", e);
    }

    const allProducts = [...mohasagorProducts, ...merronoProductsRaw, ...customProducts];

    // ═══ Final Deduplication & Cleaning ═══
    const seenIds = new Set();
    const finalProducts = allProducts.filter(p => {
        const id = p.id?.toString();
        if (!id || seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
    });

    debug.total_time = Date.now() - startTime;
    debug.total_products = finalProducts.length;

    return new Response(JSON.stringify({ status: 200, products: finalProducts, settings: settings, debug: debug }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    });

  } catch (error) {
    debug.total_time = Date.now() - startTime;
    return new Response(JSON.stringify({ error: error.message, debug: debug }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
