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
      .select('id, name, username, phone, email, affiliate_status, commission_rate, wallet_balance')
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
        if (data?.name !== undefined) userMetadata.name = data.name;
        if (data?.username !== undefined) userMetadata.username = data.username;
        if (data?.avatar_url !== undefined) userMetadata.avatar_url = data.avatar_url;
        if (data?.csgo_coins !== undefined) userMetadata.csgo_coins = data.csgo_coins;
        if (data?.wallet_balance !== undefined) userMetadata.wallet_balance = data.wallet_balance;
        if (data?.last_checkin_date !== undefined) userMetadata.last_checkin_date = data.last_checkin_date;
        if (data?.checkin_streak !== undefined) userMetadata.checkin_streak = data.checkin_streak;
        if (data?.role !== undefined) userMetadata.role = data.role;
        if (data?.daily_free_spins !== undefined) userMetadata.daily_free_spins = data.daily_free_spins;
        if (data?.order_bonus_spins !== undefined) userMetadata.order_bonus_spins = data.order_bonus_spins;
        if (data?.last_spin_date !== undefined) userMetadata.last_spin_date = data.last_spin_date;

        if (Object.keys(userMetadata).length > 0) {
          updates.user_metadata = userMetadata;
        }
        
        // Update users table
        const usersTableUpdates: any = {};
        if (data?.name !== undefined) usersTableUpdates.name = data.name;
        if (data?.username !== undefined) usersTableUpdates.username = data.username;
        if (data?.avatar_url !== undefined) usersTableUpdates.avatar_url = data.avatar_url;
        if (data?.csgo_coins !== undefined) usersTableUpdates.csgo_coins = data.csgo_coins;
        if (data?.wallet_balance !== undefined) usersTableUpdates.wallet_balance = data.wallet_balance;
        if (data?.last_checkin_date !== undefined) usersTableUpdates.last_checkin_date = data.last_checkin_date;
        if (data?.checkin_streak !== undefined) usersTableUpdates.checkin_streak = data.checkin_streak;
        if (data?.role !== undefined) usersTableUpdates.role = data.role;
        if (data?.daily_free_spins !== undefined) usersTableUpdates.daily_free_spins = data.daily_free_spins;
        if (data?.order_bonus_spins !== undefined) usersTableUpdates.order_bonus_spins = data.order_bonus_spins;
        if (data?.last_spin_date !== undefined) usersTableUpdates.last_spin_date = data.last_spin_date;

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

      // ==========================================
      // MARKETING PARTNER / AFFILIATE ACTIONS
      // ==========================================
      case 'get_partner_public_stats': {
        // Publicly query count of approved/pending partners for real 100-slot counter
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .not('affiliate_status', 'is', null);

        const filledSlots = count || 0;
        return new Response(JSON.stringify({ 
          success: true, 
          totalSlots: 100, 
          filledSlots: filledSlots, 
          availableSlots: Math.max(0, 100 - filledSlots) 
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_partner_stats': {
        const username = userData.username || '';
        const phone = userData.phone || '';

        // Query all referred orders
        const { data: allReferredOrders } = await supabase
          .from('orders')
          .select('id, created_at, total_amount, status, affiliate_code, subtotal')
          .or(`affiliate_code.eq."${username}",affiliate_code.eq."${phone}"`)
          .order('created_at', { ascending: false });

        // Query click counts
        const { count: clickCount } = await supabase
          .from('affiliate_clicks')
          .select('*', { count: 'exact', head: true })
          .or(`referred_by.eq."${username}",referred_by.eq."${phone}"`);

        // Query previous milestone records to prevent duplicate awards
        const { data: milestoneHistory } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_phone', phone)
          .like('type', 'partner_milestone%');

        const claimedMilestones = new Set(
          (milestoneHistory || []).map((m: any) => m.type.replace('partner_milestone_', ''))
        );

        // Strict calculation: ONLY successfully delivered orders count toward milestones
        const validOrders = (allReferredOrders || []).filter((o: any) => {
          const s = (o.status || '').toLowerCase().trim();
          return s === 'delivered' || s === 'completed' || s === 'complete' || s === 'complate';
        });

        const pendingOrders = (allReferredOrders || []).filter((o: any) => {
          const s = (o.status || '').toLowerCase().trim();
          return s === 'pending' || s === 'processing' || s === 'shipped' || s === 'in transit';
        });

        const successfulOrdersCount = validOrders.length;

        // Determine Milestone Unlocks & Commission Boost
        let earnedBonusTotal = 0;
        let commissionBoost = 0;
        let rank = 'Starter';
        let nextMilestoneOrders = 50;
        let nextReward = { bonus: 300, boost: 0, travel: null, text: '৳300 Cash Bonus' };

        const milestoneTiers = [
          { target: 50, bonus: 300, boost: 0, rank: 'Bronze Partner', travel: null, title: '50 Orders' },
          { target: 100, bonus: 700, boost: 0, rank: 'Bronze Partner', travel: null, title: '100 Orders' },
          { target: 200, bonus: 2000, boost: 1, rank: 'Silver Partner', travel: "Cox's Bazar 1D/1N", title: '200 Orders' },
          { target: 500, bonus: 4500, boost: 2, rank: 'Gold Partner', travel: 'Srimangal 2D/1N', title: '500 Orders' },
          { target: 1000, bonus: 9000, boost: 3, rank: 'Platinum Partner', travel: 'Rangamati/Sajek 2D/1N', title: '1,000 Orders' },
          { target: 2000, bonus: 20000, boost: 5, rank: 'Elite Partner', travel: 'Premium Bangladesh Tour 3D/2N', title: '2,000 Orders' },
        ];

        // Evaluate milestones
        for (const tier of milestoneTiers) {
          if (successfulOrdersCount >= tier.target) {
            earnedBonusTotal += tier.bonus;
            commissionBoost = Math.max(commissionBoost, tier.boost);
            rank = tier.rank;
          }
        }

        // Determine next milestone
        const upcomingTier = milestoneTiers.find(t => successfulOrdersCount < t.target);
        if (upcomingTier) {
          nextMilestoneOrders = upcomingTier.target;
          nextReward = {
            bonus: upcomingTier.bonus,
            boost: upcomingTier.boost,
            travel: upcomingTier.travel,
            text: `৳${upcomingTier.bonus.toLocaleString()}` + (upcomingTier.boost ? ` +${upcomingTier.boost}% Boost` : '') + (upcomingTier.travel ? ` + ${upcomingTier.travel}` : '')
          };
        } else {
          nextMilestoneOrders = 2000;
          nextReward = { bonus: 20000, boost: 5, travel: 'Premium Bangladesh Tour 3D/2N', text: 'Max Elite Milestone Achieved!' };
        }

        // Base commission rate (default 10% or custom from user table) + active boost
        const baseRate = parseFloat(userData.commission_rate || 10) / 100;
        const activeRate = baseRate + (commissionBoost / 100);

        // Compute earnings
        let deliveredCommission = 0;
        validOrders.forEach((o: any) => {
          const amt = parseFloat(o.subtotal || o.total_amount || 0);
          deliveredCommission += (amt * activeRate);
        });

        let pendingCommission = 0;
        pendingOrders.forEach((o: any) => {
          const amt = parseFloat(o.subtotal || o.total_amount || 0);
          pendingCommission += (amt * activeRate);
        });

        // Query payout history & wallet withdrawals for partner
        const { data: partnerPayouts } = await supabase
          .from('payout_requests')
          .select('*')
          .eq('user_phone', phone)
          .order('created_at', { ascending: false });

        let withdrawnCommission = 0;
        (partnerPayouts || []).forEach((p: any) => {
          if (p.status === 'paid' || p.status === 'pending') {
            withdrawnCommission += parseFloat(p.amount || 0);
          }
        });

        const totalEarned = deliveredCommission + earnedBonusTotal;
        const availableBalance = Math.max(0, deliveredCommission + earnedBonusTotal - withdrawnCommission);

        // Auto-award any new unlocked milestone bonus idempotently to wallet
        for (const tier of milestoneTiers) {
          if (successfulOrdersCount >= tier.target && !claimedMilestones.has(tier.target.toString())) {
            // Award bonus to wallet_transactions
            await supabase.from('wallet_transactions').insert({
              user_phone: phone,
              amount: tier.bonus,
              type: `partner_milestone_${tier.target}`,
              description: `🎉 Marketing Partner Milestone Unlocked (${tier.title}): ৳${tier.bonus} Bonus Awarded`
            });
            claimedMilestones.add(tier.target.toString());
          }
        }

        return new Response(JSON.stringify({
          success: true,
          stats: {
            clicks: clickCount || 0,
            successfulOrders: successfulOrdersCount,
            totalOrders: (allReferredOrders || []).length,
            deliveredCommission: Math.round(deliveredCommission),
            pendingCommission: Math.round(pendingCommission),
            earnedBonuses: earnedBonusTotal,
            totalEarnings: Math.round(totalEarned),
            availableBalance: Math.round(availableBalance),
            rank: rank,
            commissionBoost: commissionBoost,
            activeCommissionRate: Math.round(activeRate * 100),
            nextMilestoneOrders: nextMilestoneOrders,
            ordersRemaining: Math.max(0, nextMilestoneOrders - successfulOrdersCount),
            nextReward: nextReward,
            milestones: milestoneTiers.map(t => ({
              ...t,
              status: claimedMilestones.has(t.target.toString()) || successfulOrdersCount >= t.target
                ? 'UNLOCKED'
                : (successfulOrdersCount >= (t.target * 0.5) ? 'IN PROGRESS' : 'LOCKED')
            })),
            referredOrders: allReferredOrders || [],
            payoutHistory: partnerPayouts || []
          }
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'affiliate_withdraw': {
        const amount = parseFloat(data?.amount || 0);
        const paymentMethod = data?.payment_method || 'bKash';
        const paymentDetails = data?.payment_details || userData.phone;

        if (amount < 500) {
          throw new Error('Minimum withdrawal amount is ৳500');
        }

        const { data: payout, error: payoutErr } = await supabase
          .from('payout_requests')
          .insert({
            user_phone: userData.phone,
            amount: amount,
            payment_method: paymentMethod,
            payment_details: paymentDetails,
            status: 'pending'
          })
          .select()
          .single();

        if (payoutErr) throw payoutErr;

        return new Response(JSON.stringify({ success: true, payout: payout }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
