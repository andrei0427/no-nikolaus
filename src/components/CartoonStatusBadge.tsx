import { SafetyStatus } from '../types';

interface CartoonStatusBadgeProps {
  status: SafetyStatus;
  reason: string;
}

const statusConfig = {
  SAFE: {
    emoji: '🎉',
    text: 'SAFE!',
    className: 'status-safe',
    animation: 'animate-pulse-glow',
  },
  CAUTION: {
    emoji: '⚠️',
    text: 'CAUTION',
    className: 'status-caution',
    animation: '',
  },
  AVOID: {
    emoji: '🚫',
    text: 'AVOID!',
    className: 'status-avoid',
    animation: 'animate-shake',
  },
};

export function CartoonStatusBadge({ status, reason }: CartoonStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className="text-center">
      <div
        className={`inline-block px-6 py-3 rounded-2xl font-bold text-xl shadow-lg ${config.className} ${config.animation}`}
        style={{ fontFamily: 'Fredoka, sans-serif' }}
      >
        <span className="mr-2">{config.emoji}</span>
        {config.text}
        <span className="ml-2">{config.emoji}</span>
      </div>
      <p className="mt-3 text-amber-800 font-medium text-sm italic">
        "{reason}"
      </p>
    </div>
  );
}
