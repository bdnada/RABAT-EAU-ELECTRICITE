import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';

class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({Key? key}) : super(key: key);

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final ApiService apiService = ApiService();

  final TextEditingController oldPasswordController = TextEditingController();
  final TextEditingController newPasswordController = TextEditingController();
  final TextEditingController confirmPasswordController = TextEditingController();

  bool loading = false;
  bool isDarkMode = false;

  bool _obscureOld = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  // ===== THEME (comme tes autres pages) =====
  Color get primary => isDarkMode ? const Color(0xFF93C5FD) : const Color(0xFF2563EB);
  Color get bg => isDarkMode ? const Color(0xFF0B1220) : const Color(0xFFF6F7FB);
  Color get surface => isDarkMode ? const Color(0xFF0F172A) : Colors.white;
  Color get border => isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);
  Color get text => isDarkMode ? Colors.white : const Color(0xFF0F172A);
  Color get subText => isDarkMode ? Colors.white70 : const Color(0xFF64748B);

  TextStyle get h1 => GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w800, color: text);
  TextStyle get h2 => GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500, color: subText);

  TextStyle get labelStyle =>
      GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: subText);

  TextStyle get inputStyle =>
      GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: text);

  @override
  void initState() {
    super.initState();
    _loadTheme();
  }

  @override
  void dispose() {
    oldPasswordController.dispose();
    newPasswordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() => isDarkMode = prefs.getBool('dark_mode') ?? false);
  }

  void _showMessage(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
        behavior: SnackBarBehavior.floating,
        backgroundColor: isError ? const Color(0xFFEF4444) : primary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  Future<void> changePassword() async {
    final oldPass = oldPasswordController.text.trim();
    final newPass = newPasswordController.text.trim();
    final confirmPass = confirmPasswordController.text.trim();

    if (oldPass.isEmpty || newPass.isEmpty || confirmPass.isEmpty) {
      _showMessage("Tous les champs sont obligatoires", isError: true);
      return;
    }

    if (newPass != confirmPass) {
      _showMessage("Les mots de passe ne correspondent pas", isError: true);
      return;
    }

    setState(() => loading = true);

    try {
      await apiService.changePassword(oldPass, newPass);
      _showMessage("Mot de passe modifié avec succès");
      if (!mounted) return;
      Navigator.pop(context);
    } catch (_) {
      _showMessage("Erreur : Vérifiez votre ancien mot de passe", isError: true);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      appBar: _buildAppBar(),
      body: RefreshIndicator(
        onRefresh: _loadTheme, // pour refléter le thème si changé ailleurs
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
          children: [
            _headerCard(),
            const SizedBox(height: 12),
            _formCard(),
            const SizedBox(height: 14),
            _tipsCard(),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0.5,
      backgroundColor: surface,
      surfaceTintColor: surface,
      iconTheme: IconThemeData(color: text),
      titleSpacing: 0,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Mot de passe", style: h1),
          Text("Sécurité du compte", style: h2),
        ],
      ),
    );
  }

  Widget _headerCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(Iconsax.shield_tick, color: primary, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Changer votre mot de passe",
                    style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w800, color: text)),
                const SizedBox(height: 4),
                Text("Choisissez un mot de passe fort et unique.", style: h2),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _formCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Column(
        children: [
          _fieldLabel("Ancien mot de passe"),
          _passwordField(
            controller: oldPasswordController,
            hint: "Saisir l’ancien mot de passe",
            icon: Iconsax.lock_1,
            obscure: _obscureOld,
            toggle: () => setState(() => _obscureOld = !_obscureOld),
          ),
          const SizedBox(height: 12),
          _fieldLabel("Nouveau mot de passe"),
          _passwordField(
            controller: newPasswordController,
            hint: "Saisir le nouveau mot de passe",
            icon: Iconsax.key,
            obscure: _obscureNew,
            toggle: () => setState(() => _obscureNew = !_obscureNew),
          ),
          const SizedBox(height: 12),
          _fieldLabel("Confirmer le mot de passe"),
          _passwordField(
            controller: confirmPasswordController,
            hint: "Confirmer le nouveau mot de passe",
            icon: Iconsax.password_check,
            obscure: _obscureConfirm,
            toggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: primary,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: loading ? null : changePassword,
              icon: loading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Iconsax.tick_circle, size: 20),
              label: Text(
                loading ? "Enregistrement..." : "Enregistrer",
                style: GoogleFonts.poppins(fontWeight: FontWeight.w800),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tipsCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: (isDarkMode ? Colors.white : Colors.black).withOpacity(0.06),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(Iconsax.info_circle, color: subText, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Conseil sécurité",
                    style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w800, color: text)),
                const SizedBox(height: 6),
                Text(
                  "Utilisez au moins 8 caractères avec lettres, chiffres et symboles.",
                  style: h2,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _fieldLabel(String t) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(left: 2, bottom: 6),
        child: Text(t, style: labelStyle),
      ),
    );
  }

  Widget _passwordField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required bool obscure,
    required VoidCallback toggle,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.white10 : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        style: inputStyle,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.poppins(color: subText, fontSize: 12, fontWeight: FontWeight.w500),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          prefixIcon: Icon(icon, color: subText, size: 20),
          suffixIcon: IconButton(
            onPressed: toggle,
            icon: Icon(obscure ? Iconsax.eye_slash : Iconsax.eye, color: subText, size: 20),
          ),
        ),
      ),
    );
  }
}
