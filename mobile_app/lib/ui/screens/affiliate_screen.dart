import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/auth_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_client.dart';

class AffiliateScreen extends ConsumerStatefulWidget {
  const AffiliateScreen({super.key});

  @override
  ConsumerState<AffiliateScreen> createState() => _AffiliateScreenState();
}

class _AffiliateScreenState extends ConsumerState<AffiliateScreen> {
  bool _isLoading = true;
  String _referralCode = '';
  int _totalClicks = 0;
  int _totalOrders = 0;
  double _totalEarnings = 0;
  String _affiliateStatus = '';
  bool _isApplying = false;

  @override
  void initState() {
    super.initState();
    _fetchAffiliateData();
  }

  Future<void> _fetchAffiliateData() async {
    final profile = ref.read(authProvider).profile;
    if (profile == null) return;
    
    _affiliateStatus = profile['affiliate_status'] ?? '';
    
    if (_affiliateStatus != 'approved') {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
      return;
    }

    final userId = profile['id'];
    final username = (profile['username'] ?? '').toString().trim();
    final fallbackCode = username.isNotEmpty ? username : (profile['phone'] ?? 'CSGO10');

    try {
      final response = await ApiClient.invokeFunction('get-referred-orders', body: {'userId': userId});

      if (response.data != null) {
        final data = response.data;
        if (mounted) {
          setState(() {
            _referralCode = username.isNotEmpty ? username : (data['referralCode'] ?? fallbackCode);
            _totalClicks = data['stats']?['clicks'] ?? 0;
            _totalOrders = data['stats']?['orders'] ?? 0;
            _totalEarnings = (data['stats']?['earnings'] as num?)?.toDouble() ?? 0.0;
            _isLoading = false;
          });
        }
        return;
      }
    } catch (e) {
      print('Failed to fetch affiliate data: $e');
    }

    if (mounted) {
      setState(() {
        _referralCode = fallbackCode;
        _isLoading = false;
      });
    }
  }

  Future<void> _applyForAffiliate() async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) return;

    setState(() => _isApplying = true);

    try {
      final response = await ApiClient.invokeFunction('supabase-user-data', body: {
          'action': 'update_profile',
          'auth': {'phone': authState.profile!['phone']},
          'data': {'affiliate_status': 'pending'}
        });

      if (response.data['success'] == true) {
          ref.read(authProvider.notifier).updateProfile({'affiliate_status': 'pending'});
          if (mounted) {
            setState(() {
              _affiliateStatus = 'pending';
              _isApplying = false;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('Application submitted successfully!'),
                backgroundColor: Colors.green,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            );
          }
          return;
      }
      throw Exception('Failed to apply');
    } catch (e) {
      if (mounted) {
        setState(() => _isApplying = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _copyLink() {
    final link = 'https://csgoshop.zya.me/?ref=$_referralCode';
    Clipboard.setData(ClipboardData(text: link));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Referral link copied: $link'),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _copyCode() {
    Clipboard.setData(ClipboardData(text: _referralCode));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Referral code copied to clipboard!'),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _showWithdrawDialog() {
    final amountCtrl = TextEditingController(text: _totalEarnings.toStringAsFixed(0));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Withdraw to Wallet', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Available: ৳${_totalEarnings.toStringAsFixed(0)}',
              style: const TextStyle(color: Colors.green, fontSize: 13)),
            const SizedBox(height: 12),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Amount (৳)',
                labelStyle: const TextStyle(color: Colors.white54),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Colors.white24),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF047857)),
                ),
                prefixText: '৳ ',
                prefixStyle: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Colors.white54)),
          ),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountCtrl.text.trim()) ?? 0;
              if (amount <= 0 || amount > _totalEarnings) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Invalid amount'), backgroundColor: Colors.red),
                );
                return;
              }
              Navigator.pop(ctx);
              try {
                final profile = ref.read(authProvider).profile;
                await ApiClient.invokeFunction('supabase-user-data', body: {
                  'action': 'affiliate_withdraw',
                  'auth': {'phone': profile?['phone']},
                  'data': {'amount': amount},
                });
                setState(() => _totalEarnings -= amount);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('৳${amount.toStringAsFixed(0)} transferred to wallet!'),
                      backgroundColor: Colors.green,
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF047857),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Confirm Withdraw', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.primaryNavy,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Affiliate Program', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _buildContent(),
            ),
    );
  }

  Widget _buildContent() {
    if (_affiliateStatus == 'approved') {
      final profile = ref.read(authProvider).profile;
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Profile Header
          Container(
            padding: const EdgeInsets.all(16),
            margin: const EdgeInsets.only(bottom: 24),
            decoration: BoxDecoration(
              color: AppTheme.cardNavy,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 25,
                  backgroundColor: AppTheme.primaryAmber.withOpacity(0.1),
                  child: const Icon(LucideIcons.user, color: AppTheme.primaryAmber, size: 20),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile?['name'] ?? 'User',
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    Text(
                      profile?['username'] != null ? '@${profile!['username']}' : 'Set a username in settings',
                      style: const TextStyle(color: Colors.white38, fontSize: 12),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          // Hero Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Icon(LucideIcons.users, size: 48, color: Colors.white),
                const SizedBox(height: 16),
                const Text('Refer & Earn', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text(
                  'Share your referral link and earn commissions on every successful order!',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(height: 20),

                // Referral Code Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Code: ', style: TextStyle(color: Colors.white70, fontSize: 13)),
                      Text(_referralCode, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 12),
                      InkWell(
                        onTap: _copyCode,
                        child: const Icon(LucideIcons.copy, color: Colors.white, size: 18),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // Full Referral Link Box
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.25),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.15)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        'https://csgoshop.zya.me/?ref=$_referralCode',
                        style: const TextStyle(color: AppTheme.primaryAmber, fontSize: 13, fontWeight: FontWeight.w600),
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 10),
                      ElevatedButton.icon(
                        onPressed: _copyLink,
                        icon: const Icon(LucideIcons.link, size: 16, color: Colors.black),
                        label: const Text('Copy Referral Link', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 13)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryAmber,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          
          const Text('Your Statistics', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          
          // Stats Grid
          Row(
            children: [
              Expanded(child: _StatCard(title: 'Clicks', value: '$_totalClicks', icon: LucideIcons.mousePointerClick, color: Colors.blue)),
              const SizedBox(width: 16),
              Expanded(child: _StatCard(title: 'Orders', value: '$_totalOrders', icon: LucideIcons.shoppingBag, color: Colors.green)),
            ],
          ),
          const SizedBox(height: 16),
          _StatCard(title: 'Total Earnings', value: '৳${_totalEarnings.toStringAsFixed(0)}', icon: LucideIcons.banknote, color: AppTheme.primaryAmber, isFullWidth: true),
          
          const SizedBox(height: 24),

          // ── Deposit / Withdraw Section ──────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [const Color(0xFF065F46), const Color(0xFF047857)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.green.withOpacity(0.3)),
              boxShadow: [
                BoxShadow(color: Colors.green.withOpacity(0.2), blurRadius: 20, offset: const Offset(0, 8)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(LucideIcons.wallet, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    const Text('Withdraw Earnings', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        'Balance: ৳${_totalEarnings.toStringAsFixed(0)}',
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Text(
                  'Transfer your affiliate earnings to your wallet and use it for shopping or cash out.',
                  style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _totalEarnings > 0 ? _showWithdrawDialog : null,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF047857),
                          disabledBackgroundColor: Colors.white30,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        icon: const Icon(LucideIcons.arrowDownToLine, size: 16),
                        label: const Text('Withdraw to Wallet', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // ── How it works ────────────────────────────────────────────
          const Text('How It Works', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          _HowItWorksStep(step: '1', title: 'Share your code', desc: 'Share your referral code $_referralCode with friends & family'),
          const SizedBox(height: 8),
          _HowItWorksStep(step: '2', title: 'They shop', desc: 'When they place an order using your code, you earn commission'),
          const SizedBox(height: 8),
          _HowItWorksStep(step: '3', title: 'You earn', desc: 'Withdraw earnings to your wallet anytime'),
        ],
      );
    } else if (_affiliateStatus == 'pending') {
      return Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 40),
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: AppTheme.cardNavy,
          border: Border.all(color: Colors.blue.withOpacity(0.3)),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: [
            const Icon(LucideIcons.clock, size: 60, color: Colors.blue),
            const SizedBox(height: 20),
            const Text('Application Pending', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const Text(
              'Your affiliate application is currently under review by our admin team. We\'ll notify you once it\'s approved!',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.blue.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue.withOpacity(0.5)),
              ),
              child: const Text('Status: Pending Review', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    } else {
      return Container(
        width: double.infinity,
        margin: const EdgeInsets.only(top: 40),
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: AppTheme.cardNavy,
          border: Border.all(color: Colors.white.withOpacity(0.1)),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          children: [
            const Icon(LucideIcons.rocket, size: 60, color: AppTheme.primaryAmber),
            const SizedBox(height: 20),
            const Text('Start Earning Today', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            const Text(
              'Join our affiliate program and earn commissions on every successful referral. No investment required!',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.5),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isApplying ? null : _applyForAffiliate,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryAmber,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isApplying
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Apply to Become an Affiliate', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      );
    }
  }
}

class _HowItWorksStep extends StatelessWidget {
  final String step;
  final String title;
  final String desc;
  const _HowItWorksStep({required this.step, required this.title, required this.desc});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          Container(
            width: 32, height: 32,
            decoration: const BoxDecoration(
              color: AppTheme.primaryAmber,
              shape: BoxShape.circle,
            ),
            child: Center(child: Text(step, style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 14))),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
                Text(desc, style: const TextStyle(color: Colors.white54, fontSize: 12, height: 1.3)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final bool isFullWidth;

  const _StatCard({required this.title, required this.value, required this.icon, required this.color, this.isFullWidth = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.cardNavy,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: isFullWidth ? CrossAxisAlignment.center : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: isFullWidth ? MainAxisAlignment.center : MainAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(color: Colors.white70, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(color: Colors.white, fontSize: isFullWidth ? 28 : 24, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
