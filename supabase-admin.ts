import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { action, auth } = payload;
    
    if (!auth || !auth.phone || !auth.password) {
      return new Response(JSON.stringify({ error: 'Missing admin credentials' }), { status: 401, headers: corsHeaders });
    }

    const ADMIN_PHONE = '01873827520';
    if (!auth.phone.endsWith(ADMIN_PHONE)) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Not an admin' }), { status: 403, headers: corsHeaders });
    }

    const { data: adminUser, error: authError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('phone', auth.phone)
      .eq('password', auth.password)
      .limit(1)

    if (authError || !adminUser || adminUser.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid admin credentials' }), { status: 401, headers: corsHeaders });
    }

    if (action === 'get_dashboard_data') {
      const { count: usersCount } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
      const { count: ordersCount } = await supabaseClient.from('orders').select('*', { count: 'exact', head: true });
      const { count: productsCount } = await supabaseClient.from('products').select('*', { count: 'exact', head: true });
      const { data: recentOrders } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false }).limit(10);
      
      return new Response(JSON.stringify({
        stats: { totalUsers: usersCount || 0, totalOrders: ordersCount || 0, customProducts: productsCount || 0 },
        recentOrders: recentOrders || []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      
    } else if (action === 'get_inventory_report') {
      // This is for the admin to see EVERY product and their overrides
      const { data: overrides } = await supabaseClient.from('product_overrides').select('*');
      const { data: csvProducts } = await supabaseClient.from('products').select('*');
      
      return new Response(JSON.stringify({ 
        overrides: overrides || [],
        csvProducts: csvProducts || []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'get_users') {
      const { data: allUsers } = await supabaseClient.from('users').select('name, username, phone, email, created_at, payment_method, payment_details, affiliate_status, commission_rate').order('created_at', { ascending: false });
      return new Response(JSON.stringify({ users: allUsers || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      
    } else if (action === 'get_orders') {
      const { data: allOrders } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
      return new Response(JSON.stringify({ orders: allOrders || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      
    } else if (action === 'update_order_status') {
      const { orderId, status } = payload;
      
      // 1. Get existing order data
      const { data: order } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
      if (!order) throw new Error('Order not found');

      // 2. Update status
      const { data: updatedOrder, error } = await supabaseClient.from('orders').update({ status }).eq('id', orderId).select().single();
      if (error) throw error;

      // 3. Automated Cashback Logic (Only when moving to 'Delivered')
      if (status === 'Delivered' && order.status !== 'Delivered') {
        const { data: settingsData } = await supabaseClient.from('site_settings').select('value').eq('key', 'cashback_settings').single();
        const settings = settingsData?.value || { percentage: 5, max_cap: 200, enabled: true };
        
        if (settings.enabled) {
          const total = parseFloat(order.total_amount) || 0;
          const cashbackAmount = Math.min((total * settings.percentage) / 100, settings.max_cap);
          
          if (cashbackAmount > 0) {
            // Update User Wallet
            await supabaseClient.rpc('increment_wallet', { 
                target_phone: order.customer_phone, 
                amount: cashbackAmount 
            });

            // Log Transaction
            await supabaseClient.from('wallet_transactions').insert({
              user_phone: order.customer_phone,
              amount: cashbackAmount,
              type: 'cashback',
              order_id: orderId,
              description: `Cashback for order #${orderId.substring(0, 8)}`
            });
          }
        }
      }
      
      return new Response(JSON.stringify({ success: true, order: updatedOrder }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } else if (action === 'get_site_settings') {
      const { data: settings, error } = await supabaseClient.from('site_settings').select('*');
      if (error) throw error;
      return new Response(JSON.stringify({ settings: settings || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'update_site_settings') {
      const { key, value } = payload;
      const { data, error } = await supabaseClient.from('site_settings').upsert({ key, value, updated_at: new Date() }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, setting: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'upsert_product_override') {
      const { source_id, updates } = payload;
      const { data, error } = await supabaseClient.from('product_overrides').upsert({ source_id, ...updates, last_updated: new Date() }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, override: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'add_product') {
      const { product } = payload;
      product.id = product.id || 'CUST-' + Math.floor(Math.random() * 1000000);
      const { data: newProduct, error } = await supabaseClient.from('products').insert([product]).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, product: newProduct }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      
    } else if (action === 'delete_product') {
      const { productId } = payload;
      const { error } = await supabaseClient.from('products').delete().eq('id', productId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'bulk_add_products') {
      const { products } = payload;
      const newProducts = products.map(p => {
        if (!p.id) p.id = 'CUST-' + Math.floor(Math.random() * 1000000) + '-' + Date.now();
        return p;
      });
      const { data, error } = await supabaseClient.from('products').insert(newProducts).select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, products: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'delete_all_products') {
      const { error } = await supabaseClient.from('products').delete().neq('id', 'non-existent-id'); // Deletes all
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'batch_update_products') {
      const { updates } = payload;
      // Supabase JS doesn't support bulk update easily without upsert, so we upsert
      const { data, error } = await supabaseClient.from('products').upsert(updates).select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, products: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

      
    } else if (action === 'get_payouts') {
      const { data: payouts, error } = await supabaseClient.from('payout_requests').select('*, users:user_phone (name, username)').order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ payouts: payouts || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      
    } else if (action === 'update_payout_status') {
      const { payoutId, status } = payload;
      const { data: updatedPayout, error } = await supabaseClient
        .from('payout_requests')
        .update({ status })
        .eq('id', payoutId)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, payout: updatedPayout }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'get_deposits') {
      const { data: deposits, error } = await supabaseClient
        .from('wallet_transactions')
        .select('*')
        .or('type.eq.deposit_pending,type.eq.deposit,type.eq.deposit_rejected')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ deposits: deposits || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'approve_deposit') {
      const { txId } = payload;
      const { data: tx, error: fetchError } = await supabaseClient.from('wallet_transactions').select('*').eq('id', txId).single();
      if (fetchError || !tx) throw new Error('Transaction not found');
      if (tx.type !== 'deposit_pending') throw new Error('Transaction is already processed');

      const { error: updateError } = await supabaseClient
        .from('wallet_transactions')
        .update({ type: 'deposit' })
        .eq('id', txId);
      if (updateError) throw updateError;

      // Update wallet balance in users table
      await supabaseClient.rpc('increment_wallet', { 
          target_phone: tx.user_phone, 
          amount: tx.amount 
      });

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'reject_deposit') {
      const { txId } = payload;
      const { error } = await supabaseClient
        .from('wallet_transactions')
        .update({ type: 'deposit_rejected' })
        .eq('id', txId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'update_user_field') {
      const { phone, field, value } = payload;
      const { data: updatedUser, error } = await supabaseClient.from('users').update({ [field]: value }).eq('phone', phone).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, user: updatedUser }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
