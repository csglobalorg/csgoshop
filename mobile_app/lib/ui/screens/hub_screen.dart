import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';
import 'profile_screen.dart';
import 'orders_screen.dart';
import 'wishlist_screen.dart';
import 'wallet_history_screen.dart';
import 'affiliate_screen.dart';
import 'investor_screen.dart';
import 'reseller_screen.dart';
import 'rewards_screen.dart';
import 'notifications_screen.dart';
import 'support_screen.dart';
import 'account_settings_screen.dart';
import 'shipping_address_screen.dart';
import 'payment_methods_screen.dart';
import 'admin_dashboard_screen.dart';

class HubScreen extends ConsumerWidget {
  const HubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final profile = authState.profile;
    final name = profile?['name'] ?? 'CSGO Customer';
    final username = profile?['username'] ?? profile?['phone'] ?? 'User';
    final balance = (profile?['wallet_balance'] ?? 0) as num;
    final csgoCoins = (profile?['csgo_coins'] as num?)?.toInt() ?? 0;
    final affiliateStatus = (profile?['affiliate_status'] ?? '').toString();
    final investorStatus = (profile?['investor_status'] ?? '').toString();
    final resellerStatus = (profile?['reseller_status'] ?? '').toString();
    final isStaff = (profile?['is_staff'] == true) || (profile?['role'] == 'admin') || (profile?['role'] == 'super_admin');

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Row(
          children: [
            Icon(LucideIcons.sparkles, color: AppConstants.accentColor, size: 20),
            SizedBox(width: 8),
            Text(
              'CSGO Ecosystem Hub',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())),
            icon: const Icon(LucideIcons.bell, color: Colors.white70),
          ),
          IconButton(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountSettingsScreen())),
            icon: const Icon(LucideIcons.settings, color: Colors.white70),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── User Header Banner ─────────────────────────────────────────
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 15, offset: const Offset(0, 6)),
                ],
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: AppConstants.accentColor.withOpacity(0.2),
                    backgroundImage: (profile != null && profile['avatar_url'] != null && profile['avatar_url'].toString().isNotEmpty)
                        ? NetworkImage(profile['avatar_url'].toString())
                        : null,
                    child: (profile == null || profile['avatar_url'] == null || profile['avatar_url'].toString().isEmpty)
                        ? Text(
                            name.isNotEmpty ? name[0].toUpperCase() : 'C',
                            style: const TextStyle(color: AppConstants.accentColor, fontSize: 24, fontWeight: FontWeight.bold),
                          )
                        : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '@$username',
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            _badge('Customer', Colors.blue),
                            if (affiliateStatus == 'approved') _badge('Affiliate', Colors.amber),
                            if (investorStatus == 'approved') _badge('Investor', Colors.green),
                            if (resellerStatus == 'approved') _badge('Reseller', Colors.purple),
                            if (isStaff) _badge('Admin', Colors.redAccent),
                          ],
                        )
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen())),
                    icon: const Icon(LucideIcons.chevronRight, color: Colors.white38),
                  )
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Quick Balance & Rewards Bar ──────────────────────────────
            Row(
              children: [
                Expanded(
                  child: _quickStatCard(
                    title: 'Wallet Balance',
                    value: '৳$balance',
                    icon: LucideIcons.wallet,
                    color: AppConstants.accentColor,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletHistoryScreen())),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _quickStatCard(
                    title: 'CSGO Rewards',
                    value: '$csgoCoins Coins',
                    icon: LucideIcons.gift,
                    color: Colors.purpleAccent,
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RewardsScreen())),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // ── Section 1: Customer Center ─────────────────────────────
            _sectionTitle('Shopping & Orders'),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF18181B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Column(
                children: [
                  _hubTile(context, LucideIcons.package, 'My Orders', 'Track & manage order status', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const OrdersScreen()))),
                  _divider(),
                  _hubTile(context, LucideIcons.heart, 'My Wishlist', 'Saved favorite products', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WishlistScreen()))),
                  _divider(),
                  _hubTile(context, LucideIcons.wallet, 'Wallet & Deposits', 'Deposit, withdraw & transaction history', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletHistoryScreen()))),
                  _divider(),
                  _hubTile(context, LucideIcons.mapPin, 'Shipping Address', 'Manage delivery addresses', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ShippingAddressScreen()))),
                  _divider(),
                  _hubTile(context, LucideIcons.creditCard, 'Payment Accounts', 'Saved bKash, Nagad & card accounts', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentMethodsScreen()))),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Section 2: Partner Ecosystem (Progressive Disclosure) ──
            _sectionTitle('Earn & Partner Ecosystem'),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF18181B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Column(
                children: [
                  _hubTile(
                    context,
                    LucideIcons.users,
                    'Affiliate Program',
                    affiliateStatus == 'approved' ? 'Earn commissions on referrals' : 'Apply to become an affiliate',
                    () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AffiliateScreen())),
                    badgeText: affiliateStatus == 'approved' ? 'ACTIVE' : null,
                    badgeColor: Colors.amber,
                  ),
                  _divider(),
                  _hubTile(
                    context,
                    LucideIcons.trendingUp,
                    'Investor Center',
                    investorStatus == 'approved' ? 'View portfolio, ROI % & dividends' : 'Explore investment plans & partnerships',
                    () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InvestorScreen())),
                    badgeText: investorStatus == 'approved' ? 'INVESTOR' : '18-24% ROI',
                    badgeColor: Colors.green,
                  ),
                  _divider(),
                  _hubTile(
                    context,
                    LucideIcons.shoppingBag,
                    'Reseller Hub',
                    resellerStatus == 'approved' ? 'Wholesale prices & customer dispatch' : 'Join wholesale reseller network',
                    () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ResellerScreen())),
                    badgeText: resellerStatus == 'approved' ? 'RESELLER' : 'WHOLESALE',
                    badgeColor: Colors.purple,
                  ),
                  _divider(),
                  _hubTile(
                    context,
                    LucideIcons.dices,
                    'Rewards & Daily Spin',
                    'Daily check-in, lucky wheel & coin exchange',
                    () => Navigator.push(context, MaterialPageRoute(builder: (_) => const RewardsScreen())),
                    badgeText: 'FREE COINS',
                    badgeColor: Colors.pinkAccent,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ── Section 3: Support & Admin ──────────────────────────────
            _sectionTitle('Help & System'),
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF18181B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Column(
                children: [
                  _hubTile(context, LucideIcons.headphones, '24/7 Customer Support', 'Live Chat, WhatsApp & Helpline', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SupportScreen()))),
                  _divider(),
                  _hubTile(context, LucideIcons.bell, 'Notifications & Alerts', 'Order updates & promo offers', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen()))),
                  _divider(),
                  _hubTile(context, LucideIcons.settings, 'Account Settings', 'Profile, password & preferences', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountSettingsScreen()))),
                  if (isStaff) ...[
                    _divider(),
                    _hubTile(
                      context,
                      LucideIcons.shieldCheck,
                      'Admin Control Center',
                      'Enterprise store management',
                      () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminDashboardScreen())),
                      badgeText: 'ADMIN',
                      badgeColor: Colors.redAccent,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
    );
  }

  Widget _quickStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF18181B),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(value, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _hubTile(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap, {
    String? badgeText,
    Color? badgeColor,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.06),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
      title: Row(
        children: [
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
          if (badgeText != null) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: (badgeColor ?? AppConstants.accentColor).withOpacity(0.2),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: (badgeColor ?? AppConstants.accentColor).withOpacity(0.5), width: 0.8),
              ),
              child: Text(
                badgeText,
                style: TextStyle(color: badgeColor ?? AppConstants.accentColor, fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ],
      ),
      subtitle: Text(subtitle, style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 12)),
      trailing: const Icon(Icons.chevron_right, color: Colors.white24, size: 18),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }

  Widget _divider() {
    return Divider(height: 1, color: Colors.white.withOpacity(0.04), indent: 56);
  }

  Widget _badge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.4), width: 0.8),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}
