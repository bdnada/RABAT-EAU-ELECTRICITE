import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';

class SessionService {
  static Timer? _timer;

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString("token", token);
    _startTimer();
  }

  static void _startTimer() {
    _timer?.cancel();
    _timer = Timer(const Duration(minutes: 10), logout);
  }

  static Future<void> logout() async {
    _timer?.cancel();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove("token");
  }
}
