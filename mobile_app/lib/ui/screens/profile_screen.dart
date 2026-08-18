import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/auth_provider.dart';
import 'account_settings_screen.dart';
import 'shipping_address_screen.dart';
import 'payment_methods_screen.dart';
import 'wishlist_screen.dart';
import 'affiliate_screen.dart';
import 'support_screen.dart';
import 'login_screen.dart';
import 'admin_dashboard_screen.dart';
import 'wallet_history_screen.dart';
import 'orders_screen.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final profile = authState.profile;
    final ordersAsync = ref.watch(ordersProvider);

    int pendingCount = 0;
    int processingCount = 0;
    int deliveredCount = 0;
    int returnsCount = 0;

    ordersAsync.whenData((orders) {
      for (var o in orders) {
        final status = (o['status'] ?? 'pending').toString().toLowerCase();
        if (status == 'pending') {
          pendingCount++;
        } else if (status == 'processing' || status == 'shipped') {
          processingCount++;
        } else if (status == 'delivered') {
          deliveredCount++;
        } else if (status == 'returned' || status == 'refunded' || status == 'cancelled') {
          returnsCount++;
        }
      }
    });

    if (profile == null) {
      return SafeArea(
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.user, size: 64, color: Colors.white24),
              const SizedBox(height: 16),
            const Text(
              'Join CSGO SHOP',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Login to see your profile and orders',
              style: TextStyle(color: Colors.white38, fontSize: 12),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context, 
                MaterialPageRoute(builder: (context) => const LoginScreen())
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppConstants.accentColor,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('LOGIN / REGISTER'),
            ),
          ],
        ),
      ),
    );
  }

  return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('My Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppConstants.surfaceColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: AppConstants.accentColor, width: 2),
                    ),
                    child: CircleAvatar(
                      radius: 26,
                      backgroundColor: AppConstants.accentColor.withOpacity(0.1),
                      backgroundImage: (profile['avatar_url'] != null && profile['avatar_url'].toString().isNotEmpty)
                          ? NetworkImage(profile['avatar_url'].toString())
                          : null,
                      child: (profile['avatar_url'] == null || profile['avatar_url'].toString().isEmpty)
                          ? const Icon(LucideIcons.user, color: AppConstants.accentColor, size: 28)
                          : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          profile['name'] ?? 'User',
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          profile['phone'] ?? '',
                          style: const TextStyle(color: Colors.white54, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  if (authState.isAdmin)
                    IconButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const AdminDashboardScreen()),
                      ),
                      icon: const Icon(LucideIcons.shieldCheck, color: AppConstants.accentColor),
                    ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            const Text('My Orders', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            
            // Order Status Grid
            Row(
              children: [
                _buildOrderStatusCard('Pending', LucideIcons.clock, '$pendingCount', AppConstants.accentColor),
                const SizedBox(width: 12),
                _buildOrderStatusCard('Processing', LucideIcons.package, '$processingCount', const Color(0xFF3B82F6)),
              ]
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildOrderStatusCard('Delivered', LucideIcons.checkCircle, '$deliveredCount', const Color(0xFF10B981)),
                const SizedBox(width: 12),
                _buildOrderStatusCard('Returns', LucideIcons.refreshCcw, '$returnsCount', const Color(0xFFEF4444)),
              ]
            ),

            const SizedBox(height: 24),
            const Text('My Wallet', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            
            // Wallet Overview
            _buildWalletCard(context, profile['wallet_balance'] ?? 0),

            const SizedBox(height: 24),
            const Text('Affiliate Program', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            
            // Affiliate Dashboard Card
            _buildAffiliateCard(context, profile['phone'] ?? ''),

            const SizedBox(height: 24),
            const Text('Settings & Support', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            
            // Menu Items Grouped
            Container(
               decoration: BoxDecoration(
                  color: AppConstants.surfaceColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
               ),
               child: Column(
                 children: [
                   _menuItem(LucideIcons.settings, 'Account Settings', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountSettingsScreen())), true),
                   _menuItem(LucideIcons.mapPin, 'Shipping Address', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ShippingAddressScreen())), true),
                   _menuItem(LucideIcons.creditCard, 'Payment Methods', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PaymentMethodsScreen())), true),
                   _menuItem(LucideIcons.heart, 'My Wishlist', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WishlistScreen())), true),
                   _menuItem(LucideIcons.helpCircle, 'Support Center', () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SupportScreen())), false),
                 ]
               )
            ),
            
            const SizedBox(height: 24),

            // Logout
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () => ref.read(authProvider.notifier).logout(),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFFEF4444),
                  side: BorderSide(color: const Color(0xFFEF4444).withOpacity(0.3)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  backgroundColor: const Color(0xFFEF4444).withOpacity(0.05),
                ),
                child: const Text('LOGOUT', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
              ),
            ),
            const SizedBox(height: 24),
            Center(
              child: Text(
                'CSGO SHOP v3.1.0',
                style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderStatusCard(String title, IconData icon, String count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppConstants.surfaceColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                Text(count, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            Text(title, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _buildWalletCard(BuildContext context, dynamic balance) {
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WalletHistoryScreen())),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [AppConstants.accentColor, Color(0xFFD97706)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(color: AppConstants.accentColor.withOpacity(0.25), blurRadius: 20, offset: const Offset(0, 8)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Available Balance', style: TextStyle(color: Colors.black54, fontWeight: FontWeight.w700)),
                Icon(LucideIcons.wallet, color: Colors.black54),
              ],
            ),
            const SizedBox(height: 8),
            Text('৳$balance', style: const TextStyle(color: Colors.black, fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: -0.5)),
            const SizedBox(height: 20),
            Row(
              children: [
                _walletStat('Pending', '৳0.00'),
                Container(width: 1, height: 30, color: Colors.black12, margin: const EdgeInsets.symmetric(horizontal: 16)),
                _walletStat('Total Earnings', '৳$balance'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _walletStat(String label, String amount) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.black54, fontSize: 11, fontWeight: FontWeight.w700)),
        const SizedBox(height: 4),
        Text(amount, style: const TextStyle(color: Colors.black, fontSize: 15, fontWeight: FontWeight.w900)),
      ],
    );
  }

  Widget _buildAffiliateCard(BuildContext context, String phone) {
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AffiliateScreen())),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppConstants.surfaceColor,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppConstants.accentColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(LucideIcons.share2, color: AppConstants.accentColor, size: 18),
                    ),
                    const SizedBox(width: 12),
                    const Text('Current Rank', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppConstants.accentColor.withOpacity(0.1),
                    border: Border.all(color: AppConstants.accentColor.withOpacity(0.3)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text('BRONZE', style: TextStyle(color: AppConstants.accentColor, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Text('Your Referral Link', style: TextStyle(color: Colors.white38, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black26,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Text('https://csgoshop.zya.me/?ref=$phone', style: const TextStyle(color: Colors.white54, fontSize: 12), overflow: TextOverflow.ellipsis),
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [AppConstants.accentColor, Color(0xFFFF8C00)]),
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: [
                      BoxShadow(color: AppConstants.accentColor.withOpacity(0.3), blurRadius: 8),
                    ],
                  ),
                  child: const Icon(LucideIcons.copy, color: Colors.black, size: 20),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _menuItem(IconData icon, String title, VoidCallback onTap, bool showDivider) {
    return Column(
      children: [
        ListTile(
          onTap: onTap,
          leading: Icon(icon, color: Colors.white70, size: 20),
          title: Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
          trailing: const Icon(Icons.chevron_right, color: Colors.white24, size: 16),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        ),
        if (showDivider)
          Divider(height: 1, color: Colors.white.withOpacity(0.05), indent: 56),
      ],
    );
  }
}
