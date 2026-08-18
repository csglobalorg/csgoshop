import 'package:flutter/material.dart';

class AppConstants {
  static const String appName = 'CSGO SHOP';
  static const String supabaseUrl = 'https://sdbgeuyzepwnxpresktm.supabase.co';
  static const String supabaseAnonKey = 'YOUR_ANON_KEY'; // This will be handled in main
  
  // Colors (Premium Dark Theme)
  static const Color backgroundColor = Color(0xFF09090B); // Zinc 950
  static const Color cardColor = Color(0xFF18181B); // Zinc 900
  static const Color accentColor = Color(0xFFEAB308); // Premium Amber
  static const Color accentColorDark = Color(0xFFCA8A04); // Darker Amber
  static const Color secondaryAccent = Color(0xFF3B82F6); // Blue
  static const Color borderColor = Color(0xFF27272A); // Zinc 800
  static const Color surfaceColor = Color(0xFF0F0F13); // Slightly lighter than bg
  static const Color successColor = Color(0xFF10B981);
  static const Color errorColor = Color(0xFFEF4444);
  
  // Padding
  static const double defaultPadding = 16.0;
  static const double borderRadius = 20.0; // Rounder, premium feel
}
