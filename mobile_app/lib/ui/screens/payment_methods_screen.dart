import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/auth_provider.dart';
import '../../core/network/api_client.dart';
import '../../core/theme/app_theme.dart';

class PaymentMethodsScreen extends ConsumerStatefulWidget {
  const PaymentMethodsScreen({super.key});

  @override
  ConsumerState<PaymentMethodsScreen> createState() => _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends ConsumerState<PaymentMethodsScreen> {
  bool _isLoading = false;

  Future<void> _addPaymentAccount(String phone) async {
    final methodController = TextEditingController(text: 'bKash');
    final detailsController = TextEditingController();
    bool isDefault = true;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.cardNavy,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) {
        return StatefulBuilder(builder: (context, setState) {
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 24, right: 24, top: 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Add Payment Account', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),
                DropdownButtonFormField<String>(
                  value: methodController.text,
                  dropdownColor: const Color(0xFF1E293B),
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Payment Method',
                    labelStyle: const TextStyle(color: Colors.white70),
                    filled: true,
                    fillColor: Colors.black.withOpacity(0.2),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                  items: ['bKash', 'Nagad', 'Rocket', 'Bank Transfer'].map((m) {
                    return DropdownMenuItem(value: m, child: Text(m));
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => methodController.text = val);
                  },
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: detailsController,
                  style: const TextStyle(color: Colors.white),
                  keyboardType: TextInputType.phone,
                  decoration: InputDecoration(
                    labelText: 'Account Details (e.g. 018... Personal)',
                    labelStyle: const TextStyle(color: Colors.white70),
                    filled: true,
                    fillColor: Colors.black.withOpacity(0.2),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                ),
                const SizedBox(height: 16),
                CheckboxListTile(
                  title: const Text('Set as Default', style: TextStyle(color: Colors.white)),
                  value: isDefault,
                  activeColor: AppTheme.primaryAmber,
                  checkColor: Colors.black,
                  onChanged: (val) {
                    if (val != null) setState(() => isDefault = val);
                  },
                  contentPadding: EdgeInsets.zero,
                  controlAffinity: ListTileControlAffinity.leading,
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      if (detailsController.text.trim().isEmpty) return;
                      Navigator.pop(context, true);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryAmber,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Save Account', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black)),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          );
        });
      },
    ).then((result) async {
      if (result == true) {
        setState(() => _isLoading = true);
        try {
          final response = await ApiClient.invokeFunction('auth', body: {
            'type': 'add_payment_account',
            'phone': phone,
            'method': methodController.text,
            'details': detailsController.text.trim(),
            'is_default': isDefault,
          });

          if (response.data['success'] == true) {
            await ref.read(authProvider.notifier).refreshProfile();
            if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account added successfully', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green));
          } else {
            throw Exception(response.data['error'] ?? 'Failed to add account');
          }
        } catch (e) {
          if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e', style: const TextStyle(color: Colors.white)), backgroundColor: Colors.red));
        } finally {
          if (mounted) setState(() => _isLoading = false);
        }
      }
    });
  }

  Future<void> _deletePaymentAccount(String phone, String accountId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Delete Account', style: TextStyle(color: Colors.white)),
        content: const Text('Are you sure you want to delete this payment account?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel', style: TextStyle(color: Colors.white54))),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      final response = await ApiClient.invokeFunction('auth', body: {
        'type': 'delete_payment_account',
        'phone': phone,
        'account_id': accountId,
      });

      if (response.data['success'] == true) {
        await ref.read(authProvider.notifier).refreshProfile();
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Account deleted', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green));
      } else {
        throw Exception(response.data['error'] ?? 'Failed to delete account');
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e', style: const TextStyle(color: Colors.white)), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final userProfile = authState.profile;
    final phone = userProfile?['phone']?.toString();
    
    // Parse payment accounts (it should be a JSONB array)
    List<dynamic> paymentAccounts = [];
    if (userProfile != null && userProfile['payment_accounts'] != null) {
      if (userProfile['payment_accounts'] is List) {
        paymentAccounts = userProfile['payment_accounts'];
      }
    }

    return Scaffold(
      backgroundColor: AppTheme.primaryNavy,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Payment Methods', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: (_isLoading || phone == null) ? null : () => _addPaymentAccount(phone),
        backgroundColor: AppTheme.primaryAmber,
        icon: const Icon(LucideIcons.plus, color: Colors.black),
        label: const Text('Add Method', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryAmber))
        : paymentAccounts.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.wallet, size: 64, color: Colors.white.withOpacity(0.2)),
                  const SizedBox(height: 16),
                  const Text('No payment methods added', style: TextStyle(color: Colors.white54, fontSize: 16)),
                ],
              ),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: paymentAccounts.length,
              itemBuilder: (context, index) {
                final account = paymentAccounts[index];
                final isDefault = account['is_default'] == true;
                
                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.cardNavy,
                    borderRadius: BorderRadius.circular(12),
                    border: isDefault ? Border.all(color: AppTheme.primaryAmber.withOpacity(0.5), width: 1.5) : Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: isDefault ? AppTheme.primaryAmber.withOpacity(0.1) : Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          account['method'] == 'Bank Transfer' ? LucideIcons.building : LucideIcons.smartphone, 
                          color: isDefault ? AppTheme.primaryAmber : Colors.white54, 
                          size: 24
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(account['method'] ?? 'Unknown', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                                if (isDefault) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryAmber.withOpacity(0.2),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text('DEFAULT', style: TextStyle(color: AppTheme.primaryAmber, fontSize: 10, fontWeight: FontWeight.bold)),
                                  ),
                                ]
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(account['details'] ?? '', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.trash2, color: Colors.white30, size: 20),
                        onPressed: () {
                          if (phone != null && account['id'] != null) {
                            _deletePaymentAccount(phone, account['id']);
                          }
                        },
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

