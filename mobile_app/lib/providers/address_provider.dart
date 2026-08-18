import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'auth_provider.dart';
import '../core/network/api_client.dart';

class AddressState {
  final List<Map<String, dynamic>> addresses;
  final bool isLoading;
  final String? error;

  AddressState({
    this.addresses = const [],
    this.isLoading = false,
    this.error,
  });

  AddressState copyWith({
    List<Map<String, dynamic>>? addresses,
    bool? isLoading,
    String? error,
  }) {
    return AddressState(
      addresses: addresses ?? this.addresses,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AddressNotifier extends StateNotifier<AddressState> {
  final Ref ref;

  AddressNotifier(this.ref) : super(AddressState()) {
    loadAddresses();
  }

  Future<void> loadAddresses() async {
    state = state.copyWith(isLoading: true);
    final prefs = await SharedPreferences.getInstance();
    final localData = prefs.getString('saved_addresses');
    
    if (localData != null) {
      try {
        final List<dynamic> jsonList = json.decode(localData);
        state = state.copyWith(
          addresses: jsonList.map((e) => e as Map<String, dynamic>).toList(),
          isLoading: false,
        );
      } catch (_) {}
    }

    final authState = ref.read(authProvider);
    if (authState.isAuthenticated) {
      try {
        final response = await ApiClient.invokeFunction('supabase-user-data', body: {
          'action': 'get_addresses',
          'auth': {'phone': authState.profile!['phone']}
        });

        if (response.data != null && response.data['success'] == true) {
          final List<Map<String, dynamic>> fetched = List<Map<String, dynamic>>.from(response.data['addresses']);
          state = state.copyWith(addresses: fetched, isLoading: false);
          await prefs.setString('saved_addresses', json.encode(fetched));
        }
      } catch (e) {
        state = state.copyWith(isLoading: false, error: e.toString());
      }
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> saveAddress(Map<String, dynamic> address) async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) return;

    try {
      final payload = Map<String, dynamic>.from(address);
      // If it's a new address (detected by a temporary numeric ID or similar), remove ID to let backend generate it
      if (payload['id'] != null && payload['id'].toString().length > 10) {
        payload.remove('id');
      }

      final response = await ApiClient.invokeFunction('supabase-user-data', body: {
        'action': 'save_address',
        'auth': {'phone': authState.profile!['phone']},
        'data': payload
      });

      await loadAddresses();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> deleteAddress(String id) async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) return;

    try {
      await ApiClient.invokeFunction('supabase-user-data', body: {
        'action': 'delete_address',
        'auth': {'phone': authState.profile!['phone']},
        'data': {'id': id}
      });
      await loadAddresses();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

final addressProvider = StateNotifierProvider<AddressNotifier, AddressState>((ref) {
  return AddressNotifier(ref);
});
