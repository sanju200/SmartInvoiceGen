import React from 'react';
import KizoraLogoDarkImg from '@/assets/images/Kizora-Logo-Dark-img.png';

type Align = 'start' | 'center' | 'end';
type TextVisibility = 'auto' | 'always' | 'hidden';

interface BuiltWithPurposeProps {
  className?: string;
  imgClassName?: string;
  align?: Align; // flex alignment
  size?: number; // image width in px (height auto)
  text?: string; // override text
  textVisibility?: TextVisibility; // auto hides on collapsed sidebar
}

export const BuiltWithPurpose: React.FC<BuiltWithPurposeProps> = ({
  className = '',
  imgClassName = '',
  align = 'center',
  size = 32,
  text = '| Developed with ❤️ by Kizora',
  textVisibility = 'auto',
}) => {
  const justify = align === 'start' ? 'justify-start' : align === 'end' ? 'justify-end' : 'justify-center';
  const visibilityClass =
    textVisibility === 'auto'
      ? 'opacity-100 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden'
      : textVisibility === 'always'
      ? 'opacity-100'
      : 'hidden';

  return (
    <div className={`relative flex items-center ${justify} group-data-[collapsible=icon]:justify-center ${className}`} aria-label="Built with purpose">
      <div className="flex-shrink-0" aria-hidden="true">
        <img
          src={KizoraLogoDarkImg}
          alt="Kizora"
          width={size}
          style={{ width: size, height: 'auto' }}
          className={`h-auto transition-opacity opacity-70 ${imgClassName}`}
        />
      </div>
      <span className={`ms-2 left-10 text-sm transition ease-linear duration-300 text-[#92929c] ${visibilityClass}`}>
        {text}
      </span>
    </div>
  );
};

export default BuiltWithPurpose;
