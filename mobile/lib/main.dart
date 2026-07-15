import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'providers/auth/auth_provider.dart';
import 'providers/user/user_provider.dart';
import 'providers/user/theme_provider.dart';
import 'providers/technician/technician_provider.dart';

import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/technician/technician_home.dart';
import 'screens/user/home_screen.dart';
import 'auth_gate.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await initializeDateFormatting('fr_FR', null);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => UserProvider()),
        ChangeNotifierProvider(
          create: (_) {
            final p = TechnicianProvider();
            p.startListening();
            return p;
          },
        ),
      ],
      child: Consumer<ThemeProvider>(
        builder: (ctx, themeProvider, _) {
          final cs = themeProvider.isDark
              ? const ColorScheme.dark(
            primary: Color(0xFF1DE9B6),
            secondary: Color(0xFF0D47A1),
            background: Color(0xFF121212),
            surface: Color(0xFF1E1E1E),
            onPrimary: Colors.black,
            onSecondary: Colors.black,
            onBackground: Colors.white,
            onSurface: Colors.white,
            error: Colors.redAccent,
          )
              : const ColorScheme.light(
            primary: Color(0xFF0D47A1),
            secondary: Color(0xFF1DE9B6),
            background: Color(0xFFF5F5F5),
            surface: Colors.white,
            onPrimary: Colors.white,
            onSecondary: Colors.white,
            onBackground: Color(0xFF212121),
            onSurface: Color(0xFF212121),
            error: Colors.redAccent,
          );

          return MaterialApp(
            title: 'SmartRoute',
            themeMode: themeProvider.mode,
            theme: ThemeData(colorScheme: cs, fontFamily: 'Ubuntu'),
            darkTheme: ThemeData(colorScheme: cs, fontFamily: 'Ubuntu'),
            routes: {
              LoginScreen.routeName: (_) => const LoginScreen(),
              SignupScreen.routeName: (_) => const SignupScreen(),
              TechnicianHomeScreen.routeName: (_) => const TechnicianHomeScreen(),
              HomeScreen.routeName: (_) => const HomeScreen(),
            },
            home: const AuthGate(),
          );
        },
      ),
    );
  }
}
