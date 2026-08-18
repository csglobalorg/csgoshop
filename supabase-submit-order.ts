import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key to bypass RLS
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API SERVICE ROLE KEY - bypasses RLS
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request body
    const orderData = await req.json()

    // Insert order into the 'orders' table
    const { data, error } = await supabaseClient
      .from('orders')
      .insert([
        {
          customer_name: orderData.name || orderData.customer_name || 'Customer',
          customer_phone: orderData.phone || orderData.user_phone || orderData.customer_phone,
          delivery_area: orderData.deliveryArea || orderData.delivery_area || 'Dhaka',
          delivery_address: orderData.address || orderData.delivery_address,
          subtotal: orderData.subtotal || 0,
          delivery_charge: orderData.deliveryCharge || orderData.delivery_charge || 0,
          total_amount: orderData.total || orderData.total_amount || 0,
          products: orderData.products || orderData.items || [],
          status: orderData.status || 'pending',
          payment_method: String(orderData.paymentMethod || orderData.payment_method || 'cod').toLowerCase() === 'cod' 
            ? 'Cash on Delivery' 
            : String(orderData.paymentMethod || orderData.payment_method || 'UNKNOWN').toUpperCase(),
          sender_phone: orderData.senderPhone || orderData.sender_phone || orderData.transaction_id,
          trx_id: orderData.trxId || orderData.trx_id || orderData.transaction_id,
          referred_by: orderData.referredBy || orderData.referral_code || orderData.referred_by,
          referral_discount: orderData.referralDiscount || 0,
          wallet_amount: orderData.walletAmount || 0
        }
      ])
      .select()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, order: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
