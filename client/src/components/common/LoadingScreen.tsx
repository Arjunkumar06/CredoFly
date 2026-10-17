import React from 'react';
import { BrandLogo } from './BrandLogo';

export interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
  theme?: 'dark' | 'light';
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading CredoFly Flight Engine...',
  subMessage = 'Connecting to real-time airline schedule & inventory services',
  fullScreen = false,
  theme = 'light',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center space-y-4 ${
        fullScreen
          ? `fixed inset-0 z-50 ${theme === 'dark' ? 'bg-navy-950 text-white' : 'bg-slate-50 text-navy-950'}`
          : 'min-h-[50vh] w-full'
      }`}
    >
      {/* Animated Brand Logo with glowing pulse ring */}
      <div className="relative">
        <div className="absolute -inset-2 bg-blue-500/20 rounded-3xl blur-md animate-pulse"></div>
        <div className="relative transform hover:scale-105 transition-transform duration-300">
          <BrandLogo size="xl" />
        </div>
      </div>

      {/* Spinner & Message */}
      <div className="flex flex-col items-center space-y-2 max-w-sm">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p
            className={`text-sm font-bold ${
              theme === 'dark' ? 'text-white' : 'text-slate-800'
            }`}
          >
            {message}
          </p>
        </div>
        {subMessage && (
          <p
            className={`text-xs ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
};
