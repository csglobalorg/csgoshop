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

    const reqBody = await req.json();
    const { type, phone, password, username, name, email, address, payment_method, payment_details, amount, referral_code } = reqBody;

    if (!phone) {
      return new Response(JSON.stringify({ error: 'Phone number/username is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if ((type === 'register' || type === 'login') && !password) {
      return new Response(JSON.stringify({ error: 'Password is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (type === 'register') {
      // Check if user exists
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('phone', phone.trim())
        .limit(1)

      if (existingUser && existingUser.length > 0) {
        return new Response(JSON.stringify({ error: 'Phone number already registered' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // Check if username is used
      if (username) {
        const { data: existingUsername } = await supabaseClient
          .from('users')
          .select('id')
          .eq('username', username.trim())
          .limit(1)

        if (existingUsername && existingUsername.length > 0) {
          return new Response(JSON.stringify({ error: 'Username is already taken' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
      }

      let referredBy = null;
      if (referral_code) {
        const { data: referrer } = await supabaseClient
          .from('users')
          .select('username')
          .eq('username', referral_code.trim())
          .single();
        if (referrer) referredBy = referrer.username;
      }

      // Insert new user
      const { data, error } = await supabaseClient
        .from('users')
        .insert([
          { 
            phone: phone.trim(), 
            password: password.trim(), 
            username: username ? username.trim() : null, 
            name, 
            email, 
            address, 
            payment_method, 
            payment_details,
            referred_by: referredBy
          }
        ])
        .select()
        .single()

      if (error) throw error

      return new Response(JSON.stringify({ user: { name: data.name, username: data.username, phone: data.phone, email: data.email, address: data.address, payment_method: data.payment_method, payment_details: data.payment_details, affiliate_status: data.affiliate_status, wallet_balance: data.wallet_balance || 0 } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (type === 'login' || type === 'get_profile') {
      const identifier = phone.trim();
      
      // Find user
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .or(`phone.eq."${identifier}",username.eq."${identifier}"`)
        .limit(1)
        .single()

      if (userError || !userData) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }

      // Check password if login
      if (type === 'login' && userData.password !== password) {
          return new Response(JSON.stringify({ error: 'Invalid password' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          })
      }
      
      // Fetch payment accounts
      const { data: paymentAccounts } = await supabaseClient
        .from('payment_accounts')
        .select('*')
        .eq('user_phone', userData.phone)
        .order('created_at', { ascending: false });

      return new Response(JSON.stringify({ 
          user: { 
              name: userData.name, 
              username: userData.username, 
              phone: userData.phone, 
              email: userData.email, 
              address: userData.address, 
              affiliate_status: userData.affiliate_status,
              wallet_balance: userData.wallet_balance || 0,
              payment_accounts: paymentAccounts || []
          } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (type === 'add_payment_account') {
      const method = payment_method || reqBody.method;
      const details = payment_details || reqBody.details;
      const is_default = reqBody.is_default;
      
      if (is_default) {
          // Reset other defaults
          await supabaseClient
            .from('payment_accounts')
            .update({ is_default: false })
            .eq('user_phone', phone);
      }

      const { data, error } = await supabaseClient
        .from('payment_accounts')
        .insert([{ user_phone: phone, method, details, is_default: !!is_default }])
        .select()
        .single()

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, account: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (type === 'delete_payment_account') {
      const { account_id } = reqBody;
      const { error } = await supabaseClient
        .from('payment_accounts')
        .delete()
        .eq('id', account_id)
        .eq('user_phone', phone);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })

    } else if (type === 'update_profile') {
      // Update user
      const { data, error } = await supabaseClient
        .from('users')
        .update({ name, username, email, address })
        .eq('phone', phone)
        .select()
        .single()

      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      return new Response(JSON.stringify({ user: { name: data.name, username: data.username, phone: data.phone, email: data.email, address: data.address, affiliate_status: data.affiliate_status, wallet_balance: data.wallet_balance || 0 } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else if (type === 'request_payout') {
      const walletDeduction = parseFloat(reqBody.wallet_deduction || 0);

      const { data, error } = await supabaseClient
        .from('payout_requests')
        .insert([
          { user_phone: phone, amount: parseFloat(amount || 0), payment_method, payment_details, status: 'pending' }
        ])
        .select()
        .single()

      if (error) {
          return new Response(JSON.stringify({ error: 'Failed to submit payout request: ' + error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
      }

      // Deduct wallet balance if this payout uses wallet funds
      if (walletDeduction > 0) {
        const { data: currentUser } = await supabaseClient
          .from('users')
          .select('wallet_balance')
          .eq('phone', phone)
          .single();

        if (currentUser) {
          const newBalance = Math.max(0, (currentUser.wallet_balance || 0) - walletDeduction);
          await supabaseClient
            .from('users')
            .update({ wallet_balance: newBalance })
            .eq('phone', phone);
        }
      }

      return new Response(JSON.stringify({ success: true, request: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }


    return new Response(JSON.stringify({ error: 'Invalid request type' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
