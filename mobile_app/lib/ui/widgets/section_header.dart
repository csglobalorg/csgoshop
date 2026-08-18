import 'package:flutter/material.dart';
import '../../core/constants.dart';

class SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color? iconColor;
  final Gradient? accentGradient;
  final VoidCallback? onViewAll;
  final String viewAllText;

  const SectionHeader({
    super.key,
    required this.title,
    required this.icon,
    this.iconColor,
    this.accentGradient,
    this.onViewAll,
    this.viewAllText = 'View All',
  });

  @override
  Widget build(BuildContext context) {
    final color = iconColor ?? AppConstants.accentColor;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 14),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 24,
            decoration: BoxDecoration(
              gradient: accentGradient ?? LinearGradient(colors: [color, color]),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Colors.white,
                letterSpacing: 0.3,
              ),
            ),
          ),
          if (onViewAll != null)
            GestureDetector(
              onTap: onViewAll,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: color.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      viewAllText,
                      style: TextStyle(
                        color: color,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.arrow_forward_ios, color: color, size: 10),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
