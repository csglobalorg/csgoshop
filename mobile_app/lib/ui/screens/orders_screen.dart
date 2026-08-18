import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/auth_provider.dart';

final ordersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final authState = ref.watch(authProvider);
  if (authState.profile == null) return [];
  
  final phone = (authState.profile!['phone'] ?? '').toString().trim();
  if (phone.isEmpty) return [];
  
  final response = await Supabase.instance.client
      .from('orders')
      .select()
      .eq('customer_phone', phone)
      .order('created_at', ascending: false);
      
  return List<Map<String, dynamic>>.from(response);
});

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final ordersAsync = ref.watch(ordersProvider);

    if (authState.profile == null) {
      return const Center(
        child: Text('Login to see your orders', style: TextStyle(color: Colors.white38)),
      );
    }

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('My Orders', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: ordersAsync.when(
        data: (orders) {
          if (orders.isEmpty) {
            return const Center(
              child: Text('No orders yet', style: TextStyle(color: Colors.white38)),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: orders.length,
            itemBuilder: (context, index) {
              final order = orders[index];
              final status = order['status'] ?? 'pending';
              
              Color statusColor = Colors.orange;
              if (status == 'delivered') statusColor = Colors.green;
              if (status == 'cancelled') statusColor = Colors.red;

              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppConstants.cardColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Order #${order['id']}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            status.toUpperCase(),
                            style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const Divider(color: Colors.white10, height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount', style: TextStyle(color: Colors.white38, fontSize: 12)),
                        Text('৳${order['total_amount']}', style: const TextStyle(color: AppConstants.accentColor, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Date', style: TextStyle(color: Colors.white38, fontSize: 12)),
                        Text(
                          order['created_at'].toString().split('T')[0],
                          style: const TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildTimeline(status),
                  ],
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
      ),
    );
  }

  Widget _buildTimeline(String currentStatus) {
    currentStatus = currentStatus.toLowerCase();
    int currentStep = 0;
    if (currentStatus == 'processing') currentStep = 1;
    if (currentStatus == 'shipped') currentStep = 2;
    if (currentStatus == 'delivered') currentStep = 3;
    if (currentStatus == 'cancelled') return const SizedBox.shrink();

    return Row(
      children: [
        _timelineStep('Pending', LucideIcons.clock, currentStep >= 0),
        _timelineLine(currentStep >= 1),
        _timelineStep('Processing', LucideIcons.packageSearch, currentStep >= 1),
        _timelineLine(currentStep >= 2),
        _timelineStep('Shipped', LucideIcons.truck, currentStep >= 2),
        _timelineLine(currentStep >= 3),
        _timelineStep('Delivered', LucideIcons.checkCircle2, currentStep >= 3),
      ],
    );
  }

  Widget _timelineStep(String label, IconData icon, bool isActive) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: isActive ? AppConstants.accentColor : Colors.white.withOpacity(0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 14, color: isActive ? Colors.black : Colors.white54),
          ),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(color: isActive ? Colors.white : Colors.white38, fontSize: 10, fontWeight: isActive ? FontWeight.bold : FontWeight.normal)),
        ],
      ),
    );
  }

  Widget _timelineLine(bool isActive) {
    return Container(
      width: 20,
      height: 2,
      color: isActive ? AppConstants.accentColor : Colors.white.withOpacity(0.05),
      margin: const EdgeInsets.only(bottom: 20),
    );
  }
}
