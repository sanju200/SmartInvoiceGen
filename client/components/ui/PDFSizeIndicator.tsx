import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { estimatePDFSize, validatePDFSettings } from '../../lib/pdfOptimizer';

interface PDFSizeIndicatorProps {
  elementId: string;
  quality?: number;
  scale?: number;
  maxSizeMB?: number;
  className?: string;
}

export function PDFSizeIndicator({ 
  elementId, 
  quality = 0.85, 
  scale = 2, 
  maxSizeMB = 1,
  className = '' 
}: PDFSizeIndicatorProps) {
  const [estimation, setEstimation] = useState<{
    sizeMB: number;
    isValid: boolean;
    warnings: string[];
    suggestions: string[];
  } | null>(null);

  useEffect(() => {
    const updateEstimation = () => {
      const element = document.getElementById(elementId);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const width = rect.width || element.scrollWidth || element.offsetWidth;
      const height = rect.height || element.scrollHeight || element.offsetHeight;
      
      const pages = element.querySelectorAll('.a4-page').length || 1;
      const sizeMB = estimatePDFSize(width * scale, height * scale, quality, pages);
      
      const validation = validatePDFSettings(width, height, scale, quality, maxSizeMB);
      
      setEstimation({
        sizeMB,
        isValid: validation.isValid,
        warnings: validation.warnings,
        suggestions: validation.suggestions
      });
    };

    // Initial estimation
    updateEstimation();

    // Update on window resize
    window.addEventListener('resize', updateEstimation);
    
    // Cleanup
    return () => window.removeEventListener('resize', updateEstimation);
  }, [elementId, quality, scale, maxSizeMB]);

  if (!estimation) return null;

  const getStatusIcon = () => {
    if (estimation.isValid) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (estimation.warnings.length > 0) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    } else {
      return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    if (estimation.isValid) return 'text-green-700 bg-green-50 border-green-200';
    if (estimation.warnings.length > 0) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <div className="flex-1">
        <div className="text-sm font-medium">
          Estimated PDF Size: {estimation.sizeMB.toFixed(2)}MB
          {maxSizeMB && (
            <span className="ml-2 text-xs opacity-75">
              (Max: {maxSizeMB}MB)
            </span>
          )}
        </div>
        
        {estimation.warnings.length > 0 && (
          <div className="text-xs mt-1 space-y-1">
            {estimation.warnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-1">
                <span className="text-yellow-500">⚠</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
        
        {estimation.suggestions.length > 0 && (
          <div className="text-xs mt-1 space-y-1">
            {estimation.suggestions.map((suggestion, index) => (
              <div key={index} className="flex items-start gap-1">
                <span className="text-blue-500">💡</span>
                <span>{suggestion}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
