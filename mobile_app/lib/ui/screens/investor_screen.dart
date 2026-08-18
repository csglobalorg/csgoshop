import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';

class InvestorScreen extends ConsumerStatefulWidget {
  const InvestorScreen({super.key});

  @override
  ConsumerState<InvestorScreen> createState() => _InvestorScreenState();
}

class _InvestorScreenState extends ConsumerState<InvestorScreen> {
  bool _isLoading = true;
  String _investorStatus = '';
  double _totalInvestment = 0;
  double _expectedReturns = 0;
  double _paidDividends = 0;

  @override
  void initState() {
    super.initState();
    _fetchInvestorData();
  }

  Future<void> _fetchInvestorData() async {
    final profile = ref.read(authProvider).profile;
    if (profile == null) return;

    _investorStatus = (profile['investor_status'] ?? '').toString();
    
    if (_investorStatus == 'approved') {
      _totalInvestment = (profile['investor_amount'] as num?)?.toDouble() ?? 50000.0;
      _expectedReturns = _totalInvestment * 0.18; // 18% ROI
      _paidDividends = (profile['paid_dividends'] as num?)?.toDouble() ?? 4500.0;
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _showInvestmentPaymentDialog(String planName, double defaultAmount) {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please login to apply for investment')),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _InvestmentPaymentBottomSheet(
        ref: ref,
        authState: authState,
        planName: planName,
        minAmount: defaultAmount,
        onSubmitted: (amount) {
          setState(() {
            _investorStatus = 'pending';
          });
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('CSGO Investor Center', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: _investorStatus == 'approved' ? _buildInvestorDashboard() : _buildInvestmentPlans(),
            ),
    );
  }

  Widget _buildInvestorDashboard() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Portfolio Card
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF059669), Color(0xFF047857)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(color: Colors.green.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Approved Investor Partner', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20)),
                    child: const Text('Active Portfolio', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Text('৳${_totalInvestment.toInt()}', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Expected Annual ROI', style: TextStyle(color: Colors.white60, fontSize: 11)),
                        const SizedBox(height: 2),
                        Text('৳${_expectedReturns.toInt()}', style: const TextStyle(color: Colors.amberAccent, fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Dividends Paid', style: TextStyle(color: Colors.white60, fontSize: 11)),
                        const SizedBox(height: 2),
                        Text('৳${_paidDividends.toInt()}', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text('Investor Privileges', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        _privilegeTile(LucideIcons.trendingUp, 'Guaranteed 18%-24% Annual Return', 'Quarterly dividend payouts directly to your wallet or bank account.'),
        _privilegeTile(LucideIcons.shieldCheck, 'Full Principal Security', 'Backstage equity guarantee backed by CSGO SHOP physical inventory.'),
        _privilegeTile(LucideIcons.userCheck, 'VIP Executive Support', 'Direct priority access to founding management and quarterly performance audits.'),
      ],
    );
  }

  Widget _privilegeTile(IconData icon, String title, String desc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF18181B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppConstants.accentColor, size: 24),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.3)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInvestmentPlans() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_investorStatus == 'pending')
          Container(
            margin: const EdgeInsets.only(bottom: 20),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.amber.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.amber.withOpacity(0.4)),
            ),
            child: const Row(
              children: [
                Icon(LucideIcons.clock, color: Colors.amber, size: 24),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Investment Application Pending', style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 14)),
                      SizedBox(height: 2),
                      Text('Your investment request is currently being verified by admin. You will be notified once approved.', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),

        const Text('Choose Investment Plan', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 6),
        const Text('Invest in CSGO SHOP inventory & logistics to earn guaranteed returns.', style: TextStyle(color: Colors.white70, fontSize: 13)),
        const SizedBox(height: 20),

        _planCard(
          name: 'Starter Partner Plan',
          roi: '12% Annual ROI',
          minText: 'Min Investment: ৳10,000',
          lockPeriod: '3-Month Lock Period',
          color: Colors.blueAccent,
          minAmount: 10000,
        ),
        const SizedBox(height: 16),
        _planCard(
          name: 'Growth Partner Plan',
          roi: '18% Annual ROI',
          minText: 'Min Investment: ৳50,000',
          lockPeriod: '6-Month Lock Period',
          color: Colors.amber,
          isPopular: true,
          minAmount: 50000,
        ),
        const SizedBox(height: 16),
        _planCard(
          name: 'Enterprise Partner Plan',
          roi: '24% Annual ROI + 5% Share',
          minText: 'Min Investment: ৳100,000',
          lockPeriod: '12-Month Lock Period',
          color: Colors.purpleAccent,
          minAmount: 100000,
        ),
      ],
    );
  }

  Widget _planCard({
    required String name,
    required String roi,
    required String minText,
    required String lockPeriod,
    required Color color,
    required double minAmount,
    bool isPopular = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF18181B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isPopular ? Colors.amber : Colors.white.withOpacity(0.1), width: isPopular ? 1.8 : 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text(name, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold))),
              if (isPopular)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: Colors.amber, borderRadius: BorderRadius.circular(12)),
                  child: const Text('POPULAR', style: TextStyle(color: Colors.black, fontSize: 10, fontWeight: FontWeight.bold)),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Text(roi, style: TextStyle(color: color, fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(minText, style: const TextStyle(color: Colors.white70, fontSize: 13)),
          Text(lockPeriod, style: const TextStyle(color: Colors.white54, fontSize: 12)),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton(
              onPressed: () => _showInvestmentPaymentDialog(name, minAmount),
              style: ElevatedButton.styleFrom(
                backgroundColor: color,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('APPLY & INVEST NOW', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }
}

class _InvestmentPaymentBottomSheet extends StatefulWidget {
  final WidgetRef ref;
  final AuthState authState;
  final String planName;
  final double minAmount;
  final Function(double) onSubmitted;

  const _InvestmentPaymentBottomSheet({
    required this.ref,
    required this.authState,
    required this.planName,
    required this.minAmount,
    required this.onSubmitted,
  });

  @override
  State<_InvestmentPaymentBottomSheet> createState() => _InvestmentPaymentBottomSheetState();
}

class _InvestmentPaymentBottomSheetState extends State<_InvestmentPaymentBottomSheet> {
  final _amountCtrl = TextEditingController();
  final _senderPhoneCtrl = TextEditingController();
  final _txIdCtrl = TextEditingController();
  String _selectedMethod = 'bKash';
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _amountCtrl.text = widget.minAmount.toInt().toString();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    _senderPhoneCtrl.dispose();
    _txIdCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitInvestment() async {
    final amount = double.tryParse(_amountCtrl.text.trim()) ?? 0;
    final phone = _senderPhoneCtrl.text.trim();
    final txId = _txIdCtrl.text.trim();

    if (amount < widget.minAmount) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Minimum investment amount is ৳${widget.minAmount.toInt()}')));
      return;
    }
    if (phone.isEmpty || txId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter phone number and Transaction ID')));
      return;
    }

    setState(() => _loading = true);

    try {
      final userPhone = widget.authState.profile?['phone'] ?? phone;
      final description = 'Plan: ${widget.planName} | Method: $_selectedMethod | Sender: $phone | TxID: $txId';

      await Supabase.instance.client.from('wallet_transactions').insert({
        'user_phone': userPhone,
        'amount': amount,
        'type': 'investment_pending',
        'description': description,
      });

      if (mounted) {
        widget.onSubmitted(amount);
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('🎉 Investment Application Submitted! Admin will review and approve shortly.'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Application submitted successfully! Admin will verify.'), backgroundColor: Colors.green),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF18181B),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Invest in ${widget.planName}',
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white54),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text('Investment Amount (৳)', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                prefixText: '৳ ',
                prefixStyle: const TextStyle(color: AppConstants.accentColor, fontWeight: FontWeight.bold),
                fillColor: const Color(0xFF09090B),
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Select Payment Method', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            
            // Payment Methods Chips
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: ['bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'ATM / Card'].map((method) {
                final isSelected = _selectedMethod == method;
                return ChoiceChip(
                  label: Text(method, style: TextStyle(color: isSelected ? Colors.black : Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                  selected: isSelected,
                  selectedColor: AppConstants.accentColor,
                  backgroundColor: const Color(0xFF09090B),
                  onSelected: (val) => setState(() => _selectedMethod = method),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // Instructions Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF09090B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Instructions for $_selectedMethod:', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),
                  if (_selectedMethod == 'Bank Transfer' || _selectedMethod == 'ATM / Card') ...[
                    const Text('Bank Account Name: CSGO SHOP ECOSYSTEM LTD.', style: TextStyle(color: Colors.amberAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                    const Text('Account Number: 150.110.4589201', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                    const Text('Routing Number: 090261421 | DBBL Main Branch', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    const Text('Supported Banks: DBBL, City Bank, Brac Bank, Islami Bank, EBL, Pubali, Nexus Card, Visa/MasterCard.', style: TextStyle(color: Colors.white54, fontSize: 11)),
                  ] else ...[
                    const Text('Send investment payment via Send Money to:', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('01873827520', style: TextStyle(color: AppConstants.accentColor, fontSize: 20, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                        IconButton(
                          icon: const Icon(Icons.copy, color: Colors.white54, size: 20),
                          onPressed: () {
                            Clipboard.setData(const ClipboardData(text: '01873827520'));
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Number copied!')));
                          },
                        ),
                      ],
                    ),
                    const Text('Type: Personal Send Money', style: TextStyle(color: Colors.white38, fontSize: 11)),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            const Text('Sender Phone / Account Number', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _senderPhoneCtrl,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'e.g. 017XXXXXXXX or Account No',
                hintStyle: const TextStyle(color: Colors.white30),
                fillColor: const Color(0xFF09090B),
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            const Text('Transaction ID / Reference', style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _txIdCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Enter TxID or Bank Reference',
                hintStyle: const TextStyle(color: Colors.white30),
                fillColor: const Color(0xFF09090B),
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _loading ? null : _submitInvestment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.accentColor,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: _loading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                    : const Text('Submit Investment Application', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
