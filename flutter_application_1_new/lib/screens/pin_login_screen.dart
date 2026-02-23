import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:iconsax/iconsax.dart';

import '../services/api_service.dart';
import 'tournee_screen.dart';
import 'login_screen.dart';

enum _InputTarget { phone, pin, none }

class PinLoginScreen extends StatefulWidget {
  const PinLoginScreen({Key? key}) : super(key: key);

  @override
  State<PinLoginScreen> createState() => _PinLoginScreenState();
}

class _PinLoginScreenState extends State<PinLoginScreen> {
  final ApiService apiService = ApiService();

  final TextEditingController _phoneController = TextEditingController();
  final FocusNode _phoneFocus = FocusNode();

  bool _loading = false;

  /// ✅ Afficher = montrer les chiffres
  bool _showDigits = false;

  /// ✅ clavier bancaire visible uniquement si target == pin
  _InputTarget _target = _InputTarget.none;

  static const int _pinLength = 6;
  String _pin = "";

  int _pulseIndex = -1;
  List<int> _digits = [];

  final Color primary = const Color(0xFF2563EB);
  final Color secondary = const Color(0xFF38BDF8);

  static const String _kPinFailed = 'pin_failed_attempts';
  static const String _kPinLocked = 'pin_locked';

  @override
  void initState() {
    super.initState();
    _shuffleDigits();
    _checkPinLockedOnStart();

    // ✅ quand on focus téléphone -> cacher clavier bancaire
    _phoneFocus.addListener(() {
      if (_phoneFocus.hasFocus) {
        if (!mounted) return;
        setState(() => _target = _InputTarget.phone);
      }
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _phoneFocus.dispose();
    super.dispose();
  }

  // =================== Dialog ===================
  Future<void> _showProDialog({
    required String title,
    required String message,
    bool isError = true,
    VoidCallback? onOk,
  }) async {
    if (!mounted) return;
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 22),
          child: Container(
            padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x22000000),
                  blurRadius: 20,
                  offset: Offset(0, 10),
                )
              ],
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: isError ? const Color(0xFFFFF2F2) : const Color(0xFFF2FFF7),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    isError ? Icons.lock_rounded : Icons.check_circle_rounded,
                    color: isError ? const Color(0xFFE53935) : const Color(0xFF2E7D32),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: GoogleFonts.poppins(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.black87,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        message,
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey.shade700,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: () {
                            Navigator.pop(context);
                            if (onOk != null) onOk();
                          },
                          child: Text(
                            "OK",
                            style: GoogleFonts.poppins(
                              color: primary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // =================== Locked ? ===================
  Future<void> _checkPinLockedOnStart() async {
    final prefs = await SharedPreferences.getInstance();
    final locked = prefs.getBool(_kPinLocked) ?? false;

    if (locked && mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        await _showProDialog(
          title: "Accès PIN bloqué",
          message: "Vous devez vous connecter avec Login puis vous déconnecter pour réactiver le PIN.",
          isError: true,
          onOk: () {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          },
        );
      });
    }
  }

  // =================== Shuffle digits ===================
  void _shuffleDigits() {
    final d = List<int>.generate(10, (i) => i);
    d.shuffle();
    if (!mounted) return;
    setState(() => _digits = d);
  }

  void _clearPin({bool reshuffle = false}) {
    if (!mounted) return;
    setState(() {
      _pin = "";
      _pulseIndex = -1;
    });
    if (reshuffle) _shuffleDigits();
  }

  void _pulseBox(int index) {
    if (!mounted) return;
    setState(() => _pulseIndex = index);
    Future.delayed(const Duration(milliseconds: 140), () {
      if (!mounted) return;
      if (_pulseIndex == index) setState(() => _pulseIndex = -1);
    });
  }

  // =================== Failed attempts ===================
  Future<void> _recordFailedAttemptAndMaybeLock() async {
    final prefs = await SharedPreferences.getInstance();
    final current = prefs.getInt(_kPinFailed) ?? 0;
    final next = current + 1;

    if (next >= 3) {
      await prefs.setBool(_kPinLocked, true);
      await prefs.setInt(_kPinFailed, 0);

      if (!mounted) return;
      await _showProDialog(
        title: "Trop de tentatives",
        message: "Accès PIN bloqué. Connectez-vous avec Login puis déconnectez-vous pour réactiver.",
        isError: true,
        onOk: () {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const LoginScreen()),
          );
        },
      );
      return;
    }

    await prefs.setInt(_kPinFailed, next);

    if (!mounted) return;
    await _showProDialog(
      title: "PIN incorrect",
      message: "Tentatives restantes : ${3 - next}",
      isError: true,
    );
  }

  Future<void> _resetFailedAttempts() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kPinFailed, 0);
  }

  // =================== Login ===================
  Future<void> _loginWithPin() async {
    final phone = _phoneController.text.trim();
    final pin = _pin;

    if (phone.isEmpty || pin.isEmpty) {
      await _showProDialog(
        title: "Champs requis",
        message: "Veuillez saisir le téléphone et le code PIN.",
        isError: true,
      );
      return;
    }

    if (!RegExp(r'^\d{6}$').hasMatch(pin)) {
      await _showProDialog(
        title: "Code invalide",
        message: "Le code PIN doit contenir 6 chiffres.",
        isError: true,
      );
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    final locked = prefs.getBool(_kPinLocked) ?? false;
    if (locked) {
      await _showProDialog(
        title: "Accès PIN bloqué",
        message: "Connectez-vous avec Login puis déconnectez-vous pour réactiver le PIN.",
        isError: true,
        onOk: () {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const LoginScreen()),
          );
        },
      );
      return;
    }

    setState(() => _loading = true);
    try {
      await apiService.loginWithPin(phone, pin);
      await _resetFailedAttempts();

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const TourneeScreen()),
      );
    } catch (_) {
      HapticFeedback.heavyImpact();
      await _recordFailedAttemptAndMaybeLock();
      _clearPin(reshuffle: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // =================== Keyboard actions ===================
  void _onDigitTap(int digit) {
    if (_loading) return;
    if (_pin.length >= _pinLength) return;

    HapticFeedback.selectionClick();

    final newPin = _pin + digit.toString();
    final idx = newPin.length - 1;

    setState(() => _pin = newPin);
    _pulseBox(idx);

    if (newPin.length == _pinLength) {
      Future.delayed(const Duration(milliseconds: 120), () {
        if (!mounted) return;
        _loginWithPin();
      });
    }
  }

  void _onBackspace() {
    if (_loading) return;
    if (_pin.isEmpty) return;
    HapticFeedback.selectionClick();
    setState(() => _pin = _pin.substring(0, _pin.length - 1));
  }

  // ✅ show PIN keyboard
  void _activatePin() {
    FocusScope.of(context).unfocus(); // cache le clavier téléphone
    setState(() => _target = _InputTarget.pin);
  }

  // ✅ show phone keyboard + hide pin keyboard
  void _activatePhone() {
    setState(() => _target = _InputTarget.phone);
    _phoneFocus.requestFocus();
  }

  // ✅ click outside
  void _dismissAll() {
    FocusScope.of(context).unfocus();
    setState(() => _target = _InputTarget.none);
  }

  bool get _bankKeyboardVisible => _target == _InputTarget.pin;

  // =================== UI ===================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF6F7FB),

      bottomNavigationBar: SafeArea(
        top: false,
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 180),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: _bankKeyboardVisible
              ? Padding(
                  key: const ValueKey("keyboard"),
                  padding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
                  child: _bankKeyboard(),
                )
              : const SizedBox(key: ValueKey("hidden"), height: 0),
        ),
      ),

      body: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onTap: _dismissAll,
        child: Stack(
          children: [
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      primary.withOpacity(0.14),
                      secondary.withOpacity(0.10),
                      Colors.white,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              ),
            ),

            SafeArea(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(18, 10, 18, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Iconsax.arrow_left_2, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 6),

                      Center(
                        child: Column(
                          children: [
                            Container(
                              width: 84,
                              height: 84,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(22),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.06),
                                    blurRadius: 18,
                                    offset: const Offset(0, 10),
                                  ),
                                ],
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(22),
                                child: Image.asset('assets/logo.png', fit: BoxFit.contain),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              "Connexion par PIN",
                              style: GoogleFonts.poppins(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              "Accès rapide et sécurisé",
                              style: GoogleFonts.poppins(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 18),
                      _buildCard(),
                      const SizedBox(height: 18),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 18,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Téléphone",
              style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A))),
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () {
              // ✅ activer téléphone -> cacher clavier bancaire
              _activatePhone();
            },
            child: _phoneField(),
          ),

          const SizedBox(height: 14),

          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: _activatePin, // ✅ activer PIN -> afficher clavier bancaire
                  child: Text("Code PIN",
                      style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A))),
                ),
              ),
              InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => setState(() => _showDigits = !_showDigits),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                  child: Row(
                    children: [
                      Icon(_showDigits ? Iconsax.eye : Iconsax.eye_slash, size: 16, color: Colors.grey.shade700),
                      const SizedBox(width: 6),
                      Text(
                        _showDigits ? "Masquer" : "Afficher",
                        style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey.shade700),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          GestureDetector(
            onTap: _activatePin, // ✅ si clique sur cases -> ouvrir clavier bancaire
            child: _pinBoxesRow(),
          ),

          const SizedBox(height: 14),

          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _loading ? null : _loginWithPin,
              style: ElevatedButton.styleFrom(
                backgroundColor: primary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: Colors.black.withOpacity(0.12),
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: _loading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                    )
                  : Text("Se connecter", style: GoogleFonts.poppins(fontWeight: FontWeight.w800)),
            ),
          ),

          const SizedBox(height: 10),
          Center(
            child: GestureDetector(
              onTap: () {
                Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
              },
              child: Text("Se connecter avec login",
                  style: GoogleFonts.poppins(fontSize: 12.5, fontWeight: FontWeight.w600, color: primary)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _phoneField() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F8FA),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE6E8EC), width: 1),
      ),
      child: Row(
        children: [
          Icon(Iconsax.call, size: 18, color: primary),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              focusNode: _phoneFocus,
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              style: GoogleFonts.poppins(
                color: Colors.black87,
                fontSize: 15,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.4,
              ),
              decoration: InputDecoration(
                border: InputBorder.none,
                hintText: "Téléphone professionnel",
                hintStyle: GoogleFonts.poppins(color: Colors.grey.shade500, fontSize: 13, fontWeight: FontWeight.w500),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _pinBoxesRow() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: List.generate(_pinLength, (i) {
        final filled = i < _pin.length;
        final isPulsing = i == _pulseIndex;

        return AnimatedScale(
          duration: const Duration(milliseconds: 140),
          scale: isPulsing ? 1.08 : 1.0,
          curve: Curves.easeOut,
          child: Container(
            width: 46,
            height: 52,
            decoration: BoxDecoration(
              color: const Color(0xFFF7F8FA),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: filled ? primary.withOpacity(0.55) : const Color(0xFFE6E8EC),
                width: filled ? 1.2 : 1,
              ),
            ),
            alignment: Alignment.center,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 140),
              transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
              child: filled
                  ? (_showDigits
                      ? Text(
                          _pin[i],
                          key: ValueKey("digit_${i}_${_pin[i]}"),
                          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w900, color: primary),
                        )
                      : Container(
                          key: ValueKey("dot_$i"),
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(color: primary, shape: BoxShape.circle),
                        ))
                  : SizedBox(key: ValueKey("empty_$i")),
            ),
          ),
        );
      }),
    );
  }

  Widget _bankKeyboard() {
    final top9 = _digits.where((d) => d != 0).take(9).toList();

    final keys = <Widget>[
      ...top9.map((d) => _keyDigit(d)),
      _keyAction(icon: Iconsax.close_circle, onTap: () => _clearPin(reshuffle: true)),
      _keyDigit(0),
      _keyAction(icon: Iconsax.arrow_left_2, onTap: _onBackspace),
    ];

    return Container(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.black.withOpacity(0.06)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 18,
            offset: const Offset(0, -2),
          )
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 44,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.08),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(height: 10),
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.55,
            children: keys,
          ),
        ],
      ),
    );
  }

  Widget _keyDigit(int digit) {
    return _keyBase(
      onTap: () => _onDigitTap(digit),
      child: Text(
        "$digit",
        style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
      ),
    );
  }

  Widget _keyAction({required IconData icon, required VoidCallback onTap}) {
    return _keyBase(
      onTap: onTap,
      child: Icon(icon, color: Colors.grey.shade700, size: 20),
    );
  }

  Widget _keyBase({required VoidCallback onTap, required Widget child}) {
    return Material(
      color: const Color(0xFFF7F8FA),
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE6E8EC)),
          ),
          alignment: Alignment.center,
          child: child,
        ),
      ),
    );
  }
}
