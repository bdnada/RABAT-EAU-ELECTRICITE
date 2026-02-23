import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:iconsax/iconsax.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({Key? key}) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with WidgetsBindingObserver {
  final ApiService api = ApiService();
  final TextEditingController controller = TextEditingController();
  final ScrollController scroll = ScrollController();

  List<Map<String, dynamic>> messages = [];
  File? selectedImage;

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
      GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w800, color: text);
  TextStyle get subStyle =>
      GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: subText);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _init();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    controller.dispose();
    scroll.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _loadThemeOnly();
  }

  Future<void> _init() async {
    await _loadThemeOnly();
    await fetchMessages();
  }

  Future<void> _loadThemeOnly() async {
    final prefs = await SharedPreferences.getInstance();
    final newTheme = prefs.getBool('dark_mode') ?? false;
    if (!mounted) return;
    if (newTheme != isDarkMode) setState(() => isDarkMode = newTheme);
  }

  Future<void> fetchMessages() async {
    try {
      setState(() => loading = true);
      final data = await api.getAgentMessages();
      if (!mounted) return;
      setState(() {
        messages = data;
        loading = false;
      });
      scrollToBottom();
    } catch (_) {
      if (!mounted) return;
      setState(() => loading = false);
    }
  }

  void scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (scroll.hasClients) {
        scroll.animateTo(
          scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ✅ Galerie
  Future<void> pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 60,
      maxWidth: 1280,
      maxHeight: 1280,
    );
    if (picked != null) {
      setState(() => selectedImage = File(picked.path));
    }
  }

  // ✅ Caméra
  Future<void> takePhoto() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.rear,
      imageQuality: 60,
      maxWidth: 1280,
      maxHeight: 1280,
    );
    if (picked != null) {
      setState(() => selectedImage = File(picked.path));
    }
  }

  Future<void> sendMessage() async {
    final textMsg = controller.text.trim();
    if (textMsg.isEmpty && selectedImage == null) return;

    final tempText = textMsg;
    controller.clear();
    final tempImage = selectedImage;

    setState(() => selectedImage = null);

    await api.sendMessageFromAgent(tempText, image: tempImage);
    await fetchMessages();
  }

  void _openImageViewer(Uint8List bytes, String heroTag) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => FullscreenImageViewer(
          imageBytes: bytes,
          heroTag: heroTag,
        ),
      ),
    );
  }

  // ========================= WhatsApp helpers =========================
  DateTime? _parseAnyDate(dynamic v) {
    if (v == null) return null;

    if (v is int) {
      if (v < 10000000000) return DateTime.fromMillisecondsSinceEpoch(v * 1000);
      return DateTime.fromMillisecondsSinceEpoch(v);
    }

    if (v is String) {
      final s = v.trim();
      if (s.isEmpty) return null;

      final iso = DateTime.tryParse(s);
      if (iso != null) return iso;

      final fixed = s.replaceFirst(' ', 'T');
      return DateTime.tryParse(fixed);
    }

    return null;
  }

  DateTime? _getMsgDate(Map<String, dynamic> msg) {
    return _parseAnyDate(msg['createdAt']) ??
        _parseAnyDate(msg['dateEnvoi']) ??
        _parseAnyDate(msg['sentAt']) ??
        _parseAnyDate(msg['timestamp']) ??
        _parseAnyDate(msg['date']) ??
        _parseAnyDate(msg['time']);
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return "";
    final hh = dt.hour.toString().padLeft(2, '0');
    final mm = dt.minute.toString().padLeft(2, '0');
    return "$hh:$mm";
  }

  bool _isRead(Map<String, dynamic> msg) {
    final v = msg['lu'] ?? msg['read'] ?? msg['seen'] ?? msg['isRead'] ?? msg['isSeen'];
    if (v is bool) return v;
    if (v is int) return v == 1;
    if (v is String) {
      final s = v.toLowerCase();
      return s == "true" || s == "1" || s == "yes";
    }
    final dl = msg['dateLecture'] ?? msg['readAt'] ?? msg['seenAt'];
    return _parseAnyDate(dl) != null;
  }

  bool _isDelivered(Map<String, dynamic> msg) {
    final v = msg['delivered'] ?? msg['received'] ?? msg['isDelivered'] ?? msg['isReceived'];
    if (v is bool) return v;
    if (v is int) return v == 1;
    if (v is String) {
      final s = v.toLowerCase();
      return s == "true" || s == "1" || s == "yes";
    }
    return true; // fallback
  }

  Widget _msgMetaRow(Map<String, dynamic> msg, bool isAgent) {
    final dt = _getMsgDate(msg);
    final time = _formatTime(dt);

    final delivered = _isDelivered(msg);
    final read = _isRead(msg);

    // WhatsApp-like : ✓✓ gris / ✓✓ bleu
    final checkColor = read ? const Color(0xFF22C5FF) : (isAgent ? Colors.white70 : subText);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (time.isNotEmpty)
          Text(
            time,
            style: GoogleFonts.poppins(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: isAgent ? Colors.white70 : subText,
            ),
          ),
        const SizedBox(width: 6),

        if (isAgent) ...[
          Icon(
            delivered ? Icons.done_all : Icons.done,
            size: 16,
            color: checkColor,
          ),
        ],
      ],
    );
  }

  // ========================= UI =========================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bg,
      appBar: _buildAppBar(),
      body: Column(
        children: [
          Expanded(
            child: loading
                ? ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _skeletonBubble(isMine: false),
                      const SizedBox(height: 10),
                      _skeletonBubble(isMine: true),
                      const SizedBox(height: 10),
                      _skeletonBubble(isMine: false),
                      const SizedBox(height: 10),
                      _skeletonBubble(isMine: true),
                    ],
                  )
                : RefreshIndicator(
                    onRefresh: () async {
                      await _loadThemeOnly();
                      await fetchMessages();
                    },
                    child: ListView.builder(
                      controller: scroll,
                      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                      itemCount: messages.length,
                      itemBuilder: (_, i) => _messageBubble(messages[i]),
                    ),
                  ),
          ),
          _inputArea(),
        ],
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
      title: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: primary.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: primary.withOpacity(0.15)),
            ),
            child: Icon(Iconsax.message, color: primary, size: 18),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Support Client", style: titleStyle),
              ],
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          tooltip: "Actualiser",
          onPressed: fetchMessages,
          icon: Icon(Iconsax.refresh, color: text),
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  Widget _messageBubble(Map<String, dynamic> msg) {
    final isAgent = msg['sender'] == 'AGENT';
    final hasImage = msg['imageBase64'] != null && msg['imageBase64'].toString().isNotEmpty;
    final content = (msg['contenu'] ?? "").toString();

    final bubbleColor = isAgent ? primary : surface;
    final bubbleTextColor = isAgent ? Colors.white : text;

    return Align(
      alignment: isAgent ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        decoration: BoxDecoration(
          color: bubbleColor,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(18),
            topRight: const Radius.circular(18),
            bottomLeft: Radius.circular(isAgent ? 18 : 6),
            bottomRight: Radius.circular(isAgent ? 6 : 18),
          ),
          border: Border.all(color: isAgent ? Colors.transparent : border),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(isDarkMode ? 0.18 : 0.05),
              blurRadius: 14,
              offset: const Offset(0, 10),
            )
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (hasImage)
                Builder(builder: (_) {
                  final bytes = base64Decode(msg['imageBase64']);
                  final heroTag = "chat_img_${msg['id'] ?? bytes.hashCode}";
                  return GestureDetector(
                    onTap: () => _openImageViewer(bytes, heroTag),
                    child: AspectRatio(
                      aspectRatio: 4 / 3,
                      child: Hero(
                        tag: heroTag,
                        child: Image.memory(
                          bytes,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  );
                }),

              if (content.isNotEmpty)
                Padding(
                  padding: EdgeInsets.fromLTRB(12, hasImage ? 10 : 12, 12, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          content,
                          style: GoogleFonts.poppins(
                            color: bubbleTextColor,
                            fontSize: 13.5,
                            fontWeight: FontWeight.w500,
                            height: 1.35,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      _msgMetaRow(msg, isAgent),
                    ],
                  ),
                ),

              // si pas de texte mais image => affiche meta en bas
              if (content.isEmpty && hasImage)
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
                  child: Align(
                    alignment: Alignment.centerRight,
                    child: _msgMetaRow(msg, isAgent),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _inputArea() {
    return Container(
      decoration: BoxDecoration(
        color: surface,
        border: Border(top: BorderSide(color: border)),
      ),
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            if (selectedImage != null) _imagePreview(),
            Row(
              children: [
                _iconAction(
                  icon: Iconsax.gallery,
                  tooltip: "Galerie",
                  onTap: pickImage,
                ),
                const SizedBox(width: 8),
                _iconAction(
                  icon: Iconsax.camera,
                  tooltip: "Caméra",
                  onTap: takePhoto,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDarkMode ? Colors.white10 : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: border),
                    ),
                    child: TextField(
                      controller: controller,
                      style: GoogleFonts.poppins(
                        color: text,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                      decoration: InputDecoration(
                        hintText: "Écrire un message…",
                        hintStyle: GoogleFonts.poppins(
                          color: subText,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                      minLines: 1,
                      maxLines: 4,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: sendMessage,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: primary,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: primary.withOpacity(0.25),
                          blurRadius: 14,
                          offset: const Offset(0, 8),
                        )
                      ],
                    ),
                    child: const Icon(Iconsax.send_2, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _iconAction({required IconData icon, required String tooltip, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        width: 42,
        height: 42,
        decoration: BoxDecoration(
          color: primary.withOpacity(0.10),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: primary.withOpacity(0.15)),
        ),
        child: Tooltip(
          message: tooltip,
          child: Icon(icon, color: primary, size: 20),
        ),
      ),
    );
  }

  Widget _imagePreview() {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.white10 : const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: border),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.file(
              selectedImage!,
              width: 66,
              height: 66,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              "Image sélectionnée",
              style: GoogleFonts.poppins(fontWeight: FontWeight.w700, color: text, fontSize: 13),
            ),
          ),
          IconButton(
            onPressed: () => setState(() => selectedImage = null),
            icon: const Icon(Iconsax.close_circle, color: Color(0xFFEF4444)),
          ),
        ],
      ),
    );
  }

  Widget _skeletonBubble({required bool isMine}) {
    final sk = isDarkMode ? Colors.white10 : Colors.black.withOpacity(0.06);
    return Align(
      alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        height: 48,
        width: MediaQuery.of(context).size.width * 0.55,
        decoration: BoxDecoration(
          color: surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: border),
        ),
        child: Container(
          margin: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: sk, borderRadius: BorderRadius.circular(999)),
        ),
      ),
    );
  }
}

class FullscreenImageViewer extends StatelessWidget {
  final Uint8List imageBytes;
  final String heroTag;

  const FullscreenImageViewer({
    Key? key,
    required this.imageBytes,
    required this.heroTag,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.8,
          maxScale: 5.0,
          child: Hero(
            tag: heroTag,
            child: Image.memory(
              imageBytes,
              fit: BoxFit.contain,
            ),
          ),
        ),
      ),
    );
  }
}
