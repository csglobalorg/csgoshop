import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'home_screen.dart';
import 'category_screen.dart';
import 'search_screen.dart';
import 'cart_screen.dart';
import 'hub_screen.dart';
import '../../providers/cart_provider.dart';
import '../../core/constants.dart';

class MainScreen extends ConsumerStatefulWidget {
  const MainScreen({super.key});

  @override
  ConsumerState<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends ConsumerState<MainScreen> {
  int _selectedIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const CategoryScreen(category: 'all', title: 'All Categories'),
    const SearchScreen(),
    const CartScreen(showAppBar: false),
    const HubScreen(),
  ];

  static const _navItems = [
    _NavItemData(icon: LucideIcons.home, activeIcon: LucideIcons.home, label: 'Home'),
    _NavItemData(icon: LucideIcons.layoutGrid, activeIcon: LucideIcons.layoutGrid, label: 'Categories'),
    _NavItemData(icon: LucideIcons.search, activeIcon: LucideIcons.search, label: 'Search'),
    _NavItemData(icon: LucideIcons.shoppingBag, activeIcon: LucideIcons.shoppingBag, label: 'Cart'),
    _NavItemData(icon: LucideIcons.sparkles, activeIcon: LucideIcons.sparkles, label: 'Hub'),
  ];

  @override
  Widget build(BuildContext context) {
    final cartItems = ref.watch(cartProvider);

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: SafeArea(
        bottom: false,
        top: true,
        child: IndexedStack(
          index: _selectedIndex,
          children: _screens,
        ),
      ),
      extendBody: false,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF09090B),
          border: Border(
            top: BorderSide(
              color: Colors.white.withOpacity(0.06),
              width: 1,
            ),
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: List.generate(_navItems.length, (index) {
                final item = _navItems[index];
                final isSelected = _selectedIndex == index;
                final isCart = index == 3;

                return GestureDetector(
                  onTap: () => setState(() => _selectedIndex = index),
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    width: 62,
                    color: Colors.transparent,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Icon(
                              isSelected ? item.activeIcon : item.icon,
                              color: isSelected ? AppConstants.accentColor : Colors.white54,
                              size: 22,
                            ),
                            if (isCart && cartItems.isNotEmpty)
                              Positioned(
                                right: -8,
                                top: -4,
                                child: Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: const BoxDecoration(
                                    color: AppConstants.errorColor,
                                    shape: BoxShape.circle,
                                  ),
                                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                                  child: Text(
                                    '${cartItems.length}',
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold,
                                      height: 1,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.label,
                          style: TextStyle(
                            color: isSelected ? AppConstants.accentColor : Colors.white54,
                            fontSize: 10,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItemData {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const _NavItemData({required this.icon, required this.activeIcon, required this.label});
}
