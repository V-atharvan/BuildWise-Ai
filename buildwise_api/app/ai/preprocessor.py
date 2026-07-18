"""
BuildWise AI — Stage 1: Image Preprocessor
============================================
Comprehensive OpenCV preprocessing pipeline for architectural floor plans.
Handles image enhancement, noise removal, deskew, thresholding, and
morphological operations to produce a clean binary image for downstream
wall detection and room extraction.

Supports: PNG, JPG, JPEG, PDF (via pdf2image), DXF (via ezdxf rendering).
"""

import cv2
import numpy as np
import math
import os
from typing import Tuple, Dict, Any, Optional


class ImagePreprocessor:
    """Multi-step image preprocessing pipeline for floor plan analysis."""

    # Minimum acceptable DPI for accurate detection
    MIN_DPI = 150
    # Target width for resolution-limited images
    TARGET_WIDTH = 3000

    @staticmethod
    def run(image_path: str) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        """
        Execute the full preprocessing pipeline.

        Args:
            image_path: Path to the input image file.

        Returns:
            Tuple of (binary_image, original_color_image, metadata_dict)
            - binary_image: Cleaned binary (black walls on white) for wall detection
            - original_color_image: Color image for OCR and furniture detection
            - metadata: Preprocessing details (rotation, scale, dimensions, etc.)
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        ext = os.path.splitext(image_path)[1].lower()
        metadata: Dict[str, Any] = {
            "source_path": image_path,
            "source_format": ext,
            "steps_applied": [],
        }

        # ── Step 0: Load image (handle PDF/DXF → raster) ─────────────────
        color_img = ImagePreprocessor._load_image(image_path, ext, metadata)
        if color_img is None:
            raise ValueError(f"Failed to load image: {image_path}")

        metadata["original_width"] = color_img.shape[1]
        metadata["original_height"] = color_img.shape[0]

        # ── Step 1: Resolution enhancement ────────────────────────────────
        color_img = ImagePreprocessor._enhance_resolution(color_img, metadata)

        # ── Step 2: Grayscale conversion ──────────────────────────────────
        gray = cv2.cvtColor(color_img, cv2.COLOR_BGR2GRAY)
        metadata["steps_applied"].append("grayscale_conversion")

        # ── Step 3: Noise removal (bilateral + non-local means) ───────────
        denoised = ImagePreprocessor._remove_noise(gray, metadata)

        # ── Step 4: Contrast enhancement (CLAHE) ─────────────────────────
        enhanced = ImagePreprocessor._enhance_contrast(denoised, metadata)

        # ── Step 5: Deskew / rotation correction ─────────────────────────
        deskewed, color_img = ImagePreprocessor._deskew(enhanced, color_img, metadata)

        # ── Step 6: Adaptive thresholding (dual-pass) ────────────────────
        binary = ImagePreprocessor._adaptive_threshold(deskewed, metadata)

        # ── Step 7: Morphological closing (fill wall gaps) ───────────────
        binary = ImagePreprocessor._morphological_close(binary, metadata)

        # ── Step 8: Morphological opening (remove noise specks) ──────────
        binary = ImagePreprocessor._morphological_open(binary, metadata)

        # ── Step 9: Final cleanup ────────────────────────────────────────
        binary = ImagePreprocessor._final_cleanup(binary, metadata)

        metadata["processed_width"] = binary.shape[1]
        metadata["processed_height"] = binary.shape[0]

        return binary, color_img, metadata

    # ══════════════════════════════════════════════════════════════════════
    # INDIVIDUAL PIPELINE STEPS
    # ══════════════════════════════════════════════════════════════════════

    @staticmethod
    def _load_image(
        image_path: str, ext: str, metadata: Dict[str, Any]
    ) -> Optional[np.ndarray]:
        """Load image from various formats into a BGR numpy array."""

        if ext == ".pdf":
            return ImagePreprocessor._load_pdf(image_path, metadata)
        elif ext in (".dxf",):
            return ImagePreprocessor._load_dxf(image_path, metadata)
        elif ext in (".dwg",):
            # DWG requires ODA converter → DXF → render
            # For now, attempt to load as image (some DWG viewers export as image)
            metadata["steps_applied"].append("dwg_direct_load_attempt")
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(
                    "DWG format requires ODA File Converter to convert to DXF first. "
                    "Please convert the file to DXF or PDF and re-upload."
                )
            return img
        else:
            # Standard image formats (PNG, JPG, JPEG, BMP, TIFF)
            img = cv2.imread(image_path)
            metadata["steps_applied"].append("direct_image_load")
            return img

    @staticmethod
    def _load_pdf(image_path: str, metadata: Dict[str, Any]) -> np.ndarray:
        """Convert first page of PDF to high-res image."""
        try:
            from pdf2image import convert_from_path

            # Render at 300 DPI for high quality
            images = convert_from_path(image_path, dpi=300, first_page=1, last_page=1)
            if not images:
                raise ValueError("PDF conversion returned no pages")

            # Convert PIL Image to OpenCV BGR
            pil_img = images[0]
            rgb = np.array(pil_img)
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            metadata["steps_applied"].append("pdf_to_image_300dpi")
            metadata["pdf_pages_total"] = len(
                convert_from_path(image_path, dpi=72, fmt="jpeg", size=(100, None))
            )
            return bgr
        except ImportError:
            raise ImportError(
                "pdf2image is required for PDF processing. "
                "Install it with: pip install pdf2image"
            )

    @staticmethod
    def _load_dxf(image_path: str, metadata: Dict[str, Any]) -> np.ndarray:
        """Render DXF file to a raster image using ezdxf + matplotlib."""
        try:
            import ezdxf
            from ezdxf.addons.drawing import matplotlib as ezdxf_mpl

            doc = ezdxf.readfile(image_path)
            msp = doc.modelspace()

            # Render to a matplotlib figure, then capture as numpy array
            import matplotlib
            matplotlib.use("Agg")
            import matplotlib.pyplot as plt

            fig = plt.figure(figsize=(30, 20), dpi=150)
            ax = fig.add_axes([0, 0, 1, 1])
            ctx = ezdxf_mpl.RenderContext(doc)
            out = ezdxf_mpl.MatplotlibBackend(ax)
            ezdxf_mpl.Frontend(ctx, out).draw_layout(msp)
            ax.set_aspect("equal")

            fig.canvas.draw()
            buf = fig.canvas.buffer_rgba()
            rgba = np.asarray(buf)
            bgr = cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGR)
            plt.close(fig)

            metadata["steps_applied"].append("dxf_render_to_raster")
            return bgr
        except ImportError:
            raise ImportError(
                "ezdxf and matplotlib are required for DXF processing. "
                "Install with: pip install ezdxf matplotlib"
            )
        except Exception as e:
            raise ValueError(f"Failed to render DXF file: {e}")

    @staticmethod
    def _enhance_resolution(img: np.ndarray, metadata: Dict[str, Any]) -> np.ndarray:
        """Upscale image if resolution is too low for accurate detection."""
        h, w = img.shape[:2]

        if w < ImagePreprocessor.TARGET_WIDTH:
            scale = ImagePreprocessor.TARGET_WIDTH / w
            new_w = int(w * scale)
            new_h = int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            metadata["steps_applied"].append(f"resolution_upscale_{scale:.2f}x")
            metadata["scale_applied"] = scale
        else:
            metadata["scale_applied"] = 1.0

        return img

    @staticmethod
    def _remove_noise(gray: np.ndarray, metadata: Dict[str, Any]) -> np.ndarray:
        """Multi-stage noise removal while preserving wall edges."""
        # Stage 1: Bilateral filter — preserves edges while smoothing
        bilateral = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)

        # Stage 2: Non-local means denoising for remaining noise
        denoised = cv2.fastNlMeansDenoising(bilateral, h=10, templateWindowSize=7, searchWindowSize=21)

        metadata["steps_applied"].append("noise_removal_bilateral_nlm")
        return denoised

    @staticmethod
    def _enhance_contrast(gray: np.ndarray, metadata: Dict[str, Any]) -> np.ndarray:
        """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)."""
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        metadata["steps_applied"].append("clahe_contrast_enhancement")
        return enhanced

    @staticmethod
    def _deskew(
        gray: np.ndarray, color_img: np.ndarray, metadata: Dict[str, Any]
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Detect and correct image skew using Hough line angle analysis."""
        # Detect edges
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)

        # Find lines using Hough transform
        lines = cv2.HoughLinesP(
            edges, 1, np.pi / 180, threshold=100,
            minLineLength=100, maxLineGap=10
        )

        if lines is None or len(lines) < 5:
            metadata["steps_applied"].append("deskew_skipped_insufficient_lines")
            metadata["rotation_angle"] = 0.0
            return gray, color_img

        # Calculate angles of all detected lines
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
            # Normalize to [-45, 45] range (we only care about small skews)
            angle = angle % 90
            if angle > 45:
                angle -= 90
            angles.append(angle)

        if not angles:
            metadata["rotation_angle"] = 0.0
            return gray, color_img

        # Use median angle to avoid outlier influence
        median_angle = float(np.median(angles))

        # Only correct if skew is meaningful but not extreme
        if abs(median_angle) < 0.3 or abs(median_angle) > 15:
            metadata["steps_applied"].append(
                f"deskew_skipped_angle_{median_angle:.2f}"
            )
            metadata["rotation_angle"] = 0.0
            return gray, color_img

        # Rotate both gray and color images
        h, w = gray.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)

        # Calculate new bounding dimensions
        cos_a = abs(M[0, 0])
        sin_a = abs(M[0, 1])
        new_w = int(h * sin_a + w * cos_a)
        new_h = int(h * cos_a + w * sin_a)
        M[0, 2] += (new_w - w) / 2
        M[1, 2] += (new_h - h) / 2

        gray = cv2.warpAffine(
            gray, M, (new_w, new_h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )
        color_img = cv2.warpAffine(
            color_img, M, (new_w, new_h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )

        metadata["steps_applied"].append(f"deskew_rotated_{median_angle:.2f}deg")
        metadata["rotation_angle"] = median_angle
        return gray, color_img

    @staticmethod
    def _adaptive_threshold(
        gray: np.ndarray, metadata: Dict[str, Any]
    ) -> np.ndarray:
        """Dual-pass adaptive thresholding for robust binarization."""
        # Pass 1: Gaussian adaptive threshold
        binary_gaussian = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            blockSize=15,  # Larger block for wall-scale features
            C=4
        )

        # Pass 2: Otsu's method on the enhanced image
        _, binary_otsu = cv2.threshold(
            gray, 0, 255,
            cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU
        )

        # Combine: use intersection (both methods must agree = higher confidence)
        binary = cv2.bitwise_and(binary_gaussian, binary_otsu)

        metadata["steps_applied"].append("dual_adaptive_threshold_gaussian_otsu")
        return binary

    @staticmethod
    def _morphological_close(
        binary: np.ndarray, metadata: Dict[str, Any]
    ) -> np.ndarray:
        """Morphological closing to fill small gaps in wall lines."""
        # Use a rectangular kernel — walls are typically horizontal/vertical
        kernel_h = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 1))
        kernel_v = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 15))

        closed_h = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_h, iterations=1)
        closed_v = cv2.morphologyEx(closed_h, cv2.MORPH_CLOSE, kernel_v, iterations=1)

        # Also apply a small square kernel for diagonal connections
        kernel_sq = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        closed = cv2.morphologyEx(closed_v, cv2.MORPH_CLOSE, kernel_sq, iterations=1)

        metadata["steps_applied"].append("morphological_closing_hv")
        return closed

    @staticmethod
    def _morphological_open(
        binary: np.ndarray, metadata: Dict[str, Any]
    ) -> np.ndarray:
        """Morphological opening to remove small noise specks."""
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        opened = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
        metadata["steps_applied"].append("morphological_opening")
        return opened

    @staticmethod
    def _final_cleanup(binary: np.ndarray, metadata: Dict[str, Any]) -> np.ndarray:
        """Remove very small connected components (noise) from the binary image."""
        # Find connected components
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
            binary, connectivity=8
        )

        # Calculate minimum component area (0.01% of image area)
        img_area = binary.shape[0] * binary.shape[1]
        min_area = max(50, img_area * 0.0001)

        # Create clean image keeping only significant components
        clean = np.zeros_like(binary)
        components_removed = 0
        for i in range(1, num_labels):  # Skip background (label 0)
            area = stats[i, cv2.CC_STAT_AREA]
            if area >= min_area:
                clean[labels == i] = 255
            else:
                components_removed += 1

        metadata["steps_applied"].append(
            f"final_cleanup_removed_{components_removed}_small_components"
        )
        return clean
