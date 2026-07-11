import cv2
import numpy as np

class DrawingDetector:
    @staticmethod
    def preprocess_drawing(image_path: str) -> np.ndarray:
        # Load grayscale
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError(f"Could not load image at path: {image_path}")
            
        # Bilateral filter to denoise while preserving edges
        denoised = cv2.bilateralFilter(img, 9, 75, 75)
        
        # Adaptive thresholding to handle scanning variations
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        return thresh

    @staticmethod
    def detect_walls_and_lines(preprocessed_img: np.ndarray) -> dict:
        # Hough Lines Transform to find grid walls
        lines = cv2.HoughLinesP(
            preprocessed_img, 1, np.pi/180, 
            threshold=80, minLineLength=100, maxLineGap=10
        )
        
        walls_detected = []
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                length = float(np.sqrt((x2 - x1)**2 + (y2 - y1)**2))
                walls_detected.append({
                    "start": [int(x1), int(y1)],
                    "end": [int(x2), int(y2)],
                    "length_px": length
                })
        
        return {
            "total_lines_found": len(walls_detected),
            "lines": walls_detected[:50] # Limit response overhead
        }
