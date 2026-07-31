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
    sm: { icon: 28, text: 'text-sm', subText: 'text-[10px]' },
    md: { icon: 36, text: 'text-lg', subText: 'text-xs' },
    lg: { icon: 48, text: 'text-2xl', subText: 'text-sm' },
    xl: { icon: 64, text: 'text-4xl', subText: 'text-base' },
  };

  const currentSize = sizeDimensions[size];

  // Ícone Vetorial SVG do GiroCerto (Arco Dinâmico "Giro" + Checkmark "Certo")
  const LogoIcon = (
    <svg
      width={currentSize.icon}
      height={currentSize.icon}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-[0_0_12px_rgba(0,230,118,0.35)] transition-transform duration-300 hover:scale-105"
    >
      <defs>
        {/* Gradiente do Arco Principal Giro */}
        <linearGradient id="giroGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4FF00" />
          <stop offset="60%" stopColor="#00E676" />
          <stop offset="100%" stopColor="#00F0FF" />
        </linearGradient>

        {/* Gradiente do Checkmark Certo */}
        <linearGradient id="certoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#00E676" />
        </linearGradient>

        {/* Gradiente do Fundo Glow */}
        <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00E676" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Fundo sutil com brilho radial */}
      <circle cx="50" cy="50" r="46" fill="url(#bgGlow)" />

      {/* Círculo do fundo escuro OLED */}
      <rect width="84" height="84" x="8" y="8" rx="22" fill="#0A0D14" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1.5" />

      {/* Trilha do Velocímetro / Rotação (Arco sutil de fundo) */}
      <circle
        cx="50"
        cy="50"
        r="30"
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="140 50"
        transform="rotate(135 50 50)"
      />

      {/* Arco Dinâmico "Giro" (Velocidade & Movimento em Gradiente Neon) */}
      <path
        d="M 26,58 A 28,28 0 1,1 74,48"
        fill="none"
        stroke="url(#giroGrad)"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Marcador de Giro / Trilha de Aceleração (Três pontos / setas de movimento) */}
      <circle cx="23" cy="46" r="3" fill="#D4FF00" opacity="0.9" />
      <circle cx="28" cy="34" r="2.5" fill="#D4FF00" opacity="0.6" />

      {/* Checkmark da Precisão Financeira "Certo" estilizado (Formando o 'G' de GiroCerto) */}
      <path
        d="M 42,50 L 52,60 L 76,32"
        fill="none"
        stroke="url(#certoGrad)"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`inline-flex items-center ${className}`}>{LogoIcon}</div>;
  }

  if (variant === 'vertical') {
    return (
      <div className={`inline-flex flex-col items-center text-center gap-2 ${className}`}>
        {LogoIcon}
        <div className="flex flex-col items-center">
          <span className={`font-black tracking-wider text-white uppercase ${currentSize.text} leading-none`}>
            GIRO<span className="text-[#00E676]">CERTO</span>
          </span>
          {showBadge && (
            <span className="mt-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold tracking-widest uppercase">
              ERP MOTORISTA
            </span>
          )}
        </div>
      </div>
    );
  }

  // Variant Horizontal (Default)
  return (
    <div className={`inline-flex items-center space-x-3 cursor-pointer group ${className}`}>
      {LogoIcon}
      <div className="flex flex-col justify-center">
        <div className="flex items-center space-x-1.5 leading-none">
          <span className={`font-black tracking-tight text-white uppercase ${currentSize.text}`}>
            GIRO<span className="text-[#00E676] group-hover:text-[#D4FF00] transition-colors">CERTO</span>
          </span>
          {showBadge && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-mono font-extrabold text-[10px] tracking-wider uppercase shadow-sm">
              ERP
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
          DRIVER FINANCE
        </span>
      </div>
    </div>
  );
};
