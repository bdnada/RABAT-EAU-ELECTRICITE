import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:iconsax/iconsax.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/adresse.dart';
import '../services/api_service.dart';

class RelevesTraiteesScreen extends StatefulWidget {
  const RelevesTraiteesScreen({super.key});

  @override
  State<RelevesTraiteesScreen> createState() => _RelevesTraiteesScreenState();
}

class _RelevesTraiteesScreenState extends State<RelevesTraiteesScreen> {
  final ApiService apiService = ApiService();
  List<Adresse> adressesTraitees = [];
  bool loading = true;
  String? errorMessage;

  bool isDarkMode = false;

  // ===== THEME (comme TourneeScreen) =====
  Color get _primary => isDarkMode ? const Color(0xFF93C5FD) : const Color(0xFF2563EB);
  Color get _bg => isDarkMode ? const Color(0xFF0B1220) : const Color(0xFFF6F7FB);
  Color get _surface => isDarkMode ? const Color(0xFF0F172A) : Colors.white;
  Color get _border => isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);
  Color get _text => isDarkMode ? Colors.white : const Color(0xFF0F172A);
  Color get _subText => isDarkMode ? Colors.white70 : const Color(0xFF64748B);

  TextStyle get _titleStyle => GoogleFonts.poppins(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: _text,
      );

  TextStyle get _subStyle => GoogleFonts.poppins(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: _subText,
      );

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await _loadTheme();
    await _loadRelevesTraitees();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() => isDarkMode = prefs.getBool('dark_mode') ?? false);
  }

  Future<void> _loadRelevesTraitees() async {
    setState(() {
      loading = true;
      errorMessage = null;
    });

    try {
      final data = await apiService.getTourneeTraitees();

      // Si tu veux calculer les compteurs restants, fais-le ici
      for (final adresse in data) {
        adresse.nbCompteursRestants = 0; // garde ton calcul si tu veux
      }

      if (!mounted) return;
      setState(() {
        adressesTraitees = data;
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

  Future<void> _refreshAll() async {
    // ✅ pour refléter instantanément le mode sombre si l’utilisateur l’a changé ailleurs
    await _loadTheme();
    await _loadRelevesTraitees();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: _buildAppBar(),
      body: RefreshIndicator(
        onRefresh: _refreshAll,
        child: _buildBody(),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return AppBar(
      elevation: 0.6,
      backgroundColor: _surface,
      surfaceTintColor: _surface,
      iconTheme: IconThemeData(color: _text),
      titleSpacing: 16,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Relevés traités",
            style: GoogleFonts.poppins(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: _text,
            ),
          ),
          Text("Liste des adresses déjà traitées", style: _subStyle),
        ],
      ),
      actions: [
        IconButton(
          tooltip: "Actualiser",
          onPressed: _refreshAll,
          icon: Icon(Iconsax.refresh, color: _text),
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildBody() {
    if (loading) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _skeletonCard(),
          const SizedBox(height: 10),
          _skeletonCard(),
          const SizedBox(height: 10),
          _skeletonCard(),
        ],
      );
    }

    if (errorMessage != null) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _stateCard(
            icon: Iconsax.danger,
            title: "Erreur de chargement",
            subtitle: "Vérifie ta connexion ou réessaie.",
            actionLabel: "Réessayer",
            onAction: _refreshAll,
            tint: const Color(0xFFEF4444),
          ),
          const SizedBox(height: 12),
          Text(
            errorMessage!,
            style: GoogleFonts.poppins(fontSize: 12, color: _subText),
          ),
        ],
      );
    }

    if (adressesTraitees.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          _stateCard(
            icon: Iconsax.document_text,
            title: "Aucun relevé traité",
            subtitle: "Aucune adresse n’a été traitée pour le moment.",
            actionLabel: "Actualiser",
            onAction: _refreshAll,
            tint: _primary,
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
      itemCount: adressesTraitees.length,
      itemBuilder: (context, index) {
        final a = adressesTraitees[index];
        return _proAdresseCard(a);
      },
    );
  }

  Widget _proAdresseCard(Adresse a) {
    final restants = a.nbCompteursRestants;

    final badgeColor =
        restants > 0 ? const Color(0xFFF59E0B) : const Color(0xFF22C55E);
    final badgeText = restants > 0 ? "$restants restants" : "Complet";

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDarkMode ? 0.12 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        leading: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: _primary.withOpacity(0.12),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Icon(Iconsax.tick_circle, color: _primary, size: 22),
        ),
        title: Text(
          a.adresseComplete,
          style: _titleStyle,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Row(
            children: [
              Icon(Iconsax.location, size: 14, color: _subText),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  a.quartier.isEmpty ? "Quartier: —" : "Quartier: ${a.quartier}",
                  style: _subStyle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: badgeColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: badgeColor.withOpacity(0.25)),
          ),
          child: Text(
            badgeText,
            style: GoogleFonts.poppins(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: badgeColor,
            ),
          ),
        ),
      ),
    );
  }

  // ===== Components =====

  Widget _stateCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required String actionLabel,
    required VoidCallback onAction,
    required Color tint,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDarkMode ? 0.12 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: tint.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: tint, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.poppins(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: _text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(subtitle, style: _subStyle),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: tint,
                      side: BorderSide(color: tint.withOpacity(0.6)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                    onPressed: onAction,
                    icon: const Icon(Iconsax.refresh, size: 18),
                    label: Text(
                      actionLabel,
                      style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _skeletonCard() {
    final sk = isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);

    return Container(
      height: 84,
      decoration: BoxDecoration(
        color: _surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _border),
      ),
      child: Row(
        children: [
          const SizedBox(width: 14),
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: sk,
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  height: 12,
                  width: double.infinity,
                  margin: const EdgeInsets.only(right: 70),
                  decoration: BoxDecoration(
                    color: sk,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(height: 10),
                Container(
                  height: 10,
                  width: double.infinity,
                  margin: const EdgeInsets.only(right: 140),
                  decoration: BoxDecoration(
                    color: sk,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
        ],
      ),
    );
  }
}
