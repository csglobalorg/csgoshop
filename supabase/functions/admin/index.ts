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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders });
    }
    
    // Robustly extract the token from the header
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );
    
    // Explicitly pass the token to getUser to avoid AuthSessionMissingError
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token', details: userError }), { status: 401, headers: corsHeaders });
    }

    // RBAC Check
    const { data: roleData, error: roleError } = await supabaseClient
      .from('staff_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || !['super_admin', 'admin', 'product_manager', 'order_manager'].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient privileges' }), { status: 403, headers: corsHeaders });
    }

    const payload = await req.json()
    const { action } = payload;

    const logAudit = async (actionDesc: string, resource: string, details?: any) => {
      await supabaseClient.from('audit_logs').insert({
        admin_id: user.id,
        action: actionDesc,
        resource,
        details: details || {}
      });
    };


    if (action === 'get_dashboard_data') {
      const { count: usersCount } = await supabaseClient.from('users').select('*', { count: 'exact', head: true });
      const { count: ordersCount } = await supabaseClient.from('orders').select('*', { count: 'exact', head: true });
      const { data: recentOrders } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
      
      // Calculate revenue from recentOrders
      let totalRevenue = 0;
      let activeOrders = 0;
      const salesByMonth: Record<string, number> = {};

      if (recentOrders) {
        recentOrders.forEach(o => {
          if (o.status !== 'cancelled' && o.status !== 'failed') {
            totalRevenue += (o.total_amount || 0);
          }
          if (['pending', 'processing'].includes(o.status)) {
            activeOrders++;
          }
          
          // Chart data (Group by month-year)
          const date = new Date(o.created_at);
          const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
          if (!salesByMonth[monthYear]) salesByMonth[monthYear] = 0;
          if (o.status !== 'cancelled' && o.status !== 'failed') {
            salesByMonth[monthYear] += (o.total_amount || 0);
          }
        });
      }

      // Convert salesByMonth to array for chart
      const chartLabels = Object.keys(salesByMonth).reverse().slice(0, 6).reverse(); // Last 6 months with data
      const chartData = chartLabels.map(label => salesByMonth[label]);

      const { data: auditLogs } = await supabaseClient.from('audit_logs').select('*, admin:users(email)').order('created_at', { ascending: false }).limit(5);

      return new Response(JSON.stringify({
        stats: { totalUsers: usersCount || 0, totalOrders: ordersCount || 0, activeOrders, totalRevenue },
        recentOrders: (recentOrders || []).slice(0, 5),
        chart: { labels: chartLabels, data: chartData },
        auditLogs: auditLogs || []
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
      const { orderId, status, tracking_url, courier_info } = payload;
      
      // 1. Get existing order data
      const { data: order } = await supabaseClient.from('orders').select('*').eq('id', orderId).single();
      if (!order) throw new Error('Order not found');

      // 2. Update status and tracking info
      const updateData: any = { status };
      if (tracking_url !== undefined) updateData.tracking_url = tracking_url;
      if (courier_info !== undefined) updateData.courier_info = courier_info;

      const { data: updatedOrder, error } = await supabaseClient.from('orders').update(updateData).eq('id', orderId).select().single();
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
      
    } else if (action === 'bulk_update_orders') {
      const { orderIds, status } = payload;
      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        throw new Error('No order IDs provided');
      }

      // Update the status of multiple orders
      const { data: updatedOrders, error } = await supabaseClient
        .from('orders')
        .update({ status })
        .in('id', orderIds)
        .select();
        
      if (error) throw error;
      
      // Trigger cashback logic for any order that just moved to 'Delivered'
      if (status === 'Delivered') {
        const { data: settingsData } = await supabaseClient.from('site_settings').select('value').eq('key', 'cashback_settings').single();
        const settings = settingsData?.value || { percentage: 5, max_cap: 200, enabled: true };
        
        if (settings.enabled) {
          for (const order of updatedOrders) {
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
                 order_id: order.id,
                 description: `Cashback for order #${order.id.substring(0, 8)}`
               });
             }
          }
        }
      }

      return new Response(JSON.stringify({ success: true, updatedCount: updatedOrders.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'set_user_role') {
      const { phone, role } = payload;
      if (!phone || !role) throw new Error('Phone and role are required');

      const { data, error } = await supabaseClient
        .from('users')
        .update({ role })
        .eq('phone', phone)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, user: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

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
      
      // Filter out only allowed fields for safety
      const allowedUpdates: any = {};
      if ('is_hidden' in updates) allowedUpdates.is_hidden = updates.is_hidden;
      if ('is_featured' in updates) allowedUpdates.is_featured = updates.is_featured;
      if ('custom_price' in updates) allowedUpdates.custom_price = updates.custom_price;
      if ('override_name' in updates) allowedUpdates.override_name = updates.override_name;
      if ('override_category' in updates) allowedUpdates.override_category = updates.override_category;
      if ('override_subcategory' in updates) allowedUpdates.override_subcategory = updates.override_subcategory;
      if ('override_sub_subcategory' in updates) allowedUpdates.override_sub_subcategory = updates.override_sub_subcategory;
      
      const { data, error } = await supabaseClient.from('product_overrides').upsert({ source_id, ...allowedUpdates, last_updated: new Date() }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, override: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'add_product') {
      const { product } = payload;
      product.id = product.id || 'CUST-' + Math.floor(Math.random() * 1000000);
      const { data: newProduct, error } = await supabaseClient.from('products').insert([product]).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, product: newProduct }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'update_product') {
      const { productId, updates } = payload;
      const { error } = await supabaseClient.from('products').update(updates).eq('id', productId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'delete_product') {
      const { productId } = payload;
      const { error } = await supabaseClient.from('products').delete().eq('id', productId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'bulk_add_products') {
      const { products } = payload;
      const newProducts = products.map((p: any) => {
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

    } else if (action === 'delete_products_by_category') {
      const { category } = payload;
      const { error } = await supabaseClient.from('products').delete().eq('category', category);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'delete_csv_products') {
      const { error } = await supabaseClient.from('products').delete().like('id', 'CSV-%');
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

    // -----------------------------------------------
    // PHASE 4: Customer CRM
    // -----------------------------------------------
    } else if (action === 'get_users_full') {
      const { data: users, error } = await supabaseClient
        .from('users')
        .select('id, name, username, phone, email, created_at, wallet_balance, affiliate_status, commission_rate, is_banned, payment_method, payment_details')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: orderStats } = await supabaseClient.from('orders').select('customer_phone, total_amount');
      const statsMap: Record<string, { count: number; total: number }> = {};
      (orderStats || []).forEach((o: any) => {
        if (!statsMap[o.customer_phone]) statsMap[o.customer_phone] = { count: 0, total: 0 };
        statsMap[o.customer_phone].count++;
        statsMap[o.customer_phone].total += parseFloat(o.total_amount) || 0;
      });
      const enriched = (users || []).map((u: any) => ({
        ...u,
        order_count: statsMap[u.phone]?.count || 0,
        total_spent: statsMap[u.phone]?.total || 0,
      }));
      return new Response(JSON.stringify({ users: enriched }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'adjust_wallet') {
      const { phone, amount, note } = payload;
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount === 0) throw new Error('Invalid amount');
      await supabaseClient.rpc('increment_wallet', { target_phone: phone, amount: parsedAmount });
      await supabaseClient.from('wallet_transactions').insert({
        user_phone: phone,
        amount: Math.abs(parsedAmount),
        type: parsedAmount > 0 ? 'admin_credit' : 'admin_debit',
        description: note || (parsedAmount > 0 ? 'Admin manual credit' : 'Admin manual debit'),
      });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'set_ban_status') {
      const { phone, is_banned } = payload;
      const { error } = await supabaseClient.from('users').update({ is_banned }).eq('phone', phone);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'get_user_orders') {
      const { phone } = payload;
      const { data: orders, error } = await supabaseClient
        .from('orders')
        .select('id, created_at, total_amount, status, courier_info, tracking_url')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ orders: orders || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'get_wallet_transactions') {
      const { phone } = payload;
      const { data: txns, error } = await supabaseClient
        .from('wallet_transactions')
        .select('*')
        .eq('user_phone', phone)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ transactions: txns || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    // -----------------------------------------------
    // PHASE 1: Category Manager
    // -----------------------------------------------
    } else if (action === 'get_categories') {
      // Return all categories ordered by level then sort_order
      const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .order('level', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ categories: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'save_category') {
      // Upsert a category. If id is provided → update. If not → insert.
      const { id, name, parent_id, level, sort_order, is_active } = payload;
      
      // Generate slug from name
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      if (id) {
        // UPDATE
        const { data, error } = await supabaseClient
          .from('categories')
          .update({ name, slug, parent_id: parent_id || null, level: level || 1, sort_order: sort_order || 0, is_active: is_active !== false })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, category: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      } else {
        // INSERT
        const { data, error } = await supabaseClient
          .from('categories')
          .insert({ name, slug, parent_id: parent_id || null, level: level || 1, sort_order: sort_order || 0, is_active: is_active !== false })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, category: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

    } else if (action === 'bulk_save_categories') {
      // Insert multiple categories at once (name list → level 1 or under a parent)
      const { names, parent_id, level } = payload;
      if (!Array.isArray(names) || names.length === 0) throw new Error('No names provided');
      
      const rows = names.map((name: string, idx: number) => ({
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        parent_id: parent_id || null,
        level: level || 1,
        sort_order: idx,
        is_active: true,
      })).filter(r => r.name.length > 0);

      const { data, error } = await supabaseClient
        .from('categories')
        .insert(rows)
        .select();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, inserted: data?.length || 0, categories: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'delete_category') {
      // Deleting a parent cascades to children via FK ON DELETE CASCADE
      const { id } = payload;
      const { error } = await supabaseClient.from('categories').delete().eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    // -----------------------------------------------
    // PHASE 5: Affiliate Management
    // -----------------------------------------------
    } else if (action === 'get_affiliates') {
      // Get all users with affiliate_status, enriched with click count, delivered orders, and milestones
      const { data: affiliates, error } = await supabaseClient
        .from('users')
        .select('name, username, phone, email, affiliate_status, commission_rate, wallet_balance, created_at, payment_method, payment_details')
        .not('affiliate_status', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get click counts per affiliate
      const { data: clicks } = await supabaseClient
        .from('affiliate_clicks')
        .select('referred_by');

      const clickMap: Record<string, number> = {};
      (clicks || []).forEach((c: any) => {
        clickMap[c.referred_by] = (clickMap[c.referred_by] || 0) + 1;
      });

      // Get payout requests per affiliate
      const { data: payouts } = await supabaseClient
        .from('payout_requests')
        .select('user_phone, amount, status');

      const payoutMap: Record<string, { pending: number; paid: number }> = {};
      (payouts || []).forEach((p: any) => {
        if (!payoutMap[p.user_phone]) payoutMap[p.user_phone] = { pending: 0, paid: 0 };
        if (p.status === 'pending') payoutMap[p.user_phone].pending += parseFloat(p.amount) || 0;
        if (p.status === 'paid') payoutMap[p.user_phone].paid += parseFloat(p.amount) || 0;
      });

      // Get orders referred by affiliates
      const { data: referredOrders } = await supabaseClient
        .from('orders')
        .select('affiliate_code, total_amount, status, subtotal')
        .not('affiliate_code', 'is', null);

      const earningsMap: Record<string, number> = {};
      const deliveredCountMap: Record<string, number> = {};
      const pendingCountMap: Record<string, number> = {};

      (referredOrders || []).forEach((o: any) => {
        const code = o.affiliate_code;
        const status = (o.status || '').toLowerCase().trim();
        const isDelivered = status === 'delivered' || status === 'completed' || status === 'complete' || status === 'complate';
        const isPending = status === 'pending' || status === 'processing' || status === 'shipped';

        if (isDelivered) {
          deliveredCountMap[code] = (deliveredCountMap[code] || 0) + 1;
          earningsMap[code] = (earningsMap[code] || 0) + (parseFloat(o.subtotal || o.total_amount) || 0);
        } else if (isPending) {
          pendingCountMap[code] = (pendingCountMap[code] || 0) + 1;
        }
      });

      const enriched = (affiliates || []).map((a: any) => {
        const codeKey = a.username || a.phone;
        const deliveredOrders = (deliveredCountMap[a.username] || 0) + (deliveredCountMap[a.phone] || 0);
        const pendingOrders = (pendingCountMap[a.username] || 0) + (pendingCountMap[a.phone] || 0);
        const deliveredRevenue = (earningsMap[a.username] || 0) + (earningsMap[a.phone] || 0);

        let rank = 'Starter';
        let boost = 0;
        let travelEligible = null;

        if (deliveredOrders >= 2000) {
          rank = 'Elite Partner 👑';
          boost = 5;
          travelEligible = 'Premium Bangladesh Tour 3D/2N';
        } else if (deliveredOrders >= 1000) {
          rank = 'Platinum Partner 💎';
          boost = 3;
          travelEligible = 'Rangamati / Sajek 2D/1N';
        } else if (deliveredOrders >= 500) {
          rank = 'Gold Partner 🥇';
          boost = 2;
          travelEligible = 'Srimangal 2D/1N';
        } else if (deliveredOrders >= 200) {
          rank = 'Silver Partner 🥈';
          boost = 1;
          travelEligible = "Cox's Bazar 1D/1N";
        } else if (deliveredOrders >= 50) {
          rank = 'Bronze Partner 🥉';
        }

        return {
          ...a,
          click_count: clickMap[a.phone] || clickMap[a.username] || 0,
          delivered_orders: deliveredOrders,
          pending_orders: pendingOrders,
          referred_revenue: deliveredRevenue,
          rank: rank,
          commission_boost: boost,
          travel_eligible: travelEligible,
          pending_payout: payoutMap[a.phone]?.pending || 0,
          total_paid: payoutMap[a.phone]?.paid || 0,
        };
      });

      return new Response(JSON.stringify({ affiliates: enriched }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'approve_affiliate') {
      const { phone, commission_rate } = payload;
      const { error } = await supabaseClient
        .from('users')
        .update({ affiliate_status: 'approved', commission_rate: commission_rate || 5 })
        .eq('phone', phone);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'reject_affiliate') {
      const { phone } = payload;
      const { error } = await supabaseClient
        .from('users')
        .update({ affiliate_status: 'rejected' })
        .eq('phone', phone);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'get_payout_requests') {
      const { data: payouts, error } = await supabaseClient
        .from('payout_requests')
        .select('*, users:user_phone (name, username)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ payouts: payouts || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

    } else if (action === 'process_payout') {
      const { payoutId, status } = payload; // status: 'paid' | 'rejected'
      const { data: payout, error: fetchErr } = await supabaseClient
        .from('payout_requests')
        .select('*')
        .eq('id', payoutId)
        .single();
      if (fetchErr || !payout) throw new Error('Payout not found');

      const { error } = await supabaseClient
        .from('payout_requests')
        .update({ status })
        .eq('id', payoutId);
      if (error) throw error;

      // If rejecting, refund the held amount back to wallet
      if (status === 'rejected') {
        await supabaseClient.rpc('increment_wallet', {
          target_phone: payout.user_phone,
          amount: parseFloat(payout.amount),
        });
        await supabaseClient.from('wallet_transactions').insert({
          user_phone: payout.user_phone,
          amount: parseFloat(payout.amount),
          type: 'payout_rejected',
          description: `Payout request #${payoutId.substring(0,8)} rejected — amount refunded`,
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // -----------------------------------------------
    // PHASE 6: Finance Panel
    // -----------------------------------------------
    if (action === 'get_finance_summary') {
      // Orders aggregation
      const { data: orders } = await supabaseClient
        .from('orders')
        .select('total_amount, status, created_at');

      const totalRevenue = (orders || []).filter((o: any) => o.status !== 'Cancelled')
        .reduce((s: number, o: any) => s + (parseFloat(o.total_amount) || 0), 0);
      const cancelledRevenue = (orders || []).filter((o: any) => o.status === 'Cancelled')
        .reduce((s: number, o: any) => s + (parseFloat(o.total_amount) || 0), 0);

      // Group orders by month (last 6 months)
      const monthlyMap: Record<string, number> = {};
      (orders || []).forEach((o: any) => {
        if (o.status === 'Cancelled') return;
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = (monthlyMap[key] || 0) + (parseFloat(o.total_amount) || 0);
      });

      // Wallet transactions summary
      const { data: txns } = await supabaseClient
        .from('wallet_transactions')
        .select('type, amount, created_at');

      let totalDeposited = 0, totalCashback = 0, totalWithdrawn = 0;
      (txns || []).forEach((t: any) => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'deposit') totalDeposited += amt;
        if (t.type === 'cashback') totalCashback += amt;
        if (t.type === 'payout_rejected') return; // no-op
      });

      // Pending deposits count
      const { count: pendingDeposits } = await supabaseClient
        .from('wallet_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'deposit_pending');

      // Pending payouts
      const { data: pendingPayoutData } = await supabaseClient
        .from('payout_requests')
        .select('amount')
        .eq('status', 'pending');
      const pendingPayoutTotal = (pendingPayoutData || []).reduce((s: number, p: any) => s + (parseFloat(p.amount) || 0), 0);

      // All users wallet balance total
      const { data: users } = await supabaseClient.from('users').select('wallet_balance');
      const totalWalletHeld = (users || []).reduce((s: number, u: any) => s + (parseFloat(u.wallet_balance) || 0), 0);

      return new Response(JSON.stringify({
        totalRevenue,
        cancelledRevenue,
        totalDeposited,
        totalCashback,
        totalWalletHeld,
        pendingDeposits: pendingDeposits || 0,
        pendingPayoutTotal,
        monthlyRevenue: monthlyMap,
        totalOrders: (orders || []).length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // -----------------------------------------------
    // PHASE 7: Marketing / Promo
    // -----------------------------------------------

    // --- Promo Codes ---
    if (action === 'get_promo_codes') {
      const { data, error } = await supabaseClient.from('promo_codes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ codes: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'save_promo_code') {
      const { id, code, description, type, value, min_order, max_uses, is_active, expires_at } = payload;
      const upsertData: any = { code: code.toUpperCase(), description, type, value, min_order, is_active };
      if (max_uses !== undefined) upsertData.max_uses = max_uses || null;
      if (expires_at) upsertData.expires_at = expires_at;
      if (id) upsertData.id = id;

      const { data, error } = await supabaseClient.from('promo_codes').upsert(upsertData).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, code: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'delete_promo_code') {
      const { id } = payload;
      const { error } = await supabaseClient.from('promo_codes').delete().eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'toggle_promo_code') {
      const { id, is_active } = payload;
      const { error } = await supabaseClient.from('promo_codes').update({ is_active }).eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // --- Banners ---
    if (action === 'get_banners') {
      const { data, error } = await supabaseClient.from('banners').select('*').order('sort_order', { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ banners: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'save_banner') {
      const { id, title, subtitle, image_url, link_url, sort_order, is_active } = payload;
      const upsertData: any = { title, subtitle, image_url, link_url, sort_order: sort_order || 0, is_active };
      if (id) upsertData.id = id;
      const { data, error } = await supabaseClient.from('banners').upsert(upsertData).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, banner: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'delete_banner') {
      const { id } = payload;
      const { error } = await supabaseClient.from('banners').delete().eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // --- Announcements ---
    if (action === 'get_announcements') {
      const { data, error } = await supabaseClient.from('announcements').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ announcements: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'save_announcement') {
      const { id, message, type: annType, is_active, expires_at } = payload;
      const upsertData: any = { message, type: annType || 'info', is_active };
      if (expires_at) upsertData.expires_at = expires_at;
      if (id) upsertData.id = id;
      const { data, error } = await supabaseClient.from('announcements').upsert(upsertData).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, announcement: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'delete_announcement') {
      const { id } = payload;
      const { error } = await supabaseClient.from('announcements').delete().eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // --- App Control (Phase 8) ---
    if (action === 'get_app_settings') {
      const { data, error } = await supabaseClient.from('app_settings').select('*');
      if (error) throw error;
      return new Response(JSON.stringify({ settings: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'save_app_setting') {
      const { key, value } = payload;
      const { data, error } = await supabaseClient.from('app_settings').upsert({ key, value, updated_at: new Date() }).select().single();
      if (error) throw error;
      await logAudit('Update App Setting', 'app_settings', { key, value });
      return new Response(JSON.stringify({ success: true, setting: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'get_feature_flags') {
      const { data, error } = await supabaseClient.from('feature_flags').select('*');
      if (error) throw error;
      return new Response(JSON.stringify({ flags: data || [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    if (action === 'save_feature_flag') {
      const { flag, enabled, description } = payload;
      const { data, error } = await supabaseClient.from('feature_flags').upsert({ flag, enabled, description, updated_at: new Date() }).select().single();
      if (error) throw error;
      await logAudit('Update Feature Flag', 'feature_flags', { flag, enabled });
      return new Response(JSON.stringify({ success: true, flag: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 })
  }
})
