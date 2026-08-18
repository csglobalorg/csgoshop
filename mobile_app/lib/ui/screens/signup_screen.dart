import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailController = TextEditingController();
  final _referralController = TextEditingController();
  bool _isPasswordVisible = false;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    ref.listen<AuthState>(authProvider, (previous, next) {
      if (previous?.profile == null && next.profile != null && next.error == null) {
        Navigator.of(context).pop();
      }
    });

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Create Account",
                style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                "Sign up to start shopping with CSGO SHOP",
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14),
              ),
              const SizedBox(height: 30),

              if (authState.error != null)
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: Text(authState.error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
                ),

              _inputField(controller: _nameController, hint: "Full Name", icon: Icons.person),
              const SizedBox(height: 16),
              _inputField(controller: _emailController, hint: "Email Address", icon: Icons.email),
              const SizedBox(height: 16),
              _inputField(controller: _phoneController, hint: "Phone Number", icon: Icons.phone),
              const SizedBox(height: 16),
              _inputField(controller: _referralController, hint: "Referral Code (Optional)", icon: Icons.card_giftcard),
              const SizedBox(height: 16),
              _inputField(
                controller: _passwordController,
                hint: "Password",
                icon: Icons.lock,
                isPassword: true,
                isPasswordVisible: _isPasswordVisible,
                onToggleVisibility: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
              ),

              const SizedBox(height: 30),

              GestureDetector(
                onTap: authState.isLoading 
                  ? null 
                  : () => ref.read(authProvider.notifier).signup(
                    name: _nameController.text, 
                    email: _emailController.text,
                    phone: _phoneController.text, 
                    password: _passwordController.text,
                    referralCode: _referralController.text.trim(),
                  ),
                child: Container(
                  height: 55,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: const LinearGradient(colors: [AppConstants.accentColor, Color(0xFFFFC107)]),
                  ),
                  child: Center(
                    child: authState.isLoading
                      ? const CircularProgressIndicator(color: Colors.black)
                      : const Text("REGISTER", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black, fontSize: 16)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _inputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    bool isPasswordVisible = false,
    VoidCallback? onToggleVisibility,
  }) {
    return TextField(
      controller: controller,
      obscureText: isPassword && !isPasswordVisible,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Colors.white38),
        prefixIcon: Icon(icon, color: Colors.white54),
        suffixIcon: isPassword 
          ? IconButton(
              icon: Icon(isPasswordVisible ? Icons.visibility : Icons.visibility_off, color: Colors.white38, size: 20),
              onPressed: onToggleVisibility,
            )
          : null,
        filled: true,
        fillColor: AppConstants.cardColor,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(vertical: 18),
      ),
    );
  }
}
