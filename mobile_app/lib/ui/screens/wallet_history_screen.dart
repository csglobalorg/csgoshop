import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide AuthState;
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';

final walletTransactionsProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final authState = ref.watch(authProvider);
  if (authState.profile == null) return [];

  final response = await Supabase.instance.client
      .from('wallet_transactions')
      .select('*')
      .eq('user_phone', authState.profile!['phone'])
      .order('created_at', ascending: false);

  return List<Map<String, dynamic>>.from(response);
});

class WalletHistoryScreen extends ConsumerWidget {
  const WalletHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final transactionsAsync = ref.watch(walletTransactionsProvider);
    final balance = authState.profile?['wallet_balance'] ?? 0;

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Wallet History', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Wallet Balance Header
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppConstants.accentColor, Color(0xFFD97706)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppConstants.accentColor.withOpacity(0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                )
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.wallet, color: Colors.white, size: 32),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Available Balance', style: TextStyle(color: Colors.white70, fontSize: 14)),
                    const SizedBox(height: 4),
                    Text('৳$balance', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                  ],
                ),
              ],
            ),
          ),

          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text('Recent Transactions', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            ),
          ),

          // Transactions List
          Expanded(
            child: transactionsAsync.when(
              data: (transactions) {
                if (transactions.isEmpty) {
                  return const Center(
                    child: Text('No transactions yet', style: TextStyle(color: Colors.white38)),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: transactions.length,
                  itemBuilder: (context, index) {
                    final tx = transactions[index];
                    final amount = tx['amount'];
                    final isPositive = amount > 0;
                    final type = tx['type'] ?? 'transaction';
                    final date = DateTime.parse(tx['created_at']);
                    final formattedDate = DateFormat('dd MMM yyyy, hh:mm a').format(date);

                    IconData icon;
                    Color iconColor;

                    if (type == 'cashback' || type == 'refund' || type == 'commission') {
                      icon = LucideIcons.arrowDownLeft;
                      iconColor = Colors.green;
                    } else if (type == 'payment' || type == 'withdrawal') {
                      icon = LucideIcons.arrowUpRight;
                      iconColor = Colors.redAccent;
                    } else {
                      icon = LucideIcons.activity;
                      iconColor = Colors.blue;
                    }

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppConstants.surfaceColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: iconColor.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(icon, color: iconColor, size: 20),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(tx['description'] ?? 'Transaction', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
                                const SizedBox(height: 4),
                                Text(formattedDate, style: const TextStyle(color: Colors.white38, fontSize: 12)),
                              ],
                            ),
                          ),
                          Text(
                            '${isPositive ? '+' : ''}৳${amount.abs()}',
                            style: TextStyle(
                              color: isPositive ? Colors.green : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
            ),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton.extended(
            heroTag: 'withdraw',
            onPressed: () => _showWithdrawDialog(context, ref, authState),
            label: const Text('Withdraw', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            icon: const Icon(LucideIcons.arrowUpRight, color: Colors.white),
            backgroundColor: const Color(0xFFDC2626),
          ),
          const SizedBox(height: 12),
          FloatingActionButton.extended(
            heroTag: 'deposit',
            onPressed: () => _showDepositDialog(context, ref, authState),
            label: const Text('Deposit', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            icon: const Icon(LucideIcons.plus, color: Colors.black),
            backgroundColor: AppConstants.accentColor,
          ),
        ],
      ),
    );
  }

  void _showDepositDialog(BuildContext context, WidgetRef ref, AuthState authState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _DepositBottomSheet(ref: ref, authState: authState),
    );
  }

  void _showWithdrawDialog(BuildContext context, WidgetRef ref, AuthState authState) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _WithdrawBottomSheet(ref: ref, authState: authState),
    );
  }
}

class _DepositBottomSheet extends StatefulWidget {
  final WidgetRef ref;
  final AuthState authState;

  const _DepositBottomSheet({required this.ref, required this.authState});

  @override
  State<_DepositBottomSheet> createState() => _DepositBottomSheetState();
}

class _DepositBottomSheetState extends State<_DepositBottomSheet> {
  final _amountCtrl = TextEditingController();
  final _senderPhoneCtrl = TextEditingController();
  final _txIdCtrl = TextEditingController();
  String _selectedMethod = 'bKash';
  bool _loading = false;
  Map<String, String> _paymentNumbers = {
    'bKash': '01873827520',
    'Nagad': '01873827520',
    'Rocket': '01873827520',
  };

  @override
  void initState() {
    super.initState();
    _fetchPaymentNumbers();
  }

  Future<void> _fetchPaymentNumbers() async {
    try {
      final response = await Supabase.instance.client
          .from('site_settings')
          .select('value')
          .eq('key', 'deposit_numbers')
          .maybeSingle();

      if (response != null && response['value'] != null) {
        final Map<String, dynamic> numbers = Map<String, dynamic>.from(response['value']);
        setState(() {
          numbers.forEach((key, value) {
            _paymentNumbers[key] = value.toString();
          });
        });
      }
    } catch (e) {
      print('Error fetching payment numbers: $e');
    }
  }

  Future<void> _submitDeposit() async {
    final amount = double.tryParse(_amountCtrl.text.trim()) ?? 0;
    final senderPhone = _senderPhoneCtrl.text.trim();
    final txId = _txIdCtrl.text.trim();

    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid deposit amount')));
      return;
    }
    if (senderPhone.isEmpty || txId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all payment details')));
      return;
    }

    setState(() => _loading = true);

    try {
      await Supabase.instance.client.from('wallet_transactions').insert({
        'user_phone': widget.authState.profile!['phone'],
        'amount': amount,
        'type': 'deposit_pending',
        'description': 'Deposit via $_selectedMethod (Sender: $senderPhone, TxID: $txId)',
      });

      // Refresh list
      widget.ref.invalidate(walletTransactionsProvider);
      
      if (mounted) {
        Navigator.pop(context);
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: AppConstants.cardColor,
            title: const Text('Deposit Submitted', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            content: const Text(
              'Your deposit request has been submitted successfully. It will be credited to your wallet balance once verified by the admin.',
              style: TextStyle(color: Colors.white70),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK', style: TextStyle(color: AppConstants.accentColor)),
              )
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final targetNumber = _paymentNumbers[_selectedMethod] ?? '01873827520';

    return Container(
      decoration: const BoxDecoration(
        color: AppConstants.cardColor,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
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
                const Text(
                  'Deposit Money',
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white54),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Amount to Deposit (৳)',
              style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'e.g. 500',
                hintStyle: const TextStyle(color: Colors.white30),
                fillColor: AppConstants.backgroundColor,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Select Payment Method',
              style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            Row(
              children: ['bKash', 'Nagad', 'Rocket'].map((method) {
                final isSelected = _selectedMethod == method;
                Color activeColor;
                if (method == 'bKash') activeColor = const Color(0xFFE2136E);
                else if (method == 'Nagad') activeColor = const Color(0xFFF7931E);
                else activeColor = const Color(0xFF8C3494);

                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedMethod = method),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? activeColor.withOpacity(0.15) : AppConstants.backgroundColor,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? activeColor : Colors.white.withOpacity(0.05),
                            width: 1.5,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            method,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.white60,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppConstants.backgroundColor,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.05)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Instructions for $_selectedMethod:',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Please send money to our personal account:',
                    style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        targetNumber,
                        style: const TextStyle(
                          color: AppConstants.accentColor,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.5,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.copy, color: Colors.white54, size: 20),
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: targetNumber));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Number copied to clipboard!')),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Type: Personal (Send Money Only)',
                    style: TextStyle(color: Colors.white38, fontSize: 11),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Sender Phone Number',
              style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _senderPhoneCtrl,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'e.g. 017XXXXXXXX',
                hintStyle: const TextStyle(color: Colors.white30),
                fillColor: AppConstants.backgroundColor,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Transaction ID (TxID)',
              style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _txIdCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Enter TxID',
                hintStyle: const TextStyle(color: Colors.white30),
                fillColor: AppConstants.backgroundColor,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _loading ? null : _submitDeposit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.accentColor,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black),
                      )
                    : const Text(
                        'Submit Deposit',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Withdraw Bottom Sheet ────────────────────────────────────────────────────
class _WithdrawBottomSheet extends StatefulWidget {
  final WidgetRef ref;
  final AuthState authState;

  const _WithdrawBottomSheet({required this.ref, required this.authState});

  @override
  State<_WithdrawBottomSheet> createState() => _WithdrawBottomSheetState();
}

class _WithdrawBottomSheetState extends State<_WithdrawBottomSheet> {
  final _amountCtrl = TextEditingController();
  final _accountCtrl = TextEditingController();
  String _selectedMethod = 'bKash';
  bool _loading = false;

  Future<void> _submitWithdraw() async {
    final amount = double.tryParse(_amountCtrl.text.trim()) ?? 0;
    final account = _accountCtrl.text.trim();
    final balance = (widget.authState.profile?['wallet_balance'] ?? 0) as num;

    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid amount')),
      );
      return;
    }
    if (amount > balance) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Insufficient wallet balance')),
      );
      return;
    }
    if (account.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your account number')),
      );
      return;
    }

    setState(() => _loading = true);

    try {
      await Supabase.instance.client.from('wallet_transactions').insert({
        'user_phone': widget.authState.profile!['phone'],
        'amount': -amount,
        'type': 'withdrawal_pending',
        'description': 'Withdrawal to $_selectedMethod: $account',
      });

      widget.ref.invalidate(walletTransactionsProvider);

      if (mounted) {
        Navigator.pop(context);
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: AppConstants.cardColor,
            title: const Text('Withdrawal Requested', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            content: const Text(
              'Your withdrawal request has been submitted. Admin will process it and send money to your account within 24 hours.',
              style: TextStyle(color: Colors.white70),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK', style: TextStyle(color: AppConstants.accentColor)),
              )
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final balance = (widget.authState.profile?['wallet_balance'] ?? 0) as num;

    return Container(
      decoration: const BoxDecoration(
        color: AppConstants.cardColor,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 24,
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
                const Text(
                  'Withdraw Money',
                  style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white54),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Available: ৳$balance',
              style: const TextStyle(color: Colors.white38, fontSize: 13),
            ),
            const SizedBox(height: 20),
            const Text(
              'Amount to Withdraw (৳)',
              style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _amountCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'e.g. 300',
                hintStyle: const TextStyle(color: Colors.white30),
                fillColor: AppConstants.backgroundColor,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Select Withdrawal Method',
              style: TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            Row(
              children: ['bKash', 'Nagad', 'Rocket'].map((method) {
                final isSelected = _selectedMethod == method;
                Color activeColor;
                if (method == 'bKash') activeColor = const Color(0xFFE2136E);
                else if (method == 'Nagad') activeColor = const Color(0xFFF7931E);
                else activeColor = const Color(0xFF8C3494);

                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4.0),
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedMethod = method),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: isSelected ? activeColor.withOpacity(0.15) : AppConstants.backgroundColor,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? activeColor : Colors.white.withOpacity(0.05),
                            width: 1.5,
                          ),
                        ),
                        child: Center(
                          child: Text(
                            method,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.white60,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),
            Text(
              'Your $_selectedMethod Number',
              style: const TextStyle(color: Colors.white70, fontSize: 14, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _accountCtrl,
              keyboardType: TextInputType.phone,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: 'Enter your $_selectedMethod number',
                hintStyle: const TextStyle(color: Colors.white30),
                fillColor: AppConstants.backgroundColor,
                filled: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFDC2626).withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFDC2626).withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.info, color: Color(0xFFDC2626), size: 16),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      'Withdrawal requests are processed within 24 hours by admin.',
                      style: TextStyle(color: Colors.white60, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _loading ? null : _submitWithdraw,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: _loading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                      )
                    : const Text(
                        'Submit Withdrawal Request',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
