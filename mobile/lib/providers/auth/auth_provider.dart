import 'package:flutter/foundation.dart';
import '../../models/auth/user.dart';
import '../../services/auth/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final _service = AuthService();

  UserModel? _user;
  bool _isLoading = true;

  UserModel? get user            => _user;
  bool        get isLoading      => _isLoading;
  bool        get isAuthenticated => _user != null;
  bool        get isTechnician   => _user?.role == 'technician';

  AuthProvider() {
    _init();
  }

  Future<void> _init() async {
    _user = await _service.getCurrentUserModel();
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> signup({
    required String name,
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      _user = await _service.signup(
        name: name,
        email: email,
        password: password,
      );
      return true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    notifyListeners();
    try {
      _user = await _service.login(
        email: email,
        password: password,
      );
      return true;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _service.logout();
    _user = null;
    notifyListeners();
  }
}
