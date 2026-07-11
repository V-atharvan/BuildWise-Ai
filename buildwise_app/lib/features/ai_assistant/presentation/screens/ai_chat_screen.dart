import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_dimensions.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/buildwise_card.dart';
import '../../../../core/widgets/buildwise_text_field.dart';
import '../../../../core/widgets/buildwise_button.dart';

class AiChatScreen extends ConsumerStatefulWidget {
  const AiChatScreen({super.key});

  @override
  ConsumerState<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends ConsumerState<AiChatScreen> {
  final List<_ChatMessage> _messages = [
    const _ChatMessage(
      text: "Hello! I'm your BuildWise AI Assistant. Ask me anything about material rates, quantities estimation, concrete mix ratios, or drawing specifications.",
      isMe: false,
    ),
  ];
  
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
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
      _messages.add(_ChatMessage(text: msgText, isMe: true));
      if (text == null) _messageController.clear();
    });
    
    _scrollToBottom();
    _triggerAiResponse(msgText);
  }

  Future<void> _triggerAiResponse(String query) async {
    // Simulated construction AI response logic
    await Future.delayed(const Duration(seconds: 1));
    
    String reply = "I can help with that. Could you clarify the grade of concrete or dimensions?";
    final q = query.toLowerCase();
    
    if (q.contains("concrete") || q.contains("m20") || q.contains("m25")) {
      reply = "For M20 concrete, the mixing ratio is 1:1.5:3 (Cement:Sand:Aggregate). On average, 1 cubic meter of wet concrete translates to roughly 30 bags of cement, 15 cft sand, and 30 cft aggregate when dry expansion factors (1.54) are applied.";
    } else if (q.contains("steel") || q.contains("reinforcement")) {
      reply = "For estimating steel, standard civil design guidelines suggest allocating steel as a volume percentage: Slabs ~1.0%, Beams ~2.0%, Columns ~2.5%, and Footings ~0.8% of concrete volumes.";
    } else if (q.contains("brick")) {
      reply = "For a standard 9-inch brick wall (230mm thickness), you need approximately 500 red clay bricks per cubic meter of brickwork, including 10mm mortar joints.";
    } else if (q.contains("scale")) {
      reply = "If a drawing's scale is 1:100, it means 1 cm on the paper represents 100 cm (or 1 meter) in real-world dimensions. In pixel coordinates, our AI resolves this by calculating density markers.";
    }

    if (mounted) {
      setState(() {
        _messages.add(_ChatMessage(text: reply, isMe: false));
      });
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final suggestions = [
      'Mix ratio for M25 concrete?',
      'How to compute steel weight?',
      'Red bricks count per m³?',
    ];

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('AI Assistant', style: AppTypography.titleMedium.copyWith(fontWeight: FontWeight.bold)),
                Text('Online • Civil Engineer model', style: AppTypography.caption.copyWith(color: AppColors.success)),
              ],
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  return _ChatBubble(message: msg);
                },
              ),
            ),
            
            // Suggestion chips
            if (_messages.length == 1)
              Container(
                height: 48,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: suggestions.length,
                  itemBuilder: (context, index) {
                    final sug = suggestions[index];
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: ActionChip(
                        label: Text(sug),
                        labelStyle: AppTypography.bodySmall.copyWith(color: AppColors.primary),
                        backgroundColor: AppColors.primary.withOpacity(0.05),
                        side: BorderSide(color: AppColors.primary.withOpacity(0.15)),
                        onPressed: () => _sendMessage(sug),
                      ),
                    );
                  },
                ),
              ),

            Padding(
              padding: const EdgeInsets.all(AppDimensions.pagePaddingHorizontal),
              child: Row(
                children: [
                  Expanded(
                    child: BuildWiseTextField(
                      hint: 'Ask about mixing ratios, estimates...',
                      controller: _messageController,
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    icon: const Icon(Icons.send_rounded, color: AppColors.primary),
                    onPressed: () => _sendMessage(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ChatMessage {
  final String text;
  final bool isMe;

  const _ChatMessage({required this.text, required this.isMe});
}

class _ChatBubble extends StatelessWidget {
  final _ChatMessage message;

  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Align(
      alignment: message.isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: message.isMe
              ? AppColors.primary
              : (isDark ? AppColors.darkSurfaceVariant : AppColors.lightSurfaceVariant),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(message.isMe ? 16 : 4),
            bottomRight: Radius.circular(message.isMe ? 4 : 16),
          ),
        ),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        child: Text(
          message.text,
          style: AppTypography.bodyLarge.copyWith(
            color: message.isMe
                ? Colors.white
                : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
          ),
        ),
      ),
    );
  }
}
 postseason:
