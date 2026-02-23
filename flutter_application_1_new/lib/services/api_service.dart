import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/adresse.dart';

class ApiService {
  final String baseUrl =
      "https://midweekly-unsuggestive-keenan.ngrok-free.dev/api";

  // ✅ Keys SharedPreferences
  static const String _kJwt = 'jwt';
  static const String _kPinFailed = 'pin_failed_attempts';
  static const String _kPinLocked = 'pin_locked';
  static const String _kPinUnlockPending = 'pin_unlock_pending';

  // ✅ Cache agent
  static const String _kAgentName = 'agent_name';
  static const String _kAgentQuartier = 'agent_quartier';

  // ✅ Identifiants pour retrouver l’agent connecté
  static const String _kAgentUsername = 'agent_username'; // login normal (email)
  static const String _kAgentPhone = 'agent_phone'; // login pin (tel)

  // ================= LOGIN =================
  Future<String?> login(String username, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/agent/auth/login'),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"username": username, "password": password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['token'];

      if (token == null || token.toString().isEmpty) {
        throw Exception("Token manquant");
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kJwt, token.toString());

      await prefs.setString(_kAgentUsername, username.trim());
      await prefs.remove(_kAgentPhone);

      await prefs.setBool(_kPinUnlockPending, true);
      await cacheAgentProfileIfAny();

      return token.toString();
    } else {
      throw Exception("Erreur d'authentification");
    }
  }

  // ================= LOGIN PIN =================
  Future<String> loginWithPin(String phoneNumber, String pin) async {
    final prefs = await SharedPreferences.getInstance();

    final locked = prefs.getBool(_kPinLocked) ?? false;
    if (locked) {
      throw Exception(
          "Accès PIN bloqué. Connectez-vous avec Login puis déconnectez-vous pour réactiver.");
    }

    final url = Uri.parse('$baseUrl/agent/auth/login-pin');

    final response = await http.post(
      url,
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "phoneNumber": phoneNumber,
        "pin": pin,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['token'] as String?;

      if (token == null || token.isEmpty) {
        throw Exception("Token manquant");
      }

      await prefs.setString(_kJwt, token);

      await prefs.setString(_kAgentPhone, phoneNumber.trim());
      await prefs.remove(_kAgentUsername);

      await cacheAgentProfileIfAny();

      await prefs.setInt(_kPinFailed, 0);
      return token;
    }

    String msg = "Erreur de connexion PIN";
    try {
      final body = jsonDecode(response.body);
      if (body is Map) {
        if (body["message"] != null) msg = body["message"].toString();
        if (body["error"] != null) msg = body["error"].toString();
      }
    } catch (_) {
      if (response.body.isNotEmpty) msg = response.body;
    }

    throw Exception(msg);
  }

  // ================= LOGOUT =================
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    final unlockPending = prefs.getBool(_kPinUnlockPending) ?? false;

    await prefs.clear();

    if (unlockPending) {
      final p = await SharedPreferences.getInstance();
      await p.setBool(_kPinLocked, false);
      await p.setInt(_kPinFailed, 0);
      await p.setBool(_kPinUnlockPending, false);
    }
  }

  // ================= GET TOURNEE =================
  Future<List<Map<String, dynamic>>> getTournee() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/agent/tournee'),
      headers: {"Authorization": "Bearer $token"},
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return List<Map<String, dynamic>>.from(data);
    } else {
      throw Exception("Erreur récupération tournée");
    }
  }

  // ================= GET TOURNEE TRAITEES =================
  Future<List<Adresse>> getTourneeTraitees() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/agent/tournee-traitees'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final List jsonList = jsonDecode(response.body);
      return jsonList.map((e) => Adresse.fromJson(e)).toList();
    } else {
      throw Exception("Erreur récupération relevés traités");
    }
  }

  // ================= GET COMPTEURS =================
  Future<List<Map<String, dynamic>>> getCompteurs(int adresseId) async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/agent/compteurs/$adresseId'),
      headers: {"Authorization": "Bearer $token"},
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return List<Map<String, dynamic>>.from(data);
    } else {
      throw Exception("Erreur récupération compteurs");
    }
  }

  // ================= SAVE RELEVES =================
  Future<void> saveReleves(List<Map<String, dynamic>> releves) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/agent/releves'),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
      body: jsonEncode(releves),
    );
    if (response.statusCode != 200) {
      throw Exception("Erreur sauvegarde relevés");
    }
  }

  // ================= CHANGE PASSWORD =================
  Future<void> changePassword(String oldPass, String newPass) async {
    final token = await _getToken();

    final response = await http.post(
      Uri.parse('$baseUrl/agent/auth/change-password'),
      headers: {
        "Authorization": "Bearer $token",
        "Content-Type": "application/json",
      },
      body: jsonEncode({
        "oldPassword": oldPass,
        "newPassword": newPass,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception("Erreur changement mot de passe");
    }
  }

  // ================= MESSAGES =================
  Future<List<Map<String, dynamic>>> getAgentMessages() async {
    final token = await _getToken();

    final response = await http.get(
      Uri.parse('$baseUrl/messages/agent'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      return List<Map<String, dynamic>>.from(jsonDecode(response.body));
    } else {
      throw Exception("Erreur récupération messages");
    }
  }

  Future<int> getUnreadCount() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse('$baseUrl/messages/agent/unread-count'),
      headers: {'Authorization': 'Bearer $token'},
    );

    if (response.statusCode == 200) {
      return int.parse(response.body);
    } else {
      throw Exception("Erreur récupération badge");
    }
  }

  /// ✅ ENVOI TEXTE + IMAGE (CORRIGÉ + DEBUG)
  Future<void> sendMessageFromAgent(String contenu, {File? image}) async {
    final token = await _getToken();

    final request = http.MultipartRequest(
      'POST',
      Uri.parse('$baseUrl/messages/agent/image'),
    );

    request.headers['Authorization'] = 'Bearer $token';
    request.fields['contenu'] = contenu;

    if (image != null) {
      request.files.add(await http.MultipartFile.fromPath('image', image.path));
    }

    final streamed = await request.send();
    final status = streamed.statusCode;
    final body = await streamed.stream.bytesToString();

    // ✅ logs pour voir l’erreur exacte
    // ignore: avoid_print
    print("SEND MSG STATUS=$status");
    // ignore: avoid_print
    print("SEND MSG BODY=$body");

    // ✅ accepte aussi 204 (No Content)
    if (status != 200 && status != 201 && status != 204) {
      throw Exception("Erreur envoi message ($status): $body");
    }
  }

  Future<void> updateMessageByAgent(int messageId, String message) async {
    final token = await _getToken();
    final response = await http.put(
      Uri.parse('$baseUrl/messages/agent/$messageId'),
      headers: {
        "Authorization": "Bearer $token",
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: message,
    );

    if (response.statusCode != 200) {
      throw Exception("Erreur modification message");
    }
  }

  Future<void> deleteMessageByAgent(int messageId) async {
    final token = await _getToken();
    final response = await http.delete(
      Uri.parse('$baseUrl/messages/agent/$messageId'),
      headers: {"Authorization": "Bearer $token"},
    );

    if (response.statusCode != 200) {
      throw Exception("Erreur suppression message");
    }
  }

  // ================= FCM TOKEN =================
  Future<void> saveFcmToken(String tokenFCM) async {
    final token = await _getToken();
    final response = await http.post(
      Uri.parse('$baseUrl/agent/fcm-token'),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
      body: jsonEncode({"fcmToken": tokenFCM}),
    );
    if (response.statusCode != 200) {
      throw Exception("Erreur sauvegarde FCM token");
    }
  }

  // ================= ✅ SEND LOCATION =================
  Future<void> sendMyLocation(double lat, double lon) async {
    final token = await _getToken();

    final res = await http.post(
      Uri.parse('$baseUrl/agent/location'),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
      body: jsonEncode({
        "latitude": lat,
        "longitude": lon,
      }),
    );

    if (res.statusCode != 200 && res.statusCode != 204) {
      throw Exception("Erreur envoi localisation: ${res.statusCode} ${res.body}");
    }
  }

  // ================= TOKEN =================
  Future<String> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_kJwt);
    if (token == null) throw Exception("Token manquant, reconnectez-vous");
    return token;
  }

  Future<String?> get token async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kJwt);
  }

  // ================= PROFIL AGENT =================
  Future<List<Map<String, dynamic>>> _getAgentsList() async {
    final t = await _getToken();
    final res = await http.get(
      Uri.parse('$baseUrl/agents'),
      headers: {"Authorization": "Bearer $t"},
    );

    if (res.statusCode != 200) {
      throw Exception("Erreur récupération liste agents");
    }

    final decoded = jsonDecode(res.body);

    if (decoded is List) {
      return decoded.map((e) => Map<String, dynamic>.from(e)).toList();
    }

    if (decoded is Map) {
      final candidates = ['data', 'content', 'items', 'result'];
      for (final k in candidates) {
        final v = decoded[k];
        if (v is List) {
          return v.map((e) => Map<String, dynamic>.from(e)).toList();
        }
      }
    }

    throw Exception("Format liste agents inattendu");
  }

  String _buildFullName(Map<String, dynamic> agent) {
    final nom = (agent['nom'] ?? '').toString().trim();
    final prenom = (agent['prenom'] ?? '').toString().trim();
    final full = ('$nom $prenom').trim();
    return full.isEmpty ? 'Agent Terrain' : full;
  }

  Future<Map<String, dynamic>?> getCurrentAgentProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final username = (prefs.getString(_kAgentUsername) ?? '').trim().toLowerCase();
    final phone = (prefs.getString(_kAgentPhone) ?? '').trim();

    final agents = await _getAgentsList();

    if (username.isNotEmpty) {
      for (final a in agents) {
        final u = (a['username'] ?? '').toString().trim().toLowerCase();
        final e = (a['email'] ?? '').toString().trim().toLowerCase();
        if (u == username || e == username) return a;
      }
    }

    if (phone.isNotEmpty) {
      for (final a in agents) {
        final tp = (a['telProfessionnel'] ?? '').toString().trim();
        final tpers = (a['telPersonnel'] ?? '').toString().trim();
        if (tp == phone || tpers == phone) return a;
      }
    }

    for (final a in agents) {
      if (a['loginStatus'] == true) return a;
    }

    return null;
  }

  Future<void> cacheAgentProfileIfAny() async {
    try {
      final agent = await getCurrentAgentProfile();
      if (agent == null) return;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_kAgentName, _buildFullName(agent));

      final quartier = (agent['quartier'] ?? '').toString().trim();
      await prefs.setString(_kAgentQuartier, quartier.isEmpty ? '—' : quartier);
    } catch (_) {}
  }

  Future<String?> getCachedAgentName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kAgentName);
  }

  Future<String?> getCachedAgentQuartier() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_kAgentQuartier);
  }
}
