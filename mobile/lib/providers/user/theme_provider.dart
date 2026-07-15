import 'package:flutter/material.dart';

class ThemeProvider with ChangeNotifier {
  ThemeMode _mode = ThemeMode.light;
  ThemeMode get mode => _mode;
  bool get isDark => _mode == ThemeMode.dark;

  void toggleDarkMode(bool on) {
    _mode = on ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }
}
