import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'main_screen.dart';
import 'package:flutter_animate/flutter_animate.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (context) => const MainScreen()));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/images/app_icon.png',
              width: 120,
              height: 120,
            )
                .animate()
                .fadeIn(duration: 800.ms)
                .scale(delay: 200.ms)
                .shimmer(delay: 1000.ms, duration: 1500.ms),
            const SizedBox(height: 24),
            const Text(
              'CSGO SHOP',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                letterSpacing: 4,
                color: Colors.white,
              ),
            ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),
            const SizedBox(height: 8),
            const Text(
              'Best Bangladeshi Online SHOP',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                letterSpacing: 1.5,
                color: AppConstants.accentColor,
              ),
            ).animate().fadeIn(delay: 700.ms),
            const SizedBox(height: 24),
            const CircularProgressIndicator(color: AppConstants.accentColor)
                .animate()
                .fadeIn(delay: 1000.ms),
          ],
        ),
      ),
    );
  }
}
