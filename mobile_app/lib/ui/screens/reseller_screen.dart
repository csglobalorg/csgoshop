import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../providers/auth_provider.dart';

class ResellerScreen extends ConsumerStatefulWidget {
  const ResellerScreen({super.key});

  @override
  ConsumerState<ResellerScreen> createState() => _ResellerScreenState();
}

class _ResellerScreenState extends ConsumerState<ResellerScreen> {
  bool _isLoading = true;
  String _resellerStatus = '';
  String _tier = 'Silver Reseller';
  double _discountMargin = 12.0;

  @override
  void initState() {
    super.initState();
    _fetchResellerData();
  }

  Future<void> _fetchResellerData() async {
    final profile = ref.read(authProvider).profile;
    if (profile == null) return;

    _resellerStatus = (profile['reseller_status'] ?? '').toString();

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _applyForReseller() async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) return;

    try {
      final phone = authState.profile?['phone'] ?? '';
      
      // Save application transaction log in wallet_transactions table if available
      try {
        await Supabase.instance.client.from('wallet_transactions').insert({
          'user_phone': phone,
          'amount': 0,
          'type': 'reseller_application_pending',
          'description': 'Applied for Wholesale Reseller Account',
        });
      } catch (_) {
        // ignore if schema table constraints differ
      }

      ref.read(authProvider.notifier).updateProfile({'reseller_status': 'pending'});

      if (mounted) {
        setState(() => _resellerStatus = 'pending');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Reseller application submitted! Admin will verify your wholesale account.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('CSGO Reseller Center', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _resellerStatus == 'approved' ? _buildResellerDashboard() : _buildResellerApplyView(),
            ),
    );
  }

  Widget _buildResellerDashboard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Reseller Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF7C3AED), Color(0xFF5B21B6)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(color: Colors.purple.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8)),
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
                      const Icon(LucideIcons.award, color: Colors.amber, size: 22),
                      const SizedBox(width: 8),
                      Text(_tier, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                    child: Text('Margin: $_discountMargin% OFF', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Wholesale Account Active', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 4),
              const Text(
                'You get extra reseller wholesale discounts on all products + direct customer shipping option.',
                style: TextStyle(color: Colors.white54, fontSize: 12, height: 1.4),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),

        const Text('Reseller Utilities', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),

        Container(
          decoration: BoxDecoration(
            color: const Color(0xFF18181B),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.06)),
          ),
          child: Column(
            children: [
              ListTile(
                leading: const Icon(LucideIcons.box, color: Colors.purpleAccent),
                title: const Text('Wholesale Price Catalog', style: TextStyle(color: Colors.white, fontSize: 14)),
                subtitle: const Text('View products with reseller discounts', style: TextStyle(color: Colors.white38, fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, color: Colors.white24),
                onTap: () {},
              ),
              Divider(height: 1, color: Colors.white.withOpacity(0.05)),
              ListTile(
                leading: const Icon(LucideIcons.truck, color: Colors.blueAccent),
                title: const Text('Direct Customer Shipping', style: TextStyle(color: Colors.white, fontSize: 14)),
                subtitle: const Text('Ship directly to your customer with custom name', style: TextStyle(color: Colors.white38, fontSize: 12)),
                trailing: const Icon(Icons.chevron_right, color: Colors.white24),
                onTap: () {},
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildResellerApplyView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            children: [
              const Icon(LucideIcons.shoppingBag, size: 48, color: Colors.purpleAccent),
              const SizedBox(height: 16),
              const Text('Become a CSGO Reseller', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text(
                'Start your own online business without inventory investment. Buy products at wholesale prices and sell to your customers!',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.4),
              ),
              const SizedBox(height: 24),
              if (_resellerStatus == 'pending') ...[
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.purple.withOpacity(0.5)),
                  ),
                  child: const Text('⏳ Status: Reseller Application Under Review', style: TextStyle(color: Colors.purpleAccent, fontWeight: FontWeight.bold)),
                ),
              ] else ...[
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: _applyForReseller,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.purpleAccent,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Apply for Wholesale Reseller Account', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 24),

        const Text('Reseller Tiers & Margins', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        _tierCard('Bronze Reseller', '5% Extra Wholesale OFF', 'First 5 Orders'),
        const SizedBox(height: 10),
        _tierCard('Silver Reseller', '10% Extra Wholesale OFF', '6 - 20 Orders'),
        const SizedBox(height: 10),
        _tierCard('Gold Reseller', '15% Extra Wholesale OFF', '21 - 50 Orders'),
        const SizedBox(height: 10),
        _tierCard('Platinum Reseller', '20% Extra Wholesale OFF', '50+ Orders (VIP Support)'),
      ],
    );
  }

  Widget _tierCard(String title, String margin, String req) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF18181B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
              const SizedBox(height: 2),
              Text(req, style: const TextStyle(color: Colors.white38, fontSize: 11)),
            ],
          ),
          Text(margin, style: const TextStyle(color: Colors.purpleAccent, fontSize: 13, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
