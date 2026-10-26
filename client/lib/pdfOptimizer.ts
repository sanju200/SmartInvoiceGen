/**
 * PDF Optimization utilities for reducing file size while maintaining quality
 */

export interface OptimizationSettings {
  maxFileSizeMB: number;
  targetQuality: number;
  minQuality: number;
  scaleReduction: number;
  maxRetries: number;
}

export const DEFAULT_OPTIMIZATION_SETTINGS: OptimizationSettings = {
  maxFileSizeMB: 1,
  targetQuality: 0.85,
  minQuality: 0.6,
  scaleReduction: 0.8,
  maxRetries: 3
};

/**
 * Calculates optimal canvas dimensions to reduce memory usage and file size
 */
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxDimension: number = 2480 // Optimal for A4 at 300 DPI
): { width: number; height: number; scale: number } {
  const aspectRatio = originalWidth / originalHeight;
  
  if (originalWidth <= maxDimension && originalHeight <= maxDimension) {
    return { width: originalWidth, height: originalHeight, scale: 1 };
  }
  
  let newWidth: number;
  let newHeight: number;
  
  if (originalWidth > originalHeight) {
    newWidth = maxDimension;
    newHeight = maxDimension / aspectRatio;
  } else {
    newHeight = maxDimension;
    newWidth = maxDimension * aspectRatio;
  }
  
  const scale = Math.min(newWidth / originalWidth, newHeight / originalHeight);
  
  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
    scale
  };
}

/**
 * Compresses canvas data by reducing colors and applying dithering
 */
export function compressCanvasData(canvas: HTMLCanvasElement, quality: number): string {
  // For very high quality requirements, use PNG with reduced colors
  if (quality > 0.9) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Apply slight blur to reduce noise and improve compression
      ctx.filter = 'blur(0.5px)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }
    return canvas.toDataURL('image/png');
  }
  
  // For normal quality, use JPEG with optimized settings
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Estimates final PDF size based on canvas dimensions and quality
 */
export function estimatePDFSize(
  canvasWidth: number,
  canvasHeight: number,
  quality: number,
  pageCount: number = 1
): number {
  // Rough estimation based on typical compression ratios
  const pixelCount = canvasWidth * canvasHeight;
  const baseSize = pixelCount * 3; // RGB bytes
  
  let compressionRatio: number;
  if (quality > 0.9) {
    compressionRatio = 0.3; // PNG-like compression
  } else if (quality > 0.8) {
    compressionRatio = 0.15;
  } else if (quality > 0.7) {
    compressionRatio = 0.1;
  } else {
    compressionRatio = 0.08;
  }
  
  const estimatedSize = (baseSize * compressionRatio * pageCount) + (50 * 1024); // Add PDF overhead
  return estimatedSize / (1024 * 1024); // Convert to MB
}

/**
 * Optimizes image data for PDF inclusion
 */
export function optimizeImageForPDF(
  canvas: HTMLCanvasElement,
  targetSizeMB: number,
  currentQuality: number
): { dataUrl: string; quality: number; estimatedSizeMB: number } {
  const estimatedSize = estimatePDFSize(canvas.width, canvas.height, currentQuality);
  
  if (estimatedSize <= targetSizeMB) {
    return {
      dataUrl: compressCanvasData(canvas, currentQuality),
      quality: currentQuality,
      estimatedSizeMB: estimatedSize
    };
  }
  
  // Calculate required quality reduction
  const reductionFactor = targetSizeMB / estimatedSize;
  const newQuality = Math.max(0.6, currentQuality * Math.sqrt(reductionFactor));
  
  return {
    dataUrl: compressCanvasData(canvas, newQuality),
    quality: newQuality,
    estimatedSizeMB: estimatePDFSize(canvas.width, canvas.height, newQuality)
  };
}

/**
 * Validates and provides feedback on PDF generation settings
 */
export function validatePDFSettings(
  elementWidth: number,
  elementHeight: number,
  scale: number,
  quality: number,
  maxSizeMB: number
): { isValid: boolean; warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  const finalWidth = elementWidth * scale;
  const finalHeight = elementHeight * scale;
  const estimatedSize = estimatePDFSize(finalWidth, finalHeight, quality);
  
  if (estimatedSize > maxSizeMB) {
    warnings.push(`Estimated PDF size (${estimatedSize.toFixed(2)}MB) exceeds limit (${maxSizeMB}MB)`);
    
    if (scale > 2) {
      suggestions.push('Consider reducing scale to 2 or lower');
    }
    if (quality > 0.8) {
      suggestions.push('Consider reducing quality to 0.8 or lower');
    }
  }
  
  if (finalWidth > 3508 || finalHeight > 4961) { // A4 at 300 DPI
    warnings.push('Canvas dimensions are very large, may cause memory issues');
    suggestions.push('Consider reducing scale factor');
  }
  
  if (quality < 0.6) {
    warnings.push('Quality setting is very low, may result in poor text readability');
  }
  
  return {
    isValid: estimatedSize <= maxSizeMB && quality >= 0.6,
    warnings,
    suggestions
  };
}
