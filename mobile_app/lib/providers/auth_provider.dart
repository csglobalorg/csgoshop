import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/network/api_client.dart';

class AuthState {
  final User? user;
  final Map<String, dynamic>? profile;
  final String? currentPassword;
  final bool isLoading;
  final bool isAdmin;
  final String? error;

  AuthState({
    this.user,
    this.profile,
    this.currentPassword,
    this.isLoading = false,
    this.isAdmin = false,
    this.error,
  });
  bool get isAuthenticated => profile != null;

  AuthState copyWith({
    User? user,
    Map<String, dynamic>? profile,
    String? currentPassword,
    bool? isLoading,
    bool? isAdmin,
    String? error,
  }) {
    return AuthState(
      user: user ?? this.user,
      profile: profile ?? this.profile,
      currentPassword: currentPassword ?? this.currentPassword,
      isLoading: isLoading ?? this.isLoading,
      isAdmin: isAdmin ?? this.isAdmin,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  static const String adminPhone = '01873827520';

  AuthNotifier() : super(AuthState());

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    final profileString = prefs.getString('csgo_user_profile');
    final savedPassword = prefs.getString('csgo_user_password');

    if (profileString != null && savedPassword != null) {
      try {
        final profileData = jsonDecode(profileString);
        final userPhone = (profileData['phone'] ?? '').toString().trim();
        
        state = state.copyWith(
          profile: profileData,
          currentPassword: savedPassword,
          isAdmin: (profileData['role'] == 'admin') || userPhone.endsWith(adminPhone),
        );

        // Fetch fresh data in the background
        refreshProfile();
      } catch (e) {
        // If parsing fails, ignore and stay logged out
        prefs.remove('csgo_user_profile');
        prefs.remove('csgo_user_password');
      }
    }
  }

  Future<void> _saveSession(Map<String, dynamic> userData, String password) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('csgo_user_profile', jsonEncode(userData));
    await prefs.setString('csgo_user_password', password);
  }

  void updateProfile(Map<String, dynamic> updates) {
    if (state.profile != null) {
      final updatedProfile = Map<String, dynamic>.from(state.profile!);
      updates.forEach((key, value) {
        updatedProfile[key] = value;
      });
      state = state.copyWith(profile: updatedProfile);
      _saveSession(updatedProfile, state.currentPassword ?? '');
    }
  }

  Future<bool> signup({
    required String phone,
    required String password,
    required String name,
    required String email,
    String? referralCode,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await ApiClient.invokeFunction('auth', body: {
        'type': 'register',
        'phone': phone,
        'password': password,
        'name': name,
        'email': email,
        'referral_code': referralCode,
      });

      final userData = response.data['user'];
      if (userData == null) throw Exception('User data not found');

      final userPhone = (userData['phone'] ?? phone).toString().trim();
      await _saveSession(userData, password.trim());
      
      state = state.copyWith(
        profile: userData,
        currentPassword: password.trim(),
        isAdmin: (userData['role'] == 'admin') || userPhone.endsWith(adminPhone),
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
      return false;
    }
  }

  Future<void> login(String phone, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await ApiClient.invokeFunction('auth', body: {
        'type': 'login',
        'phone': phone.trim(),
        'password': password.trim(),
      });

      final userData = response.data['user'];
      if (userData == null) throw Exception('User data not found in response');

      final userPhone = (userData['phone'] ?? phone).toString().trim();
      await _saveSession(userData, password.trim());

      state = state.copyWith(
        profile: userData,
        currentPassword: password.trim(),
        isAdmin: (userData['role'] == 'admin') || userPhone.endsWith(adminPhone),
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceAll('Exception: ', ''),
      );
    }
  }

  Future<void> refreshProfile() async {
    final currentProfile = state.profile;
    if (currentProfile == null) return;

    final phone = currentProfile['phone']?.toString();
    if (phone == null) return;

    try {
      final response = await ApiClient.invokeFunction('auth', body: {
        'type': 'get_profile',
        'phone': phone,
      });

      if (response.data != null && response.data['user'] != null) {
        final userData = response.data['user'];
        state = state.copyWith(profile: userData);
        if (state.currentPassword != null) {
            await _saveSession(userData, state.currentPassword!);
        }
      }
    } catch (_) {
      // Silently fail — keep current profile
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('csgo_user_profile');
    await prefs.remove('csgo_user_password');
    state = AuthState();
  }

  Future<void> signOut() async {
    await logout();
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
