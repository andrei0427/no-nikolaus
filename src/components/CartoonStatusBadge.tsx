import { NikolausStatus } from '../types';

interface CartoonStatusBadgeProps {
  status: NikolausStatus;
  reason: string;
}

const statusConfig = {
  ALL_CLEAR: {
    text: 'ALL CLEAR',
    className: 'status-safe',
    animation: 'animate-pulse-glow',
  },
  HEADS_UP: {
    text: 'HEADS UP',
    className: 'status-caution',
    animation: '',
  },
  DOCKED_HERE: {
    text: 'DOCKED HERE',
    className: 'status-docked-here',
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
