import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Initialize Supabase with service role for admin bypass
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const body = await req.json();
    const { action, auth, data } = body;

    // Authentication Verification
    if (!auth || !auth.phone) {
      return new Response(JSON.stringify({ error: 'Missing phone number' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authenticate the user by phone (bypassing password since website doesn't store it)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, phone, email')
      .eq('phone', auth.phone)
      .single();

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.id;

    // Route Actions
    switch (action) {
      
      // ==========================================
      // WISHLIST ACTIONS
      // ==========================================
      case 'get_wishlist': {
        const { data: wishlist, error } = await supabase
          .from('user_wishlist')
          .select('product_id')
          .eq('user_id', userId);
          
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, wishlist: wishlist.map(w => w.product_id) }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'add_to_wishlist': {
        if (!data?.product_id) throw new Error('product_id is required');
        const { error } = await supabase
          .from('user_wishlist')
          .upsert({ user_id: userId, product_id: data.product_id }, { onConflict: 'user_id,product_id' });
          
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'remove_from_wishlist': {
        if (!data?.product_id) throw new Error('product_id is required');
        const { error } = await supabase
          .from('user_wishlist')
          .delete()
          .match({ user_id: userId, product_id: data.product_id });
          
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // ADDRESS ACTIONS
      // ==========================================
      case 'get_addresses': {
        const { data: addresses, error } = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', userId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true });
          
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, addresses }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'save_address': {
        if (!data?.title || !data?.address) throw new Error('title and address are required');
        
        // If set to default, unset others
        if (data.is_default) {
          await supabase.from('user_addresses').update({ is_default: false }).eq('user_id', userId);
        }

        const addressData = {
          user_id: userId,
          title: data.title,
          address: data.address,
          is_default: data.is_default || false
        };

        let result;
        if (data.id) {
          result = await supabase.from('user_addresses').update(addressData).eq('id', data.id).eq('user_id', userId);
        } else {
          result = await supabase.from('user_addresses').insert(addressData);
        }

        if (result.error) throw result.error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete_address': {
        if (!data?.id) throw new Error('id is required');
        const { error } = await supabase
          .from('user_addresses')
          .delete()
          .match({ id: data.id, user_id: userId });
          
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ==========================================
      // PROFILE ACTIONS
      // ==========================================
      case 'update_profile': {
        const updates: any = {};
        
        const userMetadata: any = {};
        if (data?.name) userMetadata.name = data.name;
        if (data?.username) userMetadata.username = data.username;

        if (Object.keys(userMetadata).length > 0) {
          updates.user_metadata = userMetadata;
        }
        
        // Update users table
        const usersTableUpdates: any = {};
        if (data?.name) usersTableUpdates.name = data.name;
        if (data?.username) usersTableUpdates.username = data.username;

        if (Object.keys(usersTableUpdates).length > 0) {
          await supabase.from('users').update(usersTableUpdates).eq('id', userId);
        }
        
        if (data?.new_password) {
          updates.password = data.new_password;
        }

        if (Object.keys(updates).length > 0) {
          const { error } = await supabase.auth.admin.updateUserById(userId, updates);
          if (error) throw error;
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'submit_deposit_request': {
        const { amount, payment_method, sender_phone, trx_id } = data;
        if (!amount || !payment_method || !sender_phone || !trx_id) {
          throw new Error('All fields are required');
        }
        const { data: tx, error } = await supabase
          .from('wallet_transactions')
          .insert({
            user_phone: userData.phone,
            amount: parseFloat(amount),
            type: 'deposit_pending',
            description: `${payment_method.toUpperCase()} Deposit - Sender: ${sender_phone}, TrxID: ${trx_id}`
          })
          .select()
          .single();
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, transaction: tx }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error: any) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
