// lib/app.dart

import 'package:flutter/material.dart';
import 'constants/strings.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/user/home_screen.dart';

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppStrings.appTitle,
      theme: ThemeData(primarySwatch: Colors.deepPurple),
      debugShowCheckedModeBanner: false,
      initialRoute: '/login',
      routes: {
        '/login': (_) =>  LoginScreen(),
        '/signup': (_) => SignupScreen(),
        '/home': (_) =>   HomeScreen(),
      },
    );
  }
}
