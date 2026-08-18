import 'package:flutter/material.dart';
import '../../core/constants.dart';
import '../../ui/theme/app_theme.dart' as premium;

class AppTheme {
  // Backward compatibility aliases mapped to new premium theme colors
  static const Color primaryNavy = AppConstants.backgroundColor;
  static const Color primaryAmber = AppConstants.accentColor;
  static const Color cardNavy = AppConstants.cardColor;
  
  static ThemeData get darkTheme => premium.AppTheme.darkTheme;
}
