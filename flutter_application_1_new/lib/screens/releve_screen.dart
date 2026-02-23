import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';
import 'package:iconsax/iconsax.dart';

import '../services/api_service.dart';

class ReleveScreen extends StatefulWidget {
  final int compteurId;
  final String numeroCompteur;
  final int indexActuel;
  final String type;

  const ReleveScreen({
    Key? key,
    required this.compteurId,
    required this.numeroCompteur,
    required this.indexActuel,
    required this.type,
  }) : super(key: key);

  @override
  State<ReleveScreen> createState() => _ReleveScreenState();
}

class _ReleveScreenState extends State<ReleveScreen> {
  final ApiService apiService = ApiService();
  final TextEditingController indexController = TextEditingController();

  bool loading = false;
  bool isDarkMode = false;

  bool saved = false;
  int? nouvelIndex;
  DateTime? dateEnregistrement;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void dispose() {
    indexController.dispose();
    super.dispose();
  }

  Future<void> _init() async {
    await _loadTheme();
    await _checkIfSaved();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() => isDarkMode = prefs.getBool('dark_mode') ?? false);
  }

  Future<void> _checkIfSaved() async {
    final prefs = await SharedPreferences.getInstance();
    final savedIndex = prefs.getInt('saved_index_${widget.compteurId}');
    final savedTimestamp = prefs.getString('saved_date_${widget.compteurId}');

    if (!mounted) return;
    if (savedIndex != null && savedTimestamp != null) {
      setState(() {
        saved = true;
        nouvelIndex = savedIndex;
        dateEnregistrement = DateTime.tryParse(savedTimestamp);
      });
    }
  }

  // ===== Theme (comme Tournee) =====
  Color get primary => isDarkMode ? const Color(0xFF93C5FD) : const Color(0xFF2563EB);
  Color get bg => isDarkMode ? const Color(0xFF0B1220) : const Color(0xFFF6F7FB);
  Color get surface => isDarkMode ? const Color(0xFF0F172A) : Colors.white;
  Color get border => isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);
  Color get text => isDarkMode ? Colors.white : const Color(0xFF0F172A);
  Color get subText => isDarkMode ? Colors.white70 : const Color(0xFF64748B);

  bool get isEau => widget.type.toUpperCase().contains("EAU");

  Color get typeAccent => isEau ? const Color(0xFF38BDF8) : const Color(0xFFFBBF24);
  IconData get typeIcon => isEau ? Iconsax.drop : Iconsax.flash_1;

  TextStyle get h1 => GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w800, color: text);
  TextStyle get h2 => GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500, color: subText);

  Future<void> _saveReleve() async {
    final index = int.tryParse(indexController.text.trim());

    if (index == null) {
      _snack("Saisie invalide", error: true);
      return;
    }
    if (index < widget.indexActuel) {
      _snack("L'index doit être ≥ ${widget.indexActuel}", error: true);
      return;
    }

    setState(() => loading = true);

    try {
      await apiService.saveReleves([
        {
          "compteurId": widget.compteurId,
          "ancienIndex": widget.indexActuel,
          "nouvelIndex": index,
        }
      ]);

      final now = DateTime.now();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt('saved_index_${widget.compteurId}', index);
      await prefs.setString('saved_date_${widget.compteurId}', now.toIso8601String());

      if (!mounted) return;
      setState(() {
        saved = true;
        nouvelIndex = index;
        dateEnregistrement = now;
      });

      _snack("Relevé enregistré ✅");
    } catch (_) {
      _snack("Erreur de connexion", error: true);
    } finally {
      if (!mounted) return;
      setState(() => loading = false);
    }
  }

  void _snack(String msg, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        behavior: SnackBarBehavior.floating,
        backgroundColor: error ? const Color(0xFFEF4444) : const Color(0xFF22C55E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String dateTxt = (saved && dateEnregistrement != null)
        ? DateFormat('dd/MM/yyyy • HH:mm').format(dateEnregistrement!)
        : "—";

    return Scaffold(
      backgroundColor: bg,
      appBar: _buildAppBar(),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 120),
        children: [
          _headerCard(),
          const SizedBox(height: 12),
          _statusCard(dateTxt),
          const SizedBox(height: 12),
          _inputCard(),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _miniCard("Index précédent", "${widget.indexActuel}", Iconsax.arrow_left_2)),
              const SizedBox(width: 10),
              Expanded(child: _miniCard("Date relevé", dateTxt, Iconsax.calendar_1)),
            ],
          ),
        ],
      ),
      bottomNavigationBar: _bottomAction(),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0.5,
      backgroundColor: surface,
      surfaceTintColor: surface,
      iconTheme: IconThemeData(color: text),
      titleSpacing: 16,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Relevé", style: h1),
          Text("Compteur ${widget.numeroCompteur}", style: h2),
        ],
      ),
      actions: [
        Container(
          margin: const EdgeInsets.only(right: 12),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: typeAccent.withOpacity(0.14),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: typeAccent.withOpacity(0.25)),
          ),
          child: Row(
            children: [
              Icon(typeIcon, size: 16, color: typeAccent),
              const SizedBox(width: 6),
              Text(
                isEau ? "EAU" : "ÉLECTRICITÉ",
                style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w800, color: typeAccent),
              ),
            ],
          ),
        ),
      ],
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
            child: Icon(Iconsax.tag, color: primary, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Numéro de compteur", style: h2),
                const SizedBox(height: 2),
                Text(
                  widget.numeroCompteur,
                  style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w900, color: text),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Icon(Iconsax.arrow_right_3, size: 18, color: subText),
        ],
      ),
    );
  }

  Widget _statusCard(String dateTxt) {
    // Status: Validé / En attente / À faire
    String label = "À faire";
    Color color = const Color(0xFFF59E0B);
    IconData icon = Iconsax.clock;

    if (saved) {
      label = "Validé";
      color = const Color(0xFF22C55E);
      icon = Iconsax.tick_circle;
    }

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
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Statut", style: h2),
                const SizedBox(height: 2),
                Text(
                  label,
                  style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w900, color: text),
                ),
              ],
            ),
          ),
          Text(
            saved ? dateTxt : "—",
            style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: subText),
          ),
        ],
      ),
    );
  }

  Widget _inputCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: saved ? const Color(0xFF22C55E).withOpacity(0.35) : border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(saved ? "Nouvel index (enregistré)" : "Saisir le nouvel index",
              style: GoogleFonts.poppins(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: saved ? const Color(0xFF22C55E) : primary,
              )),
          const SizedBox(height: 10),
          saved
              ? Row(
                  children: [
                    Expanded(
                      child: Text(
                        "${nouvelIndex ?? 0}",
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 34,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF22C55E),
                          letterSpacing: 2,
                        ),
                      ),
                    ),
                    const Icon(Iconsax.tick_circle, color: Color(0xFF22C55E), size: 34),
                  ],
                )
              : TextField(
                  controller: indexController,
                  keyboardType: TextInputType.number,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 30,
                    fontWeight: FontWeight.w900,
                    color: text,
                    letterSpacing: 2,
                  ),
                  decoration: InputDecoration(
                    hintText: "00000",
                    hintStyle: GoogleFonts.jetBrainsMono(
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: subText.withOpacity(0.4),
                      letterSpacing: 2,
                    ),
                    prefixIcon: Icon(Iconsax.edit_2, color: subText),
                    filled: true,
                    fillColor: isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.03),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide(color: primary, width: 1.4),
                    ),
                  ),
                ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Iconsax.info_circle, size: 16, color: subText),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  "L’index doit être ≥ ${widget.indexActuel}",
                  style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500, color: subText),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniCard(String label, String value, IconData icon) {
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
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: primary, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: h2, maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w800, color: text),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bottomAction() {
    final bool disabled = loading || saved;

    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
        decoration: BoxDecoration(
          color: surface,
          border: Border(top: BorderSide(color: border)),
        ),
        child: SizedBox(
          height: 54,
          child: ElevatedButton.icon(
            onPressed: disabled ? null : _saveReleve,
            style: ElevatedButton.styleFrom(
              backgroundColor: disabled ? (isDarkMode ? Colors.white10 : Colors.black12) : primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            icon: loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Icon(saved ? Iconsax.tick_circle : Iconsax.send_2, size: 18),
            label: Text(
              saved ? "Relevé enregistré" : "Valider le relevé",
              style: GoogleFonts.poppins(fontWeight: FontWeight.w800),
            ),
          ),
        ),
      ),
    );
  }
}
