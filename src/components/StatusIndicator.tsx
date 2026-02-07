import { SafetyStatus } from '../types';

interface StatusIndicatorProps {
  status: SafetyStatus;
  reason: string;
}

const statusConfig: Record<
  SafetyStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  SAFE: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-500',
    label: 'SAFE',
  },
  CAUTION: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-500',
    label: 'CAUTION',
  },
  AVOID: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-500',
    label: 'AVOID',
  },
};

export function StatusIndicator({ status, reason }: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${config.bg} ${config.text} ${config.border} border-2 rounded-lg px-6 py-3 font-bold text-xl`}
      >
        {config.label}
      </div>
      <p className="text-slate-600 text-sm text-center px-2">{reason}</p>
    </div>
  );
}
