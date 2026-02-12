import { useState } from 'react';
import { Terminal } from '../types';

interface Camera {
  name: string;
  url: string;
}

const terminalCameras: Record<Terminal, Camera[]> = {
  cirkewwa: [
    { name: 'Marshalling (Front)', url: 'https://www.ipcamlive.com/player/player.php?alias=5ff3216215c7c&autoplay=1' },
    { name: 'Marshalling (Side)', url: 'https://www.ipcamlive.com/player/player.php?alias=5ff327ab87fd7&autoplay=1' },
  ],
  mgarr: [
    { name: 'Marshalling (Front)', url: 'https://www.ipcamlive.com/player/player.php?alias=5975bfa3e7f2d&autoplay=1' },
    { name: 'Shore (Upper)', url: 'https://g0.ipcamlive.com/player/player.php?alias=598d6542f2f4d' },
    { name: 'Shore (Middle)', url: 'https://g0.ipcamlive.com/player/player.php?alias=6110f4b30ec0d' },
    { name: 'Shore (Lower)', url: 'https://www.ipcamlive.com/player/player.php?alias=5979b0b2141aa&autoplay=1' },
    { name: 'Mġarr Road', url: 'https://g0.ipcamlive.com/player/player.php?alias=598d64ffc350e' },
  ],
};

const terminalNames: Record<Terminal, string> = {
  cirkewwa: 'Ċirkewwa',
  mgarr: 'Mġarr',
};

export function CartoonWebcams() {
  const [activeCamera, setActiveCamera] = useState<string | null>(null);

  return (
    <div className="cartoon-card p-4">
      <h3 className="text-lg font-bold text-amber-900 mb-3 font-[Fredoka]">
        📷 Webcams
      </h3>

      {(['cirkewwa', 'mgarr'] as Terminal[]).map((terminal) => (
        <div key={terminal} className="mb-3 last:mb-0">
          <p className="text-sm font-semibold text-amber-700 mb-1.5">{terminalNames[terminal]}</p>
          <div className="flex flex-wrap gap-1.5">
            {terminalCameras[terminal].map((cam) => (
              <button
                key={cam.url}
                onClick={() => setActiveCamera(activeCamera === cam.url ? null : cam.url)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  activeCamera === cam.url
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                }`}
              >
                {cam.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      {activeCamera && (
        <div className="mt-3 relative">
          <button
            onClick={() => setActiveCamera(null)}
            className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold hover:bg-opacity-70 transition-colors"
            aria-label="Close webcam"
          >
            ✕
          </button>
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src={activeCamera}
              className="absolute inset-0 w-full h-full rounded-lg"
              allow="autoplay"
              allowFullScreen
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  );
}
