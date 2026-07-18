"""
BuildWise AI — Stage 6: Room Classifier
=========================================
Multi-evidence room classification combining:
  1. OCR room name labels (40% weight)
  2. Furniture contents (30% weight)
  3. Wall geometry / room shape (15% weight)
  4. Neighbour relationships (15% weight)

If OCR fails, the system infers room type from furniture alone.
"""

from typing import List, Dict, Any, Optional, Tuple


# ── Furniture → Room Type Inference Rules ────────────────────────────────────
FURNITURE_ROOM_RULES = {
    "Bathroom": {
        "required_any": ["toilet", "wash_basin", "shower", "bathtub"],
        "strong_indicators": {"toilet": 0.45, "wash_basin": 0.30, "shower": 0.25},
        "base_confidence": 0.85,
    },
    "Kitchen": {
        "required_any": ["stove", "sink", "refrigerator"],
        "strong_indicators": {"stove": 0.40, "sink": 0.35, "refrigerator": 0.25},
        "base_confidence": 0.85,
    },
    "Bedroom": {
        "required_any": ["bed", "wardrobe"],
        "strong_indicators": {"bed": 0.55, "wardrobe": 0.45},
        "base_confidence": 0.82,
    },
    "Master Bedroom": {
        "required_all": ["bed", "wardrobe"],
        "strong_indicators": {"bed": 0.45, "wardrobe": 0.35},
        "base_confidence": 0.78,
        "area_min_m2": 14.0,
    },
    "Living Room": {
        "required_any": ["sofa", "tv"],
        "strong_indicators": {"sofa": 0.50, "tv": 0.50},
        "base_confidence": 0.80,
        "area_min_m2": 12.0,
    },
    "Dining Room": {
        "required_any": ["dining_table"],
        "strong_indicators": {"dining_table": 0.60, "chair": 0.40},
        "base_confidence": 0.80,
    },
    "Study": {
        "required_any": ["study_desk"],
        "strong_indicators": {"study_desk": 0.70},
        "base_confidence": 0.65,
    },
}

# ── Geometry-Based Classification Heuristics ─────────────────────────────────
GEOMETRY_RULES = {
    "Bathroom": {"area_range_m2": (2.0, 8.0), "aspect_range": (0.5, 2.0)},
    "Toilet": {"area_range_m2": (1.0, 4.0), "aspect_range": (0.4, 2.5)},
    "Kitchen": {"area_range_m2": (5.0, 20.0), "aspect_range": (0.5, 2.5)},
    "Bedroom": {"area_range_m2": (8.0, 25.0), "aspect_range": (0.6, 1.8)},
    "Master Bedroom": {"area_range_m2": (14.0, 35.0), "aspect_range": (0.6, 1.8)},
    "Living Room": {"area_range_m2": (12.0, 45.0), "aspect_range": (0.5, 2.5)},
    "Dining Room": {"area_range_m2": (8.0, 25.0), "aspect_range": (0.5, 2.0)},
    "Balcony": {"area_range_m2": (2.0, 12.0), "aspect_range": (0.2, 5.0)},
    "Passage": {"area_range_m2": (1.5, 10.0), "aspect_range": (0.1, 0.4)},
    "Store Room": {"area_range_m2": (1.5, 8.0), "aspect_range": (0.5, 2.0)},
    "Utility": {"area_range_m2": (1.5, 8.0), "aspect_range": (0.4, 2.5)},
    "Staircase": {"area_range_m2": (3.0, 15.0), "aspect_range": (0.3, 3.0)},
}

# ── Adjacency Rules ──────────────────────────────────────────────────────────
# Rooms are more likely if adjacent to certain other rooms
ADJACENCY_BOOST = {
    "Bathroom": {"Bedroom": 0.10, "Master Bedroom": 0.15},
    "Toilet": {"Bedroom": 0.05, "Living Room": 0.05},
    "Kitchen": {"Dining Room": 0.12, "Utility": 0.08},
    "Dining Room": {"Kitchen": 0.12, "Living Room": 0.10},
    "Balcony": {"Bedroom": 0.08, "Living Room": 0.10, "Master Bedroom": 0.10},
    "Utility": {"Kitchen": 0.10, "Bathroom": 0.05},
}


# ── Evidence Weights ─────────────────────────────────────────────────────────
WEIGHT_OCR = 0.40
WEIGHT_FURNITURE = 0.30
WEIGHT_GEOMETRY = 0.15
WEIGHT_ADJACENCY = 0.15


class RoomClassifier:
    """Multi-evidence room classification engine."""

    @staticmethod
    def classify(
        rooms: List[Dict[str, Any]],
        ocr_mappings: List[Dict[str, Any]],
        room_furniture: Dict[str, List[Dict[str, Any]]],
        adjacency: Dict[str, List[str]],
    ) -> List[Dict[str, Any]]:
        """
        Classify all rooms using multiple evidence sources.

        Args:
            rooms: List of room candidates with geometry data.
            ocr_mappings: OCR room name mappings from OcrReader.
            room_furniture: Furniture items mapped to room IDs.
            adjacency: Room adjacency graph {room_id: [adjacent_room_ids]}.

        Returns:
            List of rooms with classification results and confidence breakdown.
        """
        # Build OCR lookup: room_id → normalized name
        ocr_lookup: Dict[str, Dict[str, Any]] = {}
        for mapping in ocr_mappings:
            room_id = mapping.get("room_id")
            if room_id:
                ocr_lookup[room_id] = mapping

        # First pass: classify each room independently
        classifications = []
        for room in rooms:
            room_id = room.get("id", "")
            classification = RoomClassifier._classify_single_room(
                room=room,
                ocr_data=ocr_lookup.get(room_id),
                furniture=room_furniture.get(room_id, []),
            )
            classifications.append(classification)

        # Second pass: apply adjacency boosts
        # Build label lookup for adjacency
        label_lookup = {c["room_id"]: c["classified_label"] for c in classifications}

        for classification in classifications:
            room_id = classification["room_id"]
            neighbors = adjacency.get(room_id, [])
            neighbor_labels = [label_lookup.get(n, "Unknown") for n in neighbors]

            adjacency_boost = RoomClassifier._compute_adjacency_score(
                classification["classified_label"], neighbor_labels
            )

            # Update confidence with adjacency
            old_overall = classification["confidence"]["overall"]
            adj_contribution = adjacency_boost * WEIGHT_ADJACENCY
            classification["confidence"]["adjacency"] = {
                "value": adjacency_boost,
                "source": f"Adjacent to: {', '.join(neighbor_labels)}" if neighbor_labels else "No adjacent rooms detected",
            }

            # Recalculate overall
            classification["confidence"]["overall"] = min(
                1.0,
                old_overall * (1 - WEIGHT_ADJACENCY) + adj_contribution
            )

        # Third pass: resolve duplicates (e.g., multiple "Living Room")
        classifications = RoomClassifier._resolve_duplicates(classifications)

        # Merge classification data back into rooms
        result = []
        for room, classification in zip(rooms, classifications):
            room_copy = dict(room)
            room_copy["label"] = classification["classified_label"]
            room_copy["classification"] = classification
            result.append(room_copy)

        return result

    @staticmethod
    def _classify_single_room(
        room: Dict[str, Any],
        ocr_data: Optional[Dict[str, Any]],
        furniture: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Classify a single room using OCR, furniture, and geometry."""
        room_id = room.get("id", "")
        area_m2 = room.get("area_m2", 0)
        aspect_ratio = room.get("aspect_ratio", 1.0)

        candidates: Dict[str, Dict[str, float]] = {}

        # ── 1. OCR Evidence ──────────────────────────────────────────────
        ocr_label = None
        ocr_confidence = 0.0
        if ocr_data:
            ocr_label = ocr_data.get("normalized_name")
            ocr_confidence = ocr_data.get("confidence", 0.0)

            if ocr_label:
                if ocr_label not in candidates:
                    candidates[ocr_label] = {"ocr": 0, "furniture": 0, "geometry": 0}
                candidates[ocr_label]["ocr"] = ocr_confidence

        # ── 2. Furniture Evidence ────────────────────────────────────────
        furniture_categories = set()
        furniture_details = []
        for item in furniture:
            cat = item.get("category", item.get("label", ""))
            conf = item.get("confidence", 0.5)
            furniture_categories.add(cat)
            furniture_details.append(f"{cat} ({conf:.0%})")

        for room_type, rules in FURNITURE_ROOM_RULES.items():
            required_any = set(rules.get("required_any", []))
            required_all = set(rules.get("required_all", []))
            indicators = rules.get("strong_indicators", {})

            # Check if any/all required furniture is present
            has_any = bool(required_any & furniture_categories)
            has_all = required_all.issubset(furniture_categories) if required_all else True

            if has_any or (required_all and has_all):
                # Calculate furniture confidence
                furn_conf = rules.get("base_confidence", 0.7)

                # Boost by specific indicator weights
                for cat, weight in indicators.items():
                    if cat in furniture_categories:
                        furn_conf = min(1.0, furn_conf + weight * 0.1)

                # Area check
                area_min = rules.get("area_min_m2", 0)
                if area_m2 > 0 and area_m2 < area_min:
                    furn_conf *= 0.6  # Penalize if room too small

                if room_type not in candidates:
                    candidates[room_type] = {"ocr": 0, "furniture": 0, "geometry": 0}
                candidates[room_type]["furniture"] = max(
                    candidates[room_type]["furniture"], furn_conf
                )

        # ── 3. Geometry Evidence ─────────────────────────────────────────
        if area_m2 > 0:
            for room_type, geo_rules in GEOMETRY_RULES.items():
                area_min, area_max = geo_rules["area_range_m2"]
                ar_min, ar_max = geo_rules["aspect_range"]

                area_score = 0.0
                if area_min <= area_m2 <= area_max:
                    # Score based on how centered the area is in the range
                    mid = (area_min + area_max) / 2
                    range_half = (area_max - area_min) / 2
                    area_score = max(0, 1.0 - abs(area_m2 - mid) / range_half) * 0.7

                ar_score = 0.0
                if ar_min <= aspect_ratio <= ar_max:
                    ar_score = 0.3

                geo_score = area_score + ar_score
                if geo_score > 0.2:
                    if room_type not in candidates:
                        candidates[room_type] = {"ocr": 0, "furniture": 0, "geometry": 0}
                    candidates[room_type]["geometry"] = max(
                        candidates[room_type]["geometry"], geo_score
                    )

        # ── 4. Select Best Candidate ─────────────────────────────────────
        if not candidates:
            # No evidence at all — label as "Room" with low confidence
            if area_m2 > 0 and aspect_ratio < 0.35:
                label = "Passage"
                overall = 0.50
            else:
                label = "Room"
                overall = 0.30

            return {
                "room_id": room_id,
                "classified_label": label,
                "confidence": {
                    "overall": overall,
                    "ocr": {"value": 0, "source": "No OCR text detected"},
                    "furniture": {"value": 0, "source": "No furniture detected"},
                    "geometry": {"value": overall, "source": f"Area={area_m2}m², AR={aspect_ratio:.2f}"},
                },
                "low_confidence_flag": True,
                "reason": "No evidence sources available for classification",
            }

        # Calculate weighted score for each candidate
        scored = {}
        for label, scores in candidates.items():
            weighted = (
                scores["ocr"] * WEIGHT_OCR +
                scores["furniture"] * WEIGHT_FURNITURE +
                scores["geometry"] * WEIGHT_GEOMETRY
            )
            scored[label] = weighted

        # Select best
        best_label = max(scored, key=scored.get)
        best_scores = candidates[best_label]
        overall = scored[best_label]

        # Build confidence breakdown
        ocr_detail = {"value": best_scores["ocr"], "source": "No match"}
        if ocr_data and ocr_label == best_label:
            ocr_detail = {
                "value": best_scores["ocr"],
                "source": f"OCR text '{ocr_data.get('detected_text', '')}' → {ocr_label}",
            }
        elif ocr_data and ocr_label:
            ocr_detail = {
                "value": candidates.get(ocr_label, {}).get("ocr", 0),
                "source": f"OCR suggests '{ocr_label}' but furniture/geometry favors '{best_label}'",
            }

        furniture_detail = {
            "value": best_scores["furniture"],
            "source": f"Detected: {', '.join(furniture_details)}" if furniture_details else "No furniture detected",
        }

        geometry_detail = {
            "value": best_scores["geometry"],
            "source": f"Area={area_m2}m², AR={aspect_ratio:.2f}",
        }

        low_confidence = overall < 0.80

        return {
            "room_id": room_id,
            "classified_label": best_label,
            "confidence": {
                "overall": round(min(1.0, overall), 3),
                "ocr": ocr_detail,
                "furniture": furniture_detail,
                "geometry": geometry_detail,
            },
            "low_confidence_flag": low_confidence,
            "reason": RoomClassifier._build_reason(best_label, best_scores, overall),
            "all_candidates": {k: round(v, 3) for k, v in scored.items()},
        }

    @staticmethod
    def _compute_adjacency_score(
        label: str, neighbor_labels: List[str]
    ) -> float:
        """Compute adjacency confidence boost for a room type."""
        boost_rules = ADJACENCY_BOOST.get(label, {})
        total_boost = 0.0

        for neighbor in neighbor_labels:
            if neighbor in boost_rules:
                total_boost += boost_rules[neighbor]

        return min(1.0, 0.5 + total_boost)

    @staticmethod
    def _build_reason(
        label: str, scores: Dict[str, float], overall: float
    ) -> str:
        """Build human-readable reason string for the classification."""
        sources = []
        if scores["ocr"] > 0:
            sources.append(f"OCR ({scores['ocr']:.0%})")
        if scores["furniture"] > 0:
            sources.append(f"Furniture ({scores['furniture']:.0%})")
        if scores["geometry"] > 0:
            sources.append(f"Geometry ({scores['geometry']:.0%})")

        if not sources:
            return f"Low confidence classification as {label}"

        strength = "High" if overall >= 0.85 else "Medium" if overall >= 0.65 else "Low"
        return f"{strength}-confidence: {' + '.join(sources)}"

    @staticmethod
    def _resolve_duplicates(
        classifications: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Resolve duplicate room labels (e.g., multiple "Living Room").
        Keeps the highest-confidence one as-is; others get numbered.
        """
        label_counts: Dict[str, int] = {}
        label_groups: Dict[str, List[int]] = {}

        for i, c in enumerate(classifications):
            label = c["classified_label"]
            if label not in label_groups:
                label_groups[label] = []
            label_groups[label].append(i)

        for label, indices in label_groups.items():
            if len(indices) <= 1:
                continue

            if label in ("Room", "Passage"):
                # These can be numbered
                for seq, idx in enumerate(indices, 1):
                    classifications[idx]["classified_label"] = f"{label} {seq}"
                continue

            # Sort by confidence, keep best unlabeled
            sorted_indices = sorted(
                indices,
                key=lambda i: classifications[i]["confidence"]["overall"],
                reverse=True,
            )

            # First one keeps original name
            for seq, idx in enumerate(sorted_indices[1:], 2):
                classifications[idx]["classified_label"] = f"{label} {seq}"

        return classifications
