import React from 'react';
import kizoraLogo from '../../assets/images/Kizora-Logo-Dark.png';
import kizoraLogoLight from '../../assets/images/smartInvoGenGraphics.png';

interface CompanyLogoProps {
  size?: 'xSmall' | 'small' | 'medium' | 'large';
  className?: string;
}

export function CompanyLogo({ size = 'medium', className = '' }: CompanyLogoProps) {
  const sizeClasses = {
    xSmall: 'w-8 h-auto',
    small: 'w-24 h-auto',
    medium: 'w-32 h-auto',
    large: 'w-38 h-auto'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img
        src={kizoraLogo}
        alt="Kizora Software Private Limited"
        className="w-full h-auto object-contain"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
      />
    </div>
  );
}

export function CompanyLogoSmall({ size = 'medium', className = '' }: CompanyLogoProps) {
  const sizeClasses = {
    xSmall: 'w-8 h-auto',
    small: 'w-24 h-auto',
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img
        src={kizoraLogoLight}
        alt="Kizora Software Private Limited"
        className="w-full h-auto object-contain"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
      />
    </div>
  );
}

// Image-based logo for print/download versions
export function CompanyLogoSVG({ width = 120, height = 120, className = '' }: { width?: number; height?: number; className?: string }) {
  return (
    <img
      src={kizoraLogo}
      alt="Kizora Software Private Limited"
      width={width}
      height={height}
      className={className}
      style={{ objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
    />
  );
}

// Get the logo URL for use in HTML strings or other contexts
export function getLogoUrl(): string {
  return kizoraLogo;
}

// HTML string version for downloads
export function getCompanyLogoHTML(width: number = 120, height: number = 120): string {
  // For PDF generation, we need to use the full resolved URL
  const logoUrl = kizoraLogo.startsWith('data:') ? kizoraLogo : `./${kizoraLogo}`;
  
  return `
    <img
      src="${logoUrl}"
      alt="Kizora Software Private Limited"
      width="${width}"
      height="${height}"
      style="object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1)); max-width: 100%;"
    />
  `;
}
