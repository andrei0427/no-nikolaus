interface WaveBorderProps {
  position: 'top' | 'bottom';
}

export function WaveBorder({ position }: WaveBorderProps) {
  const isTop = position === 'top';

  return (
    <div
      className={`w-full overflow-hidden ${isTop ? '' : 'rotate-180'}`}
      style={{ height: '40px' }}
    >
      <svg
        className="w-full animate-wave"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
        style={{ minWidth: '100%', height: '40px' }}
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E1F5FE" />
            <stop offset="100%" stopColor="#4FC3F7" />
          </linearGradient>
        </defs>
        {/* Main wave */}
        <path
          d="M0,20
             C150,35 300,5 450,20
             C600,35 750,5 900,20
             C1050,35 1200,5 1200,20
             L1200,40 L0,40 Z"
          fill="url(#waveGradient)"
        />
        {/* Foam highlights */}
        <path
          d="M0,25
             C100,30 200,20 300,25
             C400,30 500,20 600,25
             C700,30 800,20 900,25
             C1000,30 1100,20 1200,25"
          fill="none"
          stroke="white"
          strokeWidth="2"
          opacity="0.6"
        />
        {/* Additional wave layer */}
        <path
          className="animate-wave-reverse"
          d="M0,28
             C100,22 200,32 300,28
             C400,22 500,32 600,28
             C700,22 800,32 900,28
             C1000,22 1100,32 1200,28"
          fill="none"
          stroke="white"
          strokeWidth="3"
          opacity="0.4"
        />
      </svg>
    </div>
  );
}
