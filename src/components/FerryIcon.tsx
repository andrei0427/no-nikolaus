interface FerryIconProps {
  name: string;
  isNikolaus?: boolean;
  isGhost?: boolean;
  size?: number;
  className?: string;
}

export function FerryIcon({
  name,
  isNikolaus = false,
  isGhost = false,
  size = 60,
  className = '',
}: FerryIconProps) {
  const opacity = isGhost ? 0.5 : 1;

  if (isNikolaus) {
    return (
      <svg
        width={size}
        height={size * 0.7}
        viewBox="0 0 100 70"
        className={`${className} ${!isGhost ? 'animate-bob' : ''}`}
        style={{ opacity }}
      >
        {/* Evil ferry - Nikolaus */}
        {/* Hull */}
        <path
          d="M10 45 L20 60 L80 60 L90 45 L85 35 L15 35 Z"
          fill="#C62828"
          stroke="#8B0000"
          strokeWidth="2"
        />
        {/* Deck */}
        <rect x="20" y="25" width="60" height="12" rx="2" fill="#4A4A4A" stroke="#333" strokeWidth="1" />
        {/* Smokestack */}
        <rect x="55" y="10" width="12" height="18" rx="1" fill="#2D2D2D" stroke="#1a1a1a" strokeWidth="1" />
        {/* Evil smoke puffs */}
        <circle cx="61" cy="5" r="4" fill="#555" opacity="0.7" />
        <circle cx="65" cy="2" r="3" fill="#666" opacity="0.5" />
        {/* Cabin windows */}
        <rect x="25" y="28" width="6" height="6" rx="1" fill="#FFE082" />
        <rect x="35" y="28" width="6" height="6" rx="1" fill="#FFE082" />
        <rect x="45" y="28" width="6" height="6" rx="1" fill="#FFE082" />
        {/* Evil face */}
        {/* Angry eyebrows */}
        <path d="M25 42 L35 38" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
        <path d="M45 38 L55 42" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" />
        {/* Evil eyes */}
        <circle cx="32" cy="44" r="4" fill="#FFEB3B" />
        <circle cx="32" cy="44" r="2" fill="#1a1a1a" />
        <circle cx="48" cy="44" r="4" fill="#FFEB3B" />
        <circle cx="48" cy="44" r="2" fill="#1a1a1a" />
        {/* Evil grin */}
        <path
          d="M28 52 Q40 58 52 52"
          stroke="#1a1a1a"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* Teeth */}
        <path d="M32 52 L34 55 L36 52" stroke="#1a1a1a" strokeWidth="1.5" fill="white" />
        <path d="M40 53 L42 56 L44 53" stroke="#1a1a1a" strokeWidth="1.5" fill="white" />
        <path d="M48 52 L50 55 L52 52" stroke="#1a1a1a" strokeWidth="1.5" fill="white" />
        {/* Name on hull */}
        <text
          x="50"
          y="58"
          textAnchor="middle"
          fontSize="6"
          fontFamily="Fredoka, sans-serif"
          fontWeight="bold"
          fill="#FFE082"
          stroke="#1a1a1a"
          strokeWidth="0.5"
        >
          NIKOLAUS
        </text>
        {/* Flames/aura effect */}
        {!isGhost && (
          <>
            <path d="M8 50 Q5 45 10 40" stroke="#FF5722" strokeWidth="2" fill="none" opacity="0.7" />
            <path d="M92 50 Q95 45 90 40" stroke="#FF5722" strokeWidth="2" fill="none" opacity="0.7" />
          </>
        )}
      </svg>
    );
  }

  // Friendly ferry colors based on name
  const ferryColors: Record<string, { hull: string; accent: string; face: string }> = {
    "MV Ta' Pinu": { hull: '#64B5F6', accent: '#1976D2', face: '#E3F2FD' },
    'MV Malita': { hull: '#81C784', accent: '#388E3C', face: '#E8F5E9' },
    'MV Gaudos': { hull: '#FFB74D', accent: '#F57C00', face: '#FFF3E0' },
  };

  const colors = ferryColors[name] || { hull: '#90A4AE', accent: '#546E7A', face: '#ECEFF1' };

  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 100 70"
      className={`${className} ${!isGhost ? 'animate-bob' : ''}`}
      style={{ opacity, animationDelay: `${Math.random() * 2}s` }}
    >
      {/* Friendly ferry */}
      {/* Hull */}
      <path
        d="M10 45 L20 60 L80 60 L90 45 L85 35 L15 35 Z"
        fill={colors.hull}
        stroke={colors.accent}
        strokeWidth="2"
      />
      {/* Deck */}
      <rect x="20" y="25" width="60" height="12" rx="2" fill="white" stroke={colors.accent} strokeWidth="1" />
      {/* Smokestack */}
      <rect x="55" y="10" width="12" height="18" rx="1" fill={colors.accent} stroke={colors.accent} strokeWidth="1" />
      {/* Happy smoke puffs */}
      <circle cx="61" cy="5" r="4" fill="white" opacity="0.8" />
      <circle cx="66" cy="3" r="3" fill="white" opacity="0.6" />
      {/* Cabin windows */}
      <rect x="25" y="28" width="6" height="6" rx="1" fill="#E3F2FD" />
      <rect x="35" y="28" width="6" height="6" rx="1" fill="#E3F2FD" />
      <rect x="45" y="28" width="6" height="6" rx="1" fill="#E3F2FD" />
      {/* Happy face */}
      {/* Eyes */}
      <circle cx="32" cy="44" r="4" fill="white" />
      <circle cx="32" cy="44" r="2" fill="#333" />
      <circle cx="31" cy="43" r="1" fill="white" />
      <circle cx="48" cy="44" r="4" fill="white" />
      <circle cx="48" cy="44" r="2" fill="#333" />
      <circle cx="47" cy="43" r="1" fill="white" />
      {/* Blush */}
      <ellipse cx="26" cy="48" rx="3" ry="2" fill="#FFCDD2" opacity="0.6" />
      <ellipse cx="54" cy="48" rx="3" ry="2" fill="#FFCDD2" opacity="0.6" />
      {/* Happy smile */}
      <path
        d="M30 50 Q40 56 50 50"
        stroke="#333"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Name on hull */}
      <text
        x="50"
        y="58"
        textAnchor="middle"
        fontSize="5"
        fontFamily="Fredoka, sans-serif"
        fontWeight="bold"
        fill="white"
        stroke={colors.accent}
        strokeWidth="0.3"
      >
        {name.replace('MV ', '').toUpperCase()}
      </text>
      {/* Sparkles for happy ferry */}
      {!isGhost && (
        <>
          <path d="M5 30 L8 35 L5 40 L2 35 Z" fill="#FFD54F" opacity="0.8" />
          <path d="M95 30 L98 35 L95 40 L92 35 Z" fill="#FFD54F" opacity="0.8" />
        </>
      )}
    </svg>
  );
}
