import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';

class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key});

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen>
    with SingleTickerProviderStateMixin {
  final List<_ChatMessage> _messages = [
    const _ChatMessage(
      text: "What would the total concrete cost be if I switched the concrete mix from M20 to M25?",
      isMe: true,
      time: '10:42 AM',
    ),
    const _ChatMessage(
      text: "ai_response",
      isMe: false,
      time: '10:43 AM',
      isAiComplex: true,
    ),
  ];

  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  late AnimationController _aiPulseController;
  late Animation<double> _aiPulseAnimation;

  bool _isThinking = false;

  final List<String> _suggestions = const [
    'Calculate Bricks for Wall B',
    'Show Steel weight breakdown',
    'Reduce mortar cost by 10%',
    'Mix ratio for M30?',
  ];

  @override
  void initState() {
    super.initState();
    _aiPulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
    _aiPulseAnimation =
        Tween<double>(begin: 0.6, end: 1.0).animate(_aiPulseController);
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    _aiPulseController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage([String? text]) {
    final msgText = text ?? _messageController.text.trim();
    if (msgText.isEmpty) return;

    setState(() {
      _messages.add(_ChatMessage(text: msgText, isMe: true, time: _nowTime()));
      _messageController.clear();
      _isThinking = true;
    });

    _scrollToBottom();
    _triggerAiResponse(msgText);
  }

  Future<void> _triggerAiResponse(String query) async {
    await Future.delayed(const Duration(milliseconds: 1200));

    String reply = "I can help with that. Could you clarify the grade of concrete or dimensions?";
    final q = query.toLowerCase();

    if (q.contains("concrete") || q.contains("m20") || q.contains("m25")) {
      reply = "For M20 concrete, the mixing ratio is 1:1.5:3 (Cement:Sand:Aggregate). Average 1 cubic meter of wet concrete translates to roughly 30 bags of cement, 15 cft sand, and 30 cft aggregate when dry expansion factors (1.54×) are applied.";
    } else if (q.contains("steel") || q.contains("rebar")) {
      reply = "Standard civil design suggests allocating 80 kg/m³ for slabs, beams, and columns on average. High-rise structures may require up to 110 kg/m³.";
    } else if (q.contains("brick")) {
      reply = "For a standard 9-inch brick wall, you need approximately 500 standard red clay bricks per cubic meter of brickwork — including 10mm mortar joints.";
    } else if (q.contains("mortar")) {
      reply = "Mortar volume is calculated using the 1.33× wet-to-dry expansion factor. For a 1:4 ratio, expect approximately 0.3m³ of mortar per m³ of masonry.";
    }

    if (mounted) {
      setState(() {
        _isThinking = false;
        _messages.add(_ChatMessage(text: reply, isMe: false, time: _nowTime()));
      });
      _scrollToBottom();
    }
  }

  String _nowTime() {
    final now = DateTime.now();
    final h = now.hour > 12 ? now.hour - 12 : now.hour;
    final m = now.minute.toString().padLeft(2, '0');
    final ampm = now.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }

  @override
  Widget build(BuildContext context) {
    const bg = Color(0xFF09090B);
    const primary = AppColors.primary;
    const textPrimary = Color(0xFFE5E1E4);
    const textSecondary = Color(0xFFCCC3D8);

    return Scaffold(
      backgroundColor: bg,
      body: Stack(
        children: [
          // Background mesh gradients
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [primary.withOpacity(0.07), Colors.transparent],
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -60,
            left: -60,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [AppColors.secondary.withOpacity(0.04), Colors.transparent],
                ),
              ),
            ),
          ),

          SafeArea(
            child: Column(
              children: [
                // ── Top App Bar ──
                _buildTopBar(textPrimary, primary),

                // ── Chat context header ──
                _buildProjectContext(primary, textPrimary, textSecondary),

                // ── Chat messages ──
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: _messages.length + (_isThinking ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == _messages.length && _isThinking) {
                        return _buildTypingIndicator(primary);
                      }
                      final msg = _messages[index];
                      return msg.isAiComplex
                          ? _buildAiComplexMessage(msg, primary, textPrimary, textSecondary)
                          : _ChatBubble(message: msg, primary: primary, textPrimary: textPrimary, textSecondary: textSecondary);
                    },
                  ),
                ),

                // ── Suggestion chips ──
                _buildSuggestionChips(primary, textSecondary),

                // ── Input Row ──
                _buildInputBar(primary, textSecondary),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar(Color textPrimary, Color primary) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 20),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Color(0x0DFFFFFF))),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.12),
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: const Icon(Icons.person_rounded, size: 18, color: Colors.white),
          ),
          const SizedBox(width: 10),
          Text(
            'BuildWise AI',
            style: AppTypography.titleMedium.copyWith(
              color: AppColors.primary,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const Spacer(),
          AnimatedBuilder(
            animation: _aiPulseAnimation,
            builder: (_, __) => Icon(
              Icons.dark_mode_rounded,
              color: AppColors.primary.withOpacity(_aiPulseAnimation.value * 0.6),
              size: 22,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProjectContext(Color primary, Color textPrimary, Color textSecondary) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: primary.withOpacity(0.2)),
            ),
            child: const Icon(Icons.architecture_rounded, color: AppColors.primary, size: 26),
          ),
          const SizedBox(height: 8),
          Text(
            'South Tower B-12',
            style: AppTypography.titleSmall.copyWith(
              color: textPrimary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Estimation Phase • Structural Concrete',
            style: AppTypography.bodySmall.copyWith(color: textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildAiComplexMessage(
      _ChatMessage msg, Color primary, Color textPrimary, Color textSecondary) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // AI label row
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 14),
              ),
              const SizedBox(width: 8),
              Text(
                'BUILDWISE AI',
                style: AppTypography.labelSmall.copyWith(
                  color: primary,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(width: 8),
              AnimatedBuilder(
                animation: _aiPulseAnimation,
                builder: (_, __) => Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: primary.withOpacity(_aiPulseAnimation.value),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1C1B1D),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(4),
                topRight: Radius.circular(20),
                bottomLeft: Radius.circular(20),
                bottomRight: Radius.circular(20),
              ),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
              boxShadow: [
                BoxShadow(
                  color: primary.withOpacity(0.08),
                  blurRadius: 15,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Switching to M25 shifts the mix ratio to 1:1:2, requiring higher cement content per cubic meter. Based on current site inventory and vendor pricing:',
                    style: AppTypography.bodyMedium.copyWith(color: textPrimary),
                  ),
                  const SizedBox(height: 14),
                  // Mini comparison chart
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0E0E10),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Cost Comparison',
                              style: AppTypography.labelSmall.copyWith(color: textSecondary, letterSpacing: 0.5),
                            ),
                            Text(
                              '+15% Unit Price',
                              style: AppTypography.labelSmall.copyWith(color: primary, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                        Divider(color: Colors.white.withOpacity(0.05), height: 12),
                        _buildCompBar('M20 (Standard)', '\$6,375.00', 0.70, textSecondary, const Color(0xFF958DA1)),
                        const SizedBox(height: 8),
                        _buildCompBar('M25 (Premium)', '\$7,331.00', 0.85, primary, primary),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  RichText(
                    text: TextSpan(
                      style: AppTypography.bodyMedium.copyWith(color: textPrimary),
                      children: [
                        const TextSpan(text: 'This increases the concrete volume cost to '),
                        TextSpan(
                          text: '\$7,331.00',
                          style: TextStyle(color: primary, fontWeight: FontWeight.w700),
                        ),
                        TextSpan(
                          text: ' (+\$956.00 adjustment)',
                          style: TextStyle(color: primary.withOpacity(0.7)),
                        ),
                        const TextSpan(text: '. Would you like me to update the project estimation sheet for Section B?'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 4),
            child: Text(
              msg.time,
              style: AppTypography.labelSmall.copyWith(color: textSecondary.withOpacity(0.5)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompBar(String label, String value, double fraction, Color labelColor, Color barColor) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: AppTypography.labelSmall.copyWith(color: labelColor, fontWeight: labelColor == const Color(0xFF958DA1) ? FontWeight.w400 : FontWeight.w700)),
            Text(value, style: AppTypography.labelSmall.copyWith(color: labelColor, fontWeight: labelColor == const Color(0xFF958DA1) ? FontWeight.w400 : FontWeight.w700)),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: Container(
            height: 6,
            color: Colors.white.withOpacity(0.05),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: fraction,
              child: Container(
                decoration: BoxDecoration(
                  color: barColor,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTypingIndicator(Color primary) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(color: primary, shape: BoxShape.circle),
            child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 14),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF1C1B1D),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: Row(
              children: [
                _ThinkingDot(delay: 0, color: primary),
                const SizedBox(width: 4),
                _ThinkingDot(delay: 150, color: primary),
                const SizedBox(width: 4),
                _ThinkingDot(delay: 300, color: primary),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestionChips(Color primary, Color textSecondary) {
    return Container(
      height: 44,
      margin: const EdgeInsets.only(bottom: 4),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: _suggestions.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          return GestureDetector(
            onTap: () => _sendMessage(_suggestions[index]),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xCC201F22),
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Text(
                _suggestions[index],
                style: AppTypography.labelSmall.copyWith(
                  color: const Color(0xFFE5E1E4),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInputBar(Color primary, Color textSecondary) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: Color(0x0DFFFFFF))),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF1C1B1D),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Row(
                children: [
                  Icon(Icons.attach_file_rounded, color: textSecondary.withOpacity(0.5), size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      style: AppTypography.bodyMedium.copyWith(color: const Color(0xFFE5E1E4)),
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Ask BuildWise about estimates...',
                        hintStyle: AppTypography.bodyMedium.copyWith(
                          color: textSecondary.withOpacity(0.35),
                        ),
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () => _sendMessage(),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: primary,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: primary.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    );
  }
}

// Chat message model
class _ChatMessage {
  final String text;
  final bool isMe;
  final String time;
  final bool isAiComplex;

  const _ChatMessage({
    required this.text,
    required this.isMe,
    required this.time,
    this.isAiComplex = false,
  });
}

// Regular chat bubble
class _ChatBubble extends StatelessWidget {
  final _ChatMessage message;
  final Color primary;
  final Color textPrimary;
  final Color textSecondary;

  const _ChatBubble({
    required this.message,
    required this.primary,
    required this.textPrimary,
    required this.textSecondary,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: message.isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (!message.isMe)
            Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    decoration: BoxDecoration(color: primary, shape: BoxShape.circle),
                    child: const Icon(Icons.bolt_rounded, color: Colors.white, size: 12),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'BUILDWISE AI',
                    style: AppTypography.labelSmall.copyWith(
                      color: primary,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.8,
                    ),
                  ),
                ],
              ),
            ),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.82,
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: message.isMe ? const Color(0xFF2A2A2C) : const Color(0xFF1C1B1D),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(message.isMe ? 18 : 4),
                  bottomRight: Radius.circular(message.isMe ? 4 : 18),
                ),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
                boxShadow: message.isMe
                    ? []
                    : [BoxShadow(color: primary.withOpacity(0.06), blurRadius: 12)],
              ),
              child: Text(
                message.text,
                style: AppTypography.bodyMedium.copyWith(color: textPrimary),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Padding(
            padding: EdgeInsets.only(
              left: message.isMe ? 0 : 4,
              right: message.isMe ? 4 : 0,
            ),
            child: Text(
              message.time,
              style: AppTypography.labelSmall.copyWith(color: textSecondary.withOpacity(0.45)),
            ),
          ),
        ],
      ),
    );
  }
}

// Thinking animation dots
class _ThinkingDot extends StatefulWidget {
  final int delay;
  final Color color;
  const _ThinkingDot({required this.delay, required this.color});

  @override
  State<_ThinkingDot> createState() => _ThinkingDotState();
}

class _ThinkingDotState extends State<_ThinkingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 700),
    );
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _controller.repeat(reverse: true);
    });
    _animation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (_, __) => Container(
        width: 6,
        height: 6,
        decoration: BoxDecoration(
          color: widget.color.withOpacity(_animation.value),
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}
