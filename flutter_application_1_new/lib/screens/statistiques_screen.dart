import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:iconsax/iconsax.dart';

import '../services/api_service.dart';
import '../models/adresse.dart';

class StatistiquesScreen extends StatefulWidget {
  const StatistiquesScreen({Key? key}) : super(key: key);

  @override
  State<StatistiquesScreen> createState() => _StatistiquesScreenState();
}

class _StatistiquesScreenState extends State<StatistiquesScreen> with WidgetsBindingObserver {
  final ApiService apiService = ApiService();

  int total = 0;
  int valides = 0; // relevés traités
  int restants = 0; // tournée
  int eau = 0;
  int electricite = 0;

  bool loading = true;
  String? errorMessage;
  bool isDarkMode = false;

  // ===== THEME =====
  Color get primary => isDarkMode ? const Color(0xFF93C5FD) : const Color(0xFF2563EB);
  Color get bg => isDarkMode ? const Color(0xFF0B1220) : const Color(0xFFF6F7FB);
  Color get surface => isDarkMode ? const Color(0xFF0F172A) : Colors.white;
  Color get border => isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);
  Color get text => isDarkMode ? Colors.white : const Color(0xFF0F172A);
  Color get subText => isDarkMode ? Colors.white70 : const Color(0xFF64748B);

  TextStyle get h1 => GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w800, color: text);
  TextStyle get h2 => GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500, color: subText);
  TextStyle get kpiValue => GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w800, color: text);
  TextStyle get kpiLabel => GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: subText);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _init();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // ✅ Quand l’app revient au premier plan, on relit le thème
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _loadThemeOnly();
    }
  }

  Future<void> _init() async {
    await _loadThemeOnly();
    await _loadStats();
  }

  // ✅ charge uniquement le thème
  Future<void> _loadThemeOnly() async {
    final prefs = await SharedPreferences.getInstance();
    final newTheme = prefs.getBool('dark_mode') ?? false;

    if (!mounted) return;
    if (newTheme != isDarkMode) {
      setState(() => isDarkMode = newTheme);
    }
  }

  Future<void> _refreshAll() async {
    await _loadThemeOnly();
    await _loadStats();
  }

  // ✅ logique stats (valides = traités, restants = tournée)
  Future<void> _loadStats() async {
    setState(() {
      loading = true;
      errorMessage = null;
    });

    try {
      // 1) tournée = restants
      final tournee = await apiService.getTournee();
      int r = 0;

      for (final adresse in tournee) {
        final compteurs = await apiService.getCompteurs(adresse['id']);
        for (final c in compteurs) {
          final idx = c['indexActuel'];
          final isRestant = (idx == null) || (idx is num && idx <= 0);
          if (isRestant) r++;
        }
      }

      // 2) relevés traités = validés
      final List<Adresse> traitees = await apiService.getTourneeTraitees();
      int v = 0;

      for (final a in traitees) {
        final compteurs = await apiService.getCompteurs(a.id);
        for (final c in compteurs) {
          final idx = c['indexActuel'];
          final isValide = (idx != null) && (idx is num && idx > 0);
          if (isValide) v++;
        }
      }

      // 3) total
      final t = v + r;

      // 4) types (tournee + traitees)
      int e2 = 0;
      int el2 = 0;

      for (final adresse in tournee) {
        final compteurs = await apiService.getCompteurs(adresse['id']);
        for (final c in compteurs) {
          final type = c['type'].toString().toUpperCase();
          if (type.contains('EAU')) e2++;
          if (type.contains('ELECT')) el2++;
        }
      }

      for (final a in traitees) {
        final compteurs = await apiService.getCompteurs(a.id);
        for (final c in compteurs) {
          final type = c['type'].toString().toUpperCase();
          if (type.contains('EAU')) e2++;
          if (type.contains('ELECT')) el2++;
        }
      }

      if (!mounted) return;
      setState(() {
        valides = v;
        restants = r;
        total = t;
        eau = e2;
        electricite = el2;
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        loading = false;
        errorMessage = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final completionRate = total > 0 ? (valides / total) : 0.0;
    final percent = (completionRate * 100).round();

    return Scaffold(
      backgroundColor: bg,
      appBar: _buildAppBar(),
      body: RefreshIndicator(
        onRefresh: _refreshAll,
        child: loading
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  _skeleton(height: 120),
                  const SizedBox(height: 12),
                  _skeleton(height: 92),
                  const SizedBox(height: 12),
                  _skeleton(height: 180),
                ],
              )
            : (errorMessage != null)
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [_errorCard(errorMessage!)],
                  )
                : ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
                    children: [
                      _headerCard(percent),
                      const SizedBox(height: 12),
                      _kpiRow(),
                      const SizedBox(height: 14),
                      Text("Répartition",
                          style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w800, color: text)),
                      const SizedBox(height: 10),
                      _typeCards(),
                      const SizedBox(height: 14),
                      Text("Résumé",
                          style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w800, color: text)),
                      const SizedBox(height: 10),
                      _summaryCard(),
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
          Text("Statistiques", style: h1),
          Text("Relevés traités + tournée", style: h2),
        ],
      ),
      actions: [
        IconButton(
          tooltip: "Actualiser",
          onPressed: _refreshAll,
          icon: Icon(Iconsax.refresh, color: text),
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  Widget _headerCard(int percent) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: primary.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Iconsax.chart_2, color: primary, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Text("Progression", style: GoogleFonts.poppins(fontWeight: FontWeight.w800, color: text)),
                  ],
                ),
                const SizedBox(height: 10),
                Text("$percent%",
                    style: GoogleFonts.poppins(fontSize: 28, fontWeight: FontWeight.w900, color: text)),
                const SizedBox(height: 4),
                Text("$valides validés • $restants restants", style: h2),
              ],
            ),
          ),
          SizedBox(
            height: 84,
            width: 84,
            child: PieChart(
              PieChartData(
                sectionsSpace: 0,
                centerSpaceRadius: 26,
                sections: [
                  PieChartSectionData(value: valides.toDouble(), color: primary, radius: 12, showTitle: false),
                  PieChartSectionData(
                    value: restants.toDouble(),
                    color: isDarkMode ? Colors.white12 : Colors.black12,
                    radius: 12,
                    showTitle: false,
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _kpiRow() {
    return Row(
      children: [
        Expanded(child: _kpiCard(Iconsax.tick_circle, "Validés", valides, const Color(0xFF22C55E))),
        const SizedBox(width: 10),
        Expanded(child: _kpiCard(Iconsax.timer_1, "Restants", restants, const Color(0xFFF59E0B))),
        const SizedBox(width: 10),
        Expanded(child: _kpiCard(Iconsax.category, "Total", total, primary)),
      ],
    );
  }

  Widget _kpiCard(IconData icon, String label, int value, Color accent) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: accent.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: accent, size: 18),
          ),
          const SizedBox(height: 10),
          Text("$value", style: kpiValue),
          Text(label, style: kpiLabel),
        ],
      ),
    );
  }

  Widget _typeCards() {
    return Row(
      children: [
        Expanded(child: _typeCard(Iconsax.drop, "Eau", eau, const Color(0xFF38BDF8))),
        const SizedBox(width: 10),
        Expanded(child: _typeCard(Iconsax.flash_1, "Électricité", electricite, const Color(0xFFFBBF24))),
      ],
    );
  }

  Widget _typeCard(IconData icon, String label, int value, Color accent) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: accent.withOpacity(0.14),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: accent, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("$value", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w900, color: text)),
                Text(label, style: h2),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _summaryCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Column(
        children: [
          _summaryRow(Iconsax.tick_circle, "Compteurs validés", valides, const Color(0xFF22C55E)),
          Divider(color: border, height: 18),
          _summaryRow(Iconsax.timer_1, "Compteurs restants", restants, const Color(0xFFF59E0B)),
          Divider(color: border, height: 18),
          _summaryRow(Iconsax.category, "Total", total, primary, bold: true),
        ],
      ),
    );
  }

  Widget _summaryRow(IconData icon, String label, int value, Color accent, {bool bold = false}) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: accent.withOpacity(0.12),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(icon, color: accent, size: 18),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 13,
              fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
              color: text,
            ),
          ),
        ),
        Text(
          "$value",
          style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w900, color: text),
        ),
      ],
    );
  }

  Widget _errorCard(String message) {
    return Container(
      padding: const EdgeInsets.all(16),
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
              color: const Color(0xFFEF4444).withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Iconsax.danger, color: Color(0xFFEF4444), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text("Erreur: $message",
                style: GoogleFonts.poppins(fontSize: 12, color: subText, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _skeleton({required double height}) {
    final sk = isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Container(
        margin: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: sk,
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    );
  }
}
