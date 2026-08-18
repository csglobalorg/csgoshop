import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/auth_provider.dart';
import 'signup_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isPasswordVisible = false;

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    ref.listen<AuthState>(authProvider, (previous, next) {
      // If we just successfully logged in, pop the screen
      if (previous?.profile == null && next.profile != null && next.error == null) {
        Navigator.of(context).pop();
      }
    });

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),

              // LOGO
              Center(
                child: Container(
                  height: 140,
                  clipBehavior: Clip.antiAlias,
                  decoration: const BoxDecoration(), // removed shadow for clean look
                  child: Image.asset('assets/images/app_icon.png', fit: BoxFit.contain),
                ),
              ),

              const SizedBox(height: 40),

              // TITLE
              const Text(
                "Welcome Back",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 8),

              const Text(
                "Login to continue shopping",
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 14,
                ),
              ),

              const SizedBox(height: 30),

              // Error Message
              if (authState.error != null)
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: Text(
                    authState.error!,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 12),
                  ),
                ),

              // PHONE INPUT
              _inputField(
                controller: _phoneController,
                hint: "Phone Number",
                icon: Icons.phone,
              ),

              const SizedBox(height: 16),

              // PASSWORD INPUT
              _inputField(
                controller: _passwordController,
                hint: "Password",
                icon: Icons.lock,
                isPassword: true,
                isPasswordVisible: _isPasswordVisible,
                onToggleVisibility: () => setState(() => _isPasswordVisible = !_isPasswordVisible),
              ),

              const SizedBox(height: 10),

              // FORGOT
              const Align(
                alignment: Alignment.centerRight,
                child: Text(
                  "Forgot Password?",
                  style: TextStyle(color: AppConstants.accentColor),
                ),
              ),

              const SizedBox(height: 30),

              // LOGIN BUTTON
              GestureDetector(
                onTap: authState.isLoading 
                  ? null 
                  : () => ref.read(authProvider.notifier).login(
                    _phoneController.text, 
                    _passwordController.text
                  ),
                child: Container(
                  height: 55,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: const LinearGradient(
                      colors: [AppConstants.accentColor, Color(0xFFFFC107)],
                    ),
                  ),
                  child: Center(
                    child: authState.isLoading
                      ? const CircularProgressIndicator(color: Colors.black)
                      : const Text(
                          "LOGIN",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                            fontSize: 16,
                          ),
                        ),
                  ),
                ),
              ),

              const SizedBox(height: 30),

              // DIVIDER
              Row(
                children: const [
                  Expanded(child: Divider(color: Colors.white24)),
                  Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10),
                    child: Text("OR",
                        style: TextStyle(color: Colors.white54)),
                  ),
                  Expanded(child: Divider(color: Colors.white24)),
                ],
              ),

              const SizedBox(height: 20),

              // GUEST BUTTON
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  height: 50,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white24),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: Text(
                      "Continue as Guest",
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // REGISTER
              Center(
                child: GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const SignupScreen()),
                  ),
                  child: Text.rich(
                    TextSpan(
                      text: "Don't have an account? ",
                      style: const TextStyle(color: Colors.white54),
                      children: [
                        TextSpan(
                          text: "Register Now",
                          style: const TextStyle(color: AppConstants.accentColor),
                        )
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 20),
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
              icon: Icon(
                isPasswordVisible ? Icons.visibility : Icons.visibility_off,
                color: Colors.white38,
                size: 20,
              ),
              onPressed: onToggleVisibility,
            )
          : null,
        filled: true,
        fillColor: AppConstants.cardColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 18),
      ),
    );
  }
}
