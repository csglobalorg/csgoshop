import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter/services.dart';
import '../../providers/auth_provider.dart';
import 'admin_dashboard_screen.dart';
import '../../core/theme/app_theme.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final profile = authState.profile ?? {};
    final walletBalance = profile['wallet_balance'] ?? 0.0;
    final phone = profile['phone'] ?? '';
    final isAdmin = authState.isAdmin;

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Dashboard'),
        actions: [
          if (isAdmin)
            IconButton(
              icon: const Icon(LucideIcons.layoutDashboard, color: AppTheme.primaryAmber),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AdminDashboardScreen()),
              ),
            ),
          IconButton(
            icon: const Icon(LucideIcons.logOut),
            onPressed: () => ref.read(authProvider.notifier).signOut(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(authProvider.notifier).refreshProfile(),
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Wallet Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryAmber, Color(0xFFD97706)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.primaryAmber.withOpacity(0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total Balance',
                        style: TextStyle(
                          color: Colors.black54,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Icon(LucideIcons.wallet, color: Colors.black54),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '৳${walletBalance.toStringAsFixed(0)}',
                    style: const TextStyle(
                      color: Colors.black,
                      fontSize: 36,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      _WalletAction(
                        icon: LucideIcons.arrowUpRight,
                        label: 'Withdraw',
                        onTap: () {},
                      ),
                      const SizedBox(width: 12),
                      _WalletAction(
                        icon: LucideIcons.history,
                        label: 'History',
                        onTap: () {},
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 30),
            
            // Affiliate Section
            const Text(
              'Affiliate Program',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.cardNavy,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Your Referral Link',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.black26,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'https://csgoshop.zya.me/?ref=$phone',
                            style: const TextStyle(fontSize: 12, color: Colors.white54),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      IconButton(
                        icon: const Icon(LucideIcons.copy, size: 20, color: AppTheme.primaryAmber),
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: 'https://csgoshop.zya.me/?ref=$phone'));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Link copied to clipboard!')),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 30),

            // Profile Info
            const Text(
              'Account Information',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _InfoTile(icon: LucideIcons.user, label: 'Name', value: profile['name'] ?? 'N/A'),
            _InfoTile(icon: LucideIcons.phone, label: 'Phone', value: phone),
            _InfoTile(icon: LucideIcons.mail, label: 'Email', value: profile['email'] ?? 'N/A'),
          ],
        ),
      ),
    );
  }
}

class _WalletAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _WalletAction({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: Colors.black12,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: Colors.black87),
              const SizedBox(width: 6),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.black87,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.cardNavy,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: AppTheme.primaryAmber),
          const SizedBox(width: 15),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.white38, fontSize: 10)),
              Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }
}
