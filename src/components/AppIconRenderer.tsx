import React from 'react';
import { AppBranding } from '../types';
import { getPresetSvg, ICON_PRESETS } from '../utils/dynamicManifest';

interface AppIconRendererProps {
  branding?: AppBranding;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'rounded' | 'squircle';
  className?: string;
}

export const AppIconRenderer: React.FC<AppIconRendererProps> = ({
  branding,
  size = 'md',
  shape = 'circle',
  className = '',
}) => {
  const safeBranding: AppBranding = branding || {
    appName: 'VEX Deals',
    tagline: 'منصة الولاء والتعويضات والتحليلات الرياضية الذكية',
    iconType: 'preset',
    presetIconId: 'emerald-shield',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-2xl',
    squircle: 'rounded-[28%]',
  }[shape];

  const sizeClasses = {
    xs: `w-7 h-7 ${shapeClasses} aspect-square shrink-0 ring-1 ring-white/20`,
    sm: `w-8 h-8 ${shapeClasses} aspect-square shrink-0 ring-1 ring-white/20`,
    md: `w-10 h-10 ${shapeClasses} aspect-square shrink-0 ring-2 ring-white/20`,
    lg: `w-14 h-14 ${shapeClasses} aspect-square shrink-0 ring-2 ring-white/20`,
    xl: `w-20 h-20 ${shapeClasses} aspect-square shrink-0 ring-4 ring-white/20`,
    '2xl': `w-28 h-28 ${shapeClasses} aspect-square shrink-0 ring-4 ring-white/20`,
  }[size];

  // 1. If uploaded high-res image data exists
  if (safeBranding.iconType === 'upload' && safeBranding.uploadedIconData) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-700/50 shadow-md ${sizeClasses} ${className}`}
      >
        <img
          src={safeBranding.uploadedIconData}
          alt={safeBranding.appName || 'Uploaded Icon'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover select-none"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // 2. If custom icon URL provided
  if (safeBranding.iconType === 'custom' && safeBranding.customIconUrl) {
    return (
      <div
        className={`relative overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-700/50 shadow-md ${sizeClasses} ${className}`}
      >
        <img
          src={safeBranding.customIconUrl}
          alt={safeBranding.appName || 'App Icon'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover select-none"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // 3. Vector SVG Preset
  const presetId = safeBranding.presetIconId || 'emerald-shield';
  const svgMarkup = getPresetSvg(presetId, safeBranding.appName || 'VEX', 512);

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center shadow-md ${sizeClasses} ${className}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
};

