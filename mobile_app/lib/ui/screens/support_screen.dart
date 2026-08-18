import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:lucide_icons/lucide_icons.dart';

class SupportScreen extends StatelessWidget {
  const SupportScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Support Center', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Contact Us', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _contactOption(LucideIcons.messageCircle, 'WhatsApp Support', '+8801873827520', Colors.green),
          _contactOption(LucideIcons.phone, 'Call Us', '+8809639773939', Colors.blue),
          _contactOption(LucideIcons.mail, 'Email Support', 'csglobal.org@gmail.com', AppConstants.accentColor),
          
          const SizedBox(height: 32),
          const Text('Frequently Asked Questions', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _faqItem('How long does delivery take?', 'Inside Dhaka: 1-2 days. Outside Dhaka: 3-5 days.'),
          _faqItem('What is the return policy?', 'You can return any product within 7 days of receiving it if it is damaged or not as described.'),
          _faqItem('Do you offer free shipping?', 'Yes, for orders over ৳2000, shipping is completely free!'),
          _faqItem('How do I track my order?', 'You can track your order using your Phone Number from the home screen.'),
        ],
      ),
    );
  }

  Widget _contactOption(IconData icon, String title, String subtitle, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(subtitle, style: const TextStyle(color: Colors.white70, fontSize: 14)),
              ],
            ),
          ),
          const Icon(LucideIcons.chevronRight, color: Colors.white24, size: 20),
        ],
      ),
    );
  }

  Widget _faqItem(String question, String answer) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Theme(
        data: ThemeData(dividerColor: Colors.transparent),
        child: ExpansionTile(
          iconColor: AppConstants.accentColor,
          collapsedIconColor: Colors.white54,
          title: Text(question, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
          childrenPadding: const EdgeInsets.only(left: 16, right: 16, bottom: 16),
          children: [
            Text(answer, style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.5)),
          ],
        ),
      ),
    );
  }
}
