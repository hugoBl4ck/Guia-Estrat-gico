import React from 'react';

interface GiroCertoLogoProps {
  variant?: 'horizontal' | 'vertical' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
}

export const GiroCertoLogo: React.FC<GiroCertoLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showBadge = true,
}) => {
  // Configurações de dimensão por tamanho
  const sizeDimensions = {
    sm: { icon: 32, text: 'text-base', subText: 'text-[9px]', badge: 'text-[9px] px-1 py-0.5' },
    md: { icon: 40, text: 'text-xl', subText: 'text-[10px]', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 52, text: 'text-2xl', subText: 'text-xs', badge: 'text-xs px-2 py-0.5' },
    xl: { icon: 68, text: 'text-4xl', subText: 'text-sm', badge: 'text-sm px-2.5 py-1' },
  };

  const currentSize = sizeDimensions[size];

  const LogoIcon = (
    <img
      src="/speedometerlogo.svg"
      width={currentSize.icon}
      height={currentSize.icon}
      alt="GiroCerto Logo"
      className="shrink-0 drop-shadow-[0_0_14px_rgba(0,230,118,0.35)] transition-transform duration-300 hover:scale-105"
    />
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{LogoIcon}</div>;
  }

  if (variant === 'vertical') {
    return (
      <div className={`inline-flex flex-col items-center text-center gap-2 ${className}`}>
        {LogoIcon}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight text-white uppercase ${currentSize.text} leading-none`}>
              GIRO<span className="text-[#00E676]">CERTO</span>
            </span>
            {showBadge && (
              <span className={`rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold tracking-widest uppercase inline-flex items-center justify-center leading-none ${currentSize.badge}`}>
                ERP
              </span>
            )}
          </div>
          <span className={`mt-1 font-mono font-medium text-slate-400 tracking-wide uppercase leading-tight ${currentSize.subText}`}>
            SISTEMA DE FINANÇAS DO MOTORISTA
          </span>
        </div>
      </div>
    );
  }

  // Variant Horizontal (Default)
  return (
    <div className={`inline-flex items-center space-x-3 cursor-pointer group ${className}`}>
      {LogoIcon}
      <div className="flex flex-col justify-center">
        <div className="flex items-center space-x-2 leading-none">
          <span className={`font-black tracking-tight text-white uppercase ${currentSize.text} leading-none`}>
            GIRO<span className="text-[#00E676] group-hover:text-[#D4FF00] transition-colors">CERTO</span>
          </span>
          {showBadge && (
            <span className={`rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold tracking-wider uppercase inline-flex items-center justify-center leading-none ${currentSize.badge}`}>
              ERP
            </span>
          )}
        </div>
        <span className={`font-mono font-semibold text-slate-400 tracking-wide uppercase mt-1 leading-none ${currentSize.subText}`}>
          SISTEMA DE FINANÇAS DO MOTORISTA
        </span>
      </div>
    </div>
  );
};
