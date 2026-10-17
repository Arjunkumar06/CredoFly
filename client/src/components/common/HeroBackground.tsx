import React from 'react';

interface HeroBackgroundProps {
  variant?: 'full' | 'banner' | 'admin' | 'card';
  className?: string;
  overlayClassName?: string;
  children?: React.ReactNode;
}

export const HeroBackground: React.FC<HeroBackgroundProps> = ({
  variant = 'banner',
  className = '',
  overlayClassName = '',
  children,
}) => {
  // Variant-specific styling rules for responsive background cover and overlays
  const variantStyles = {
    full: {
      container: 'relative overflow-hidden bg-navy-950 text-white min-h-[480px] lg:min-h-[580px]',
      bgPosition: 'bg-[center_top_20%] sm:bg-[center_right] lg:bg-[center_right_15%]',
      overlay:
        'bg-gradient-to-r from-navy-950/95 via-navy-950/85 sm:via-navy-900/75 to-blue-950/40 backdrop-blur-[0.5px]',
    },
    banner: {
      container: 'relative overflow-hidden bg-navy-950 text-white py-8 sm:py-12 border-b border-navy-800/80',
      bgPosition: 'bg-[center_right_10%]',
      overlay:
        'bg-gradient-to-r from-navy-950/95 via-navy-900/85 to-navy-950/75 backdrop-blur-[0.5px]',
    },
    admin: {
      container: 'relative overflow-hidden bg-navy-950 text-white py-4 px-6 rounded-2xl shadow-sm border border-navy-800/70',
      bgPosition: 'bg-[center_right]',
      overlay:
        'bg-gradient-to-r from-navy-950/95 via-navy-900/90 to-navy-950/80',
    },
    card: {
      container: 'relative overflow-hidden rounded-2xl text-white shadow-lg',
      bgPosition: 'bg-cover bg-center',
      overlay:
        'bg-gradient-to-t from-navy-950/95 via-navy-900/60 to-transparent',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`${style.container} ${className} bg-cover bg-no-repeat ${style.bgPosition} transition-all duration-300`}
      style={{
        backgroundImage: "url('/images/credofly-hero.jpg'), url('/images/credofly-hero.png')",
      }}
    >
      {/* Translucent navy / blue overlay for text contrast and readability */}
      <div
        className={`absolute inset-0 ${style.overlay} ${overlayClassName} pointer-events-none`}
        aria-hidden="true"
      />
      {/* Relative wrapper for interactive content */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
