import React from 'react';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  textSubtitle?: string;
  theme?: 'dark' | 'light';
  className?: string;
  imageClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  withText = false,
  textSubtitle,
  theme = 'dark',
  className = '',
  imageClassName = '',
}) => {
  const sizeMap = {
    sm: {
      image: 'w-7 h-7 rounded-lg',
      title: 'text-base',
      subtitle: 'text-[9px]',
    },
    md: {
      image: 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl',
      title: 'text-lg sm:text-xl',
      subtitle: 'text-[10px]',
    },
    lg: {
      image: 'w-12 h-12 rounded-2xl',
      title: 'text-2xl',
      subtitle: 'text-xs',
    },
    xl: {
      image: 'w-16 h-16 rounded-2xl',
      title: 'text-3xl',
      subtitle: 'text-sm',
    },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center space-x-2.5 ${className}`}>
      {/* Square CredoFly App Logo */}
      <img
        src="/images/credofly-logo.png"
        alt="CredoFly Logo"
        className={`${currentSize.image} object-contain flex-shrink-0 shadow-md shadow-blue-900/20 ${imageClassName}`}
        onError={(e) => {
          // Graceful fallback to relative path or jpg
          (e.target as HTMLImageElement).src = '/images/credofly-logo.jpg';
        }}
      />

      {withText && (
        <div className="flex flex-col leading-none">
          <span
            className={`font-black tracking-tight ${currentSize.title} ${
              theme === 'dark' ? 'text-white' : 'text-navy-950'
            }`}
          >
            Credo<span className="text-blue-500">Fly</span>
          </span>
          {textSubtitle && (
            <span
              className={`font-semibold tracking-wider uppercase mt-0.5 ${currentSize.subtitle} ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {textSubtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
