import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:iconsax/iconsax.dart';

import '../services/api_service.dart';
import 'releve_screen.dart';

class CompteursScreen extends StatefulWidget {
  final int adresseId;
  final String adresseNom;

  const CompteursScreen({
    Key? key,
    required this.adresseId,
    required this.adresseNom,
  }) : super(key: key);

  @override
  State<CompteursScreen> createState() => _CompteursScreenState();
}

class _CompteursScreenState extends State<CompteursScreen> {
  final ApiService apiService = ApiService();

  List<dynamic> compteurs = [];
  Map<int, int?> savedIndexes = {};
  bool loading = true;

  bool isDarkMode = false;

  // ===== THEME (comme TourneeScreen) =====
  Color get primary => isDarkMode ? const Color(0xFF93C5FD) : const Color(0xFF2563EB);
  Color get bg => isDarkMode ? const Color(0xFF0B1220) : const Color(0xFFF6F7FB);
  Color get surface => isDarkMode ? const Color(0xFF0F172A) : Colors.white;
  Color get border => isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);
  Color get text => isDarkMode ? Colors.white : const Color(0xFF0F172A);
  Color get subText => isDarkMode ? Colors.white70 : const Color(0xFF64748B);

  TextStyle get titleStyle =>
      GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w800, color: text);
  TextStyle get subStyle =>
      GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500, color: subText);

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await _loadTheme();
    await _loadCompteurs();
  }

  Future<void> _loadTheme() async {
    final prefs = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() => isDarkMode = prefs.getBool('dark_mode') ?? false);
  }

  Future<void> _loadCompteurs() async {
    try {
      final data = await apiService.getCompteurs(widget.adresseId);
      final prefs = await SharedPreferences.getInstance();

      final Map<int, int?> localCache = {};
      for (final c in data) {
        localCache[c['id']] = prefs.getInt('saved_index_${c['id']}');
      }

      if (!mounted) return;
      setState(() {
        compteurs = data;
        savedIndexes = localCache;
        loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => loading = false);
    }
  }

  Future<void> _refreshAll() async {
    // ✅ pour appliquer le dark mode si changé ailleurs
    await _loadTheme();
    await _loadCompteurs();
  }

  @override
  Widget build(BuildContext context) {
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
                  _skeletonCard(),
                  const SizedBox(height: 10),
                  _skeletonCard(),
                  const SizedBox(height: 10),
                  _skeletonCard(),
                ],
              )
            : compteurs.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      _emptyState(),
                    ],
                  )
                : ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 18),
                    itemCount: compteurs.length,
                    itemBuilder: (context, index) {
                      final c = compteurs[index];
                      return _compteurCard(c);
                    },
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
      titleSpacing: 16,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Compteurs", style: titleStyle),
          Text(widget.adresseNom, style: subStyle, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
      actions: [
        IconButton(
          tooltip: "Actualiser",
          onPressed: _refreshAll,
          icon: Icon(Iconsax.refresh, color: text),
        ),
        const SizedBox(width: 6),
      ],
    );
  }

  Widget _compteurCard(dynamic compteur) {
    final bool isEau = compteur['type'].toString().toUpperCase().contains("EAU");
    final int? indexActuel = compteur['indexActuel'];
    final int? savedIndex = savedIndexes[compteur['id']];
    final String numero = (compteur['numeroCompteur'] ?? "—").toString();

    // ===== Status =====
    String statusLabel = "À faire";
    Color statusColor = subText;
    IconData statusIcon = Iconsax.clock;

    if (indexActuel != null && indexActuel > 0) {
      statusLabel = "Validé";
      statusColor = const Color(0xFF22C55E);
      statusIcon = Iconsax.tick_circle;
    } else if (savedIndex != null) {
      statusLabel = "En attente";
      statusColor = const Color(0xFFF59E0B);
      statusIcon = Iconsax.timer_1;
    }

    final Color typeAccent = isEau ? const Color(0xFF38BDF8) : const Color(0xFFFBBF24);
    final IconData typeIcon = isEau ? Iconsax.drop : Iconsax.flash_1;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDarkMode ? 0.12 : 0.04),
            blurRadius: 16,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ReleveScreen(
                compteurId: compteur['id'],
                numeroCompteur: numero,
                indexActuel: compteur['indexActuel'] ?? 0,
                type: compteur['type'],
              ),
            ),
          );
          _loadCompteurs();
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Row(
            children: [
              Container(
                width: 46,
                height: 46,
                decoration: BoxDecoration(
                  color: typeAccent.withOpacity(0.14),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(typeIcon, color: typeAccent, size: 22),
              ),
              const SizedBox(width: 12),

              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "N° $numero",
                      style: GoogleFonts.poppins(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: text,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Dernier index : ${compteur['indexActuel'] ?? 0}",
                      style: subStyle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 10),

              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: statusColor.withOpacity(0.22)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, size: 14, color: statusColor),
                        const SizedBox(width: 6),
                        Text(
                          statusLabel,
                          style: GoogleFonts.poppins(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: statusColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                  Icon(Iconsax.arrow_right_3, size: 16, color: subText),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _emptyState() {
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
              color: primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(Iconsax.document_text, color: primary, size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              "Aucun compteur trouvé pour cette adresse.",
              style: GoogleFonts.poppins(fontSize: 13, fontWeight: FontWeight.w600, color: text),
            ),
          ),
        ],
      ),
    );
  }

  Widget _skeletonCard() {
    final sk = isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);
    return Container(
      height: 86,
      decoration: BoxDecoration(
        color: surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          const SizedBox(width: 14),
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: sk,
              borderRadius: BorderRadius.circular(16),
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
                  margin: const EdgeInsets.only(right: 80),
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
