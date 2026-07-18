"""
BuildWise AI — Stage 7: Confidence Engine
============================================
Wraps every prediction in structured confidence metadata.
Aggregates per-source confidence scores and flags low-confidence rooms
for user review.
"""

from typing import List, Dict, Any


class ConfidenceEngine:
    """Confidence scoring and low-confidence flagging system."""

    # Threshold below which rooms are flagged for user review
    LOW_CONFIDENCE_THRESHOLD = 0.80
    # Threshold below which rooms get a warning flag
    WARNING_THRESHOLD = 0.60

    @staticmethod
    def evaluate(
        classified_rooms: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Evaluate confidence scores across all rooms and generate
        a summary report with flagged items.

        Args:
            classified_rooms: Rooms with classification data from RoomClassifier.

        Returns:
            Dict with confidence_summary, flagged_rooms, and statistics.
        """
        flagged_rooms = []
        confidence_scores = []
        room_summaries = []

        for room in classified_rooms:
            classification = room.get("classification", {})
            confidence = classification.get("confidence", {})
            overall = confidence.get("overall", 0)
            room_id = room.get("id", "unknown")
            label = room.get("label", classification.get("classified_label", "Unknown"))

            confidence_scores.append(overall)

            # Determine flag level
            flag_level = "none"
            if overall < ConfidenceEngine.WARNING_THRESHOLD:
                flag_level = "critical"
            elif overall < ConfidenceEngine.LOW_CONFIDENCE_THRESHOLD:
                flag_level = "review"

            summary = {
                "room_id": room_id,
                "label": label,
                "overall_confidence": round(overall, 3),
                "flag_level": flag_level,
                "ocr_confidence": ConfidenceEngine._extract_score(confidence, "ocr"),
                "furniture_confidence": ConfidenceEngine._extract_score(confidence, "furniture"),
                "geometry_confidence": ConfidenceEngine._extract_score(confidence, "geometry"),
                "adjacency_confidence": ConfidenceEngine._extract_score(confidence, "adjacency"),
                "reason": classification.get("reason", ""),
                "low_confidence_flag": classification.get("low_confidence_flag", False),
            }

            room_summaries.append(summary)

            if flag_level in ("review", "critical"):
                flagged_rooms.append({
                    "room_id": room_id,
                    "current_label": label,
                    "confidence": round(overall, 3),
                    "flag_level": flag_level,
                    "reason": classification.get("reason", ""),
                    "suggestion": ConfidenceEngine._get_suggestion(
                        label, overall, classification
                    ),
                    "alternative_labels": ConfidenceEngine._get_alternatives(classification),
                })

        # Calculate aggregate statistics
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
        min_confidence = min(confidence_scores) if confidence_scores else 0
        max_confidence = max(confidence_scores) if confidence_scores else 0

        high_confidence_count = sum(1 for s in confidence_scores if s >= 0.85)
        medium_confidence_count = sum(1 for s in confidence_scores if 0.65 <= s < 0.85)
        low_confidence_count = sum(1 for s in confidence_scores if s < 0.65)

        return {
            "room_confidences": room_summaries,
            "flagged_rooms": flagged_rooms,
            "statistics": {
                "total_rooms": len(classified_rooms),
                "average_confidence": round(avg_confidence, 3),
                "min_confidence": round(min_confidence, 3),
                "max_confidence": round(max_confidence, 3),
                "high_confidence_count": high_confidence_count,
                "medium_confidence_count": medium_confidence_count,
                "low_confidence_count": low_confidence_count,
                "flagged_for_review": len(flagged_rooms),
            },
            "needs_user_review": len(flagged_rooms) > 0,
        }

    @staticmethod
    def _extract_score(confidence: Dict[str, Any], key: str) -> float:
        """Extract a numeric score from a confidence entry."""
        entry = confidence.get(key, {})
        if isinstance(entry, dict):
            return round(entry.get("value", 0), 3)
        return round(float(entry), 3) if entry else 0.0

    @staticmethod
    def _get_suggestion(
        label: str, confidence: float, classification: Dict[str, Any]
    ) -> str:
        """Generate a suggestion for the user based on confidence analysis."""
        if confidence < 0.4:
            return f"Very low confidence. Please verify if this is actually a '{label}' or select the correct room type."
        elif confidence < 0.65:
            alternatives = classification.get("all_candidates", {})
            if len(alternatives) > 1:
                alt_labels = [k for k in alternatives if k != label]
                if alt_labels:
                    return f"Could also be: {', '.join(alt_labels[:3])}. Please verify."
            return f"Moderate confidence. Please verify if '{label}' is correct."
        else:
            return f"Slightly below threshold. Confirm if '{label}' is accurate."

    @staticmethod
    def _get_alternatives(classification: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get alternative classification candidates."""
        all_candidates = classification.get("all_candidates", {})
        current_label = classification.get("classified_label", "")

        alternatives = []
        for label, score in sorted(all_candidates.items(), key=lambda x: -x[1]):
            if label != current_label:
                alternatives.append({
                    "label": label,
                    "score": round(score, 3),
                })

        return alternatives[:5]  # Top 5 alternatives
