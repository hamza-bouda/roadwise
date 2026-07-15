// lib/auth_gate.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth/auth_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/technician/technician_home.dart';
import 'screens/user/home_screen.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }
    return auth.isTechnician
        ?  TechnicianHomeScreen()
        :  HomeScreen();
  }
}
