import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_provider.dart';
import '../core/network/api_client.dart';

class AdminDashboardState {
  final Map<String, dynamic> stats;
  final List<dynamic> orders;
  final List<dynamic> users;
  final List<dynamic> payouts;
  final List<Map<String, dynamic>> siteSettings;
  final bool isLoading;
  final String? error;

  AdminDashboardState({
    this.stats = const {},
    this.orders = const [],
    this.users = const [],
    this.payouts = const [],
    this.siteSettings = const [],
    this.isLoading = false,
    this.error,
  });

  AdminDashboardState copyWith({
    Map<String, dynamic>? stats,
    List<dynamic>? orders,
    List<dynamic>? users,
    List<dynamic>? payouts,
    List<Map<String, dynamic>>? siteSettings,
    bool? isLoading,
    String? error,
  }) {
    return AdminDashboardState(
      stats: stats ?? this.stats,
      orders: orders ?? this.orders,
      users: users ?? this.users,
      payouts: payouts ?? this.payouts,
      siteSettings: siteSettings ?? this.siteSettings,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }

  // Computed properties
  double get totalRevenue {
    double sum = 0;
    for (var o in orders) {
      if (o['status']?.toString().toLowerCase() == 'delivered') {
        sum += (double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0);
      }
    }
    return sum;
  }

  double get pendingRevenue {
    double sum = 0;
    for (var o in orders) {
      final s = o['status']?.toString().toLowerCase() ?? '';
      if (s == 'pending' || s == 'processing' || s == 'shipped') {
        sum += (double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0);
      }
    }
    return sum;
  }

  int get pendingOrdersCount => orders.where((o) => o['status']?.toString().toLowerCase() == 'pending').length;
  int get processingOrdersCount => orders.where((o) => o['status']?.toString().toLowerCase() == 'processing').length;
  int get shippedOrdersCount => orders.where((o) => o['status']?.toString().toLowerCase() == 'shipped').length;
  int get deliveredOrdersCount => orders.where((o) => o['status']?.toString().toLowerCase() == 'delivered').length;
  int get cancelledOrdersCount => orders.where((o) => o['status']?.toString().toLowerCase() == 'cancelled').length;
  
  int get activeAffiliates => users.where((u) => u['affiliate_status'] == 'approved').length;
  int get pendingAffiliates => users.where((u) => u['affiliate_status'] == 'pending').length;
  int get pendingPayoutsCount => payouts.where((p) => p['status'] == 'pending').length;
  
  double get pendingPayoutsAmount {
    double sum = 0;
    for (var p in payouts) {
      if (p['status'] == 'pending') {
        sum += (double.tryParse(p['amount']?.toString() ?? '0') ?? 0);
      }
    }
    return sum;
  }

  // Today's orders
  int get todayOrdersCount {
    final now = DateTime.now();
    return orders.where((o) {
      final created = DateTime.tryParse(o['created_at']?.toString() ?? '');
      if (created == null) return false;
      return created.year == now.year && created.month == now.month && created.day == now.day;
    }).length;
  }

  double get todayRevenue {
    final now = DateTime.now();
    double sum = 0;
    for (var o in orders) {
      final created = DateTime.tryParse(o['created_at']?.toString() ?? '');
      if (created != null && created.year == now.year && created.month == now.month && created.day == now.day) {
        sum += (double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0);
      }
    }
    return sum;
  }

  // Last 7 days revenue for chart
  List<double> get last7DaysRevenue {
    final now = DateTime.now();
    final List<double> revenue = List.filled(7, 0);
    for (var o in orders) {
      final created = DateTime.tryParse(o['created_at']?.toString() ?? '');
      if (created == null) continue;
      final diff = now.difference(created).inDays;
      if (diff >= 0 && diff < 7) {
        revenue[6 - diff] += (double.tryParse(o['total_amount']?.toString() ?? '0') ?? 0);
      }
    }
    return revenue;
  }
}

class AdminNotifier extends StateNotifier<AdminDashboardState> {
  final Ref ref;

  AdminNotifier({required this.ref}) : super(AdminDashboardState()) {
    _init();
  }

  Map<String, String> get _adminAuth {
    final authState = ref.read(authProvider);
    return {
      'phone': authState.profile?['phone'] ?? '',
      'password': authState.currentPassword ?? '',
    };
  }

  Future<void> _init() async {
    await _loadCache();
    fetchDashboardData();
  }

  Future<void> _loadCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('admin_dashboard_cache');
      if (cached != null) {
        final data = json.decode(cached);
        state = state.copyWith(
          stats: data['stats'] ?? {},
          orders: data['orders'] ?? [],
          users: data['users'] ?? [],
          payouts: data['payouts'] ?? [],
          siteSettings: (data['settings'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [],
          isLoading: false,
        );
      }
    } catch (e) {
      print('Admin cache load error: $e');
    }
  }

  Future<void> fetchDashboardData() async {
    final showLoading = state.orders.isEmpty;
    if (showLoading) state = state.copyWith(isLoading: true, error: null);
    
    try {
      final auth = _adminAuth;

      // Fetch all data in parallel
      final results = await Future.wait([
        ApiClient.invokeFunction('admin', body: {
          'action': 'get_dashboard_data',
          'auth': auth,
        }),
        ApiClient.invokeFunction('admin', body: {
          'action': 'get_orders',
          'auth': auth,
        }),
        ApiClient.invokeFunction('admin', body: {
          'action': 'get_users',
          'auth': auth,
        }),
        ApiClient.invokeFunction('admin', body: {
          'action': 'get_payouts',
          'auth': auth,
        }),
        ApiClient.invokeFunction('admin', body: {
          'action': 'get_site_settings',
          'auth': auth,
        }),
      ]);

      final dashData = results[0].data as Map<String, dynamic>?;
      final ordersData = results[1].data as Map<String, dynamic>?;
      final usersData = results[2].data as Map<String, dynamic>?;
      final payoutsData = results[3].data as Map<String, dynamic>?;
      final settingsData = results[4].data as Map<String, dynamic>?;

      final newState = state.copyWith(
        stats: dashData?['stats'] ?? {},
        orders: ordersData?['orders'] ?? [],
        users: usersData?['users'] ?? [],
        payouts: payoutsData?['payouts'] ?? [],
        siteSettings: (settingsData?['settings'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [],
        isLoading: false,
      );

      state = newState;

      // Save to cache
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('admin_dashboard_cache', json.encode({
          'stats': newState.stats,
          'orders': newState.orders,
          'users': newState.users,
          'payouts': newState.payouts,
          'settings': newState.siteSettings,
        }));
      } catch (e) {}
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> updateOrderStatus(String orderId, String status) async {
    try {
      await ApiClient.invokeFunction('admin', body: {
        'action': 'update_order_status',
        'auth': _adminAuth,
        'orderId': orderId,
        'status': status,
      });
      fetchDashboardData();
      return true;
    } catch (e) {
      print('Update order failed: $e');
      return false;
    }
  }

  Future<bool> updateUserField(String userPhone, String field, dynamic value) async {
    try {
      await ApiClient.invokeFunction('admin', body: {
        'action': 'update_user_field',
        'auth': _adminAuth,
        'phone': userPhone,
        'field': field,
        'value': value,
      });
      fetchDashboardData();
      return true;
    } catch (e) {
      print('Update user failed: $e');
      return false;
    }
  }

  Future<bool> deleteProduct(String productId) async {
    try {
      await ApiClient.invokeFunction('admin', body: {
        'action': 'delete_product',
        'auth': _adminAuth,
        'productId': productId,
      });
      fetchDashboardData();
      return true;
    } catch (e) {
      print('Delete failed: $e');
      return false;
    }
  }

  Future<bool> processPayment(String payoutId) async {
    try {
      await ApiClient.invokeFunction('admin', body: {
        'action': 'update_payout_status',
        'auth': _adminAuth,
        'payoutId': payoutId,
        'status': 'completed',
      });
      fetchDashboardData();
      return true;
    } catch (e) {
      print('Process payment failed: $e');
      return false;
    }
  }

  Future<bool> updateSiteSetting(String key, dynamic value) async {
    try {
      await ApiClient.invokeFunction('admin', body: {
        'action': 'update_site_settings',
        'auth': _adminAuth,
        'key': key,
        'value': value,
      });
      fetchDashboardData();
      return true;
    } catch (e) {
      print('Update setting failed: $e');
      return false;
    }
  }

  Future<bool> addProduct(Map<String, dynamic> product) async {
    try {
      await ApiClient.invokeFunction('admin', body: {
        'action': 'add_product',
        'auth': _adminAuth,
        'product': product,
      });
      fetchDashboardData();
      return true;
    } catch (e) {
      print('Add product failed: $e');
      return false;
    }
  }

  Future<bool> upsertProductOverride(String sourceId, Map<String, dynamic> updates) async {
    try {
      await ApiClient.invokeFunction('admin', body: {
        'action': 'upsert_product_override',
        'auth': _adminAuth,
        'source_id': sourceId,
        'updates': updates,
      });
      fetchDashboardData();
      return true;
    } catch (e) {
      print('Upsert override failed: $e');
      return false;
    }
  }
}

final adminProvider = StateNotifierProvider<AdminNotifier, AdminDashboardState>((ref) {
  return AdminNotifier(ref: ref);
});
