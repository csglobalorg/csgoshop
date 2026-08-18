import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/constants.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final List<Map<String, dynamic>> _notifications = [
    {
      'id': '1',
      'title': '🔥 Flash Sale Started!',
      'message': 'Up to 50% discount on Men\'s & Women\'s Fashion. Grab deals now!',
      'time': '10 mins ago',
      'type': 'promo',
      'read': false,
    },
    {
      'id': '2',
      'title': '📦 Order Status Updated',
      'message': 'Your order #CSGO-9812 has been confirmed and packed.',
      'time': '2 hours ago',
      'type': 'order',
      'read': false,
    },
    {
      'id': '3',
      'title': '💰 Cashback Credited',
      'message': '৳120 Cashback credited to your wallet balance for order #CSGO-9801.',
      'time': '1 day ago',
      'type': 'wallet',
      'read': true,
    },
    {
      'id': '4',
      'title': '🤝 Affiliate Commission Approved',
      'message': 'You earned ৳350 referral commission from user @rahim_bd.',
      'time': '2 days ago',
      'type': 'affiliate',
      'read': true,
    },
  ];

  String _filter = 'All';

  @override
  Widget build(BuildContext context) {
    final filtered = _notifications.where((n) {
      if (_filter == 'All') return true;
      if (_filter == 'Orders') return n['type'] == 'order';
      if (_filter == 'Promos') return n['type'] == 'promo';
      if (_filter == 'Wallet') return n['type'] == 'wallet' || n['type'] == 'affiliate';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Notifications', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          TextButton(
            onPressed: () {
              setState(() {
                for (var n in _notifications) {
                  n['read'] = true;
                }
              });
            },
            child: const Text('Mark all as read', style: TextStyle(color: AppConstants.accentColor, fontSize: 12)),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: ['All', 'Orders', 'Promos', 'Wallet'].map((f) {
                final isSel = _filter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(f),
                    selected: isSel,
                    onSelected: (selected) {
                      if (selected) setState(() => _filter = f);
                    },
                    selectedColor: AppConstants.accentColor,
                    backgroundColor: const Color(0xFF18181B),
                    labelStyle: TextStyle(color: isSel ? Colors.black : Colors.white70, fontWeight: isSel ? FontWeight.bold : FontWeight.normal, fontSize: 12),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),

          // Notifications List
          Expanded(
            child: filtered.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.bellOff, size: 64, color: Colors.white.withOpacity(0.1)),
                        const SizedBox(height: 16),
                        const Text('No notifications found', style: TextStyle(color: Colors.white38, fontSize: 14)),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      final isRead = item['read'] == true;
                      final type = item['type'];

                      IconData icon = LucideIcons.bell;
                      Color iconColor = AppConstants.accentColor;
                      if (type == 'order') {
                        icon = LucideIcons.package;
                        iconColor = Colors.blue;
                      } else if (type == 'wallet' || type == 'affiliate') {
                        icon = LucideIcons.wallet;
                        iconColor = Colors.green;
                      }

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isRead ? const Color(0xFF18181B) : const Color(0xFF27272A),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: isRead ? Colors.white.withOpacity(0.04) : AppConstants.accentColor.withOpacity(0.3)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: iconColor.withOpacity(0.12),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(icon, color: iconColor, size: 20),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          item['title'],
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                      Text(item['time'], style: const TextStyle(color: Colors.white38, fontSize: 11)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    item['message'],
                                    style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12, height: 1.3),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
