import { SafetyStatus } from '../types';

interface CartoonStatusBadgeProps {
  status: SafetyStatus;
  reason: string;
}

const statusConfig = {
  SAFE: {
    text: 'SAFE!',
    className: 'status-safe',
    animation: 'animate-pulse-glow',
  },
  CAUTION: {
    text: 'CAUTION',
    className: 'status-caution',
    animation: '',
  },
  AVOID: {
    text: 'AVOID!',
    className: 'status-avoid',
    animation: '',
  },
};

export function CartoonStatusBadge({ status, reason }: CartoonStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <div className="text-center">
      <div
        className={`inline-block px-6 py-3 rounded-2xl font-bold text-2xl shadow-lg ${config.className} ${config.animation}`}
        style={{ fontFamily: 'Fredoka, sans-serif' }}
      >
        {config.text}
      </div>
      <p className="mt-3 text-amber-800 font-medium text-base italic">
        "{reason}"
      </p>
    </div>
  );
}
