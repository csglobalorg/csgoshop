import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/cart_provider.dart';
import '../../providers/product_provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/address_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/network/api_client.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  String selectedDelivery = 'Dhaka';
  String selectedPayment = 'Cash on Delivery'; // Default to COD
  final _nameController = TextEditingController();
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  final _transactionController = TextEditingController();
  final _referralController = TextEditingController(); // Referral Code
  bool isPlacingOrder = false;
  Map<String, dynamic>? selectedAddressObj;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final profile = ref.read(authProvider).profile;
      if (profile != null) {
        _nameController.text = profile['full_name'] ?? profile['name'] ?? '';
        _phoneController.text = profile['phone'] ?? '';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(productProvider).settings;
    final subtotal = ref.read(cartProvider.notifier).subtotal;
    final authProfile = ref.watch(authProvider).profile;

    // Smart Logistics Calculation
    double deliveryCharge = selectedDelivery == 'Dhaka' 
        ? (settings?.deliveryDhaka ?? 60.0) 
        : (settings?.deliveryOutside ?? 120.0);
    
    if (subtotal >= (settings?.freeThreshold ?? 2000.0)) {
      deliveryCharge = 0.0;
    }

    double referralDiscount = 0.0;
    if (_referralController.text.trim().isNotEmpty) {
      referralDiscount = (subtotal * 0.0001); // 0.01% Affiliate Discount
    }

    double walletDeduction = 0.0;
    if (selectedPayment == 'Wallet') {
      final balance = (authProfile?['wallet_balance'] as num?)?.toDouble() ?? 0.0;
      walletDeduction = balance;
      if (walletDeduction > (subtotal + deliveryCharge - referralDiscount)) {
        walletDeduction = (subtotal + deliveryCharge - referralDiscount);
      }
    }

    final total = subtotal + deliveryCharge - referralDiscount - walletDeduction;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Delivery Location', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            Row(
              children: [
                _DeliveryBtn(
                  label: 'Inside Dhaka',
                  isSelected: selectedDelivery == 'Dhaka',
                  onTap: () => setState(() => selectedDelivery = 'Dhaka'),
                ),
                const SizedBox(width: 12),
                _DeliveryBtn(
                  label: 'Outside Dhaka',
                  isSelected: selectedDelivery == 'Outside',
                  onTap: () => setState(() => selectedDelivery = 'Outside'),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text('Shipping Address', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            Consumer(builder: (context, ref, child) {
              final addressState = ref.watch(addressProvider);
              if (addressState.addresses.isEmpty) return const SizedBox();
              return Container(
                height: 100,
                margin: const EdgeInsets.only(bottom: 16),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: addressState.addresses.length,
                  itemBuilder: (context, index) {
                    final addr = addressState.addresses[index];
                    final isSelected = selectedAddressObj?['id'] == addr['id'];
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          selectedAddressObj = addr;
                          _addressController.text = addr['address'];
                        });
                      },
                      child: Container(
                        width: 200,
                        margin: const EdgeInsets.only(right: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected ? AppTheme.primaryAmber.withOpacity(0.1) : AppTheme.cardNavy,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isSelected ? AppTheme.primaryAmber : Colors.white10),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(addr['title'], style: TextStyle(color: isSelected ? AppTheme.primaryAmber : Colors.white, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            Text(addr['address'], maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70, fontSize: 12)),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              );
            }),
            TextField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Name',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                hintText: 'Enter your full name',
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _phoneController,
              decoration: InputDecoration(
                labelText: 'Number',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                hintText: 'e.g. 017XXXXXXXX',
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _addressController,
              decoration: InputDecoration(
                labelText: 'Full Address',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                hintText: 'House #, Road #, Area, City',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 32),
            const Text('Payment Method', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: ['Cash on Delivery', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'ATM / Credit Card', 'Wallet'].map((p) {
                final isSelected = selectedPayment == p;
                return ChoiceChip(
                  label: Text(p, style: TextStyle(color: isSelected ? Colors.black : Colors.white, fontWeight: FontWeight.bold)),
                  selected: isSelected,
                  onSelected: (val) => setState(() => selectedPayment = p),
                  selectedColor: AppTheme.primaryAmber,
                  backgroundColor: AppTheme.cardNavy,
                );
              }).toList(),
            ),
            if (selectedPayment == 'Bank Transfer' || selectedPayment == 'ATM / Credit Card') ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.cardNavy,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white10),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Bank Account Details:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                    SizedBox(height: 4),
                    Text('Account Name: CSGO SHOP ECOSYSTEM LTD.', style: TextStyle(color: AppTheme.primaryAmber, fontSize: 12, fontWeight: FontWeight.bold)),
                    Text('Account No: 150.110.4589201 | Routing: 090261421', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    Text('Bank: Dutch-Bangla Bank / City Bank / Brac Bank / Islami Bank / EBL', style: TextStyle(color: Colors.white54, fontSize: 11)),
                  ],
                ),
              ),
            ],
            if (selectedPayment != 'Wallet' && selectedPayment != 'Cash on Delivery') ...[
              const SizedBox(height: 16),
              TextField(
                controller: _transactionController,
                decoration: InputDecoration(
                  labelText: 'Transaction ID / Sender Phone / Bank Ref Number',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
            const SizedBox(height: 24),
            const Text('Referral Code (Optional)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 12),
            TextField(
              controller: _referralController,
              decoration: InputDecoration(
                labelText: 'Enter Referral Code',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                prefixIcon: const Icon(Icons.card_giftcard),
              ),
            ),
            const SizedBox(height: 40),
            
            // Order Summary Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppTheme.cardNavy,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _SummaryRow(label: 'Subtotal', value: '৳${subtotal.toInt()}'),
                  const SizedBox(height: 8),
                  _SummaryRow(
                    label: 'Delivery Charge', 
                    value: deliveryCharge == 0 ? 'FREE' : '৳${deliveryCharge.toInt()}',
                    valueColor: deliveryCharge == 0 ? Colors.green : null,
                  ),
                  if (referralDiscount > 0) ...[
                    const SizedBox(height: 8),
                    _SummaryRow(
                      label: 'Referral Discount (0.01%)', 
                      value: '-৳${referralDiscount.toStringAsFixed(2)}',
                      valueColor: Colors.green,
                    ),
                  ],
                  if (walletDeduction > 0) ...[
                    const SizedBox(height: 8),
                    _SummaryRow(
                      label: 'Wallet Applied', 
                      value: '-৳${walletDeduction.toStringAsFixed(2)}',
                      valueColor: Colors.green,
                    ),
                  ],
                  const Divider(height: 24, color: Colors.white10),
                  _SummaryRow(
                    label: 'Total Payable', 
                    value: '৳${total.toInt()}', 
                    isBold: true,
                    valueColor: AppTheme.primaryAmber,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),
            ElevatedButton(
              onPressed: isPlacingOrder ? null : () => _submitOrder(total, deliveryCharge, referralDiscount, walletDeduction),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryAmber,
                foregroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 54),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: isPlacingOrder 
                ? const CircularProgressIndicator(color: Colors.black)
                : const Text('CONFIRM ORDER', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submitOrder(double total, double deliveryCharge, double referralDiscount, double walletAmount) async {
    if (_nameController.text.trim().isEmpty || _addressController.text.trim().isEmpty || _phoneController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill all details')));
      return;
    }

    setState(() => isPlacingOrder = true);

    try {
      final cartItems = ref.read(cartProvider);
      final subtotal = ref.read(cartProvider.notifier).subtotal;
      
      final orderData = {
        'customer_name': _nameController.text.trim(),
        'user_phone': _phoneController.text,
        'address': _addressController.text,
        'subtotal': subtotal,
        'total_amount': total,
        'delivery_charge': deliveryCharge,
        'referral_discount': referralDiscount,
        'wallet_amount': walletAmount,
        'payment_method': selectedPayment,
        'transaction_id': _transactionController.text,
        'referral_code': _referralController.text.trim(),
        'items': cartItems.map((i) => {
          'id': i.product.id,
          'name': i.product.name,
          'price': i.product.price,
          'quantity': i.quantity,
          'variants': i.selectedVariants,
        }).toList(),
        'status': 'Pending',
      };

      await ApiClient.invokeFunction('submit-order', body: orderData);

      // Calculate bonus spins for order total (2 spins per ৳1000)
      final bonusSpins = (total ~/ 1000) * 2;

      ref.read(cartProvider.notifier).clearCart();
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            title: const Text('🎉 Order Successful!'),
            content: Text(
              bonusSpins > 0
                  ? 'Your order has been placed successfully.\n\n🎁 You earned +$bonusSpins Lucky Spins for your ৳${total.toInt()} order!'
                  : 'Your order has been placed successfully. Admin will contact you soon.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${e.toString()}')));
      }
    } finally {
      setState(() => isPlacingOrder = false);
    }
  }
}

class _DeliveryBtn extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  const _DeliveryBtn({required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primaryAmber : AppTheme.cardNavy,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isSelected ? AppTheme.primaryAmber : Colors.white10),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.black : Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;
  final Color? valueColor;
  const _SummaryRow({required this.label, required this.value, this.isBold = false, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.white70)),
        Text(
          value,
          style: TextStyle(
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            fontSize: isBold ? 18 : 14,
            color: valueColor ?? Colors.white,
          ),
        ),
      ],
    );
  }
}
