import { Vessel, VesselState } from '../types';

interface NikolausStatusStripProps {
  nikolaus: Vessel | null;
}

function getStatusText(state: VesselState): string {
  switch (state) {
    case 'DOCKED_MGARR':
      return 'Nikolaus is docked at Mġarr';
    case 'DOCKED_CIRKEWWA':
      return 'Nikolaus is docked at Ċirkewwa';
    case 'EN_ROUTE_TO_MGARR':
      return 'Nikolaus is heading to Mġarr';
    case 'EN_ROUTE_TO_CIRKEWWA':
      return 'Nikolaus is heading to Ċirkewwa';
    case 'UNKNOWN':
      return 'Nikolaus location unknown';
  }
}

function getDotColor(state: VesselState): string {
  switch (state) {
    case 'DOCKED_MGARR':
    case 'DOCKED_CIRKEWWA':
      return 'bg-red-500';
    case 'EN_ROUTE_TO_MGARR':
    case 'EN_ROUTE_TO_CIRKEWWA':
      return 'bg-amber-500 animate-pulse';
    case 'UNKNOWN':
      return 'bg-gray-400';
  }
}

export function NikolausStatusStrip({ nikolaus }: NikolausStatusStripProps) {
  if (!nikolaus) {
    return (
      <div className="bg-white bg-opacity-60 border-b-2 border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="font-bold text-amber-800 text-base" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            Waiting for Nikolaus data...
          </span>
        </div>
      </div>
    );
  }

  const text = getStatusText(nikolaus.state);
  const dotColor = getDotColor(nikolaus.state);

  return (
    <div className="bg-white bg-opacity-60 border-b-2 border-amber-200">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2.5">
        <div className={`w-3 h-3 rounded-full shrink-0 ${dotColor}`} />
        <span className="font-bold text-amber-800 text-base" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          {text}
        </span>
      </div>
    </div>
  );
}
