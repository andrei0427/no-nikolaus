interface CartoonLocationPermissionProps {
  onRequestPermission: () => void;
  loading: boolean;
  permissionDenied: boolean;
  hasLocation: boolean;
  error: string | null;
}

export function CartoonLocationPermission({
  onRequestPermission,
  loading,
  permissionDenied,
  hasLocation,
  error,
}: CartoonLocationPermissionProps) {
  if (hasLocation) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 mt-6">
      <div className="cartoon-card p-4 text-center">
        {permissionDenied ? (
          <div>
            <span className="text-2xl font-bold text-amber-800 mb-2 block">Location Denied</span>
            <p className="text-lg text-amber-800 font-medium">
              Location access denied. Enable it in your browser settings for drive time estimates!
            </p>
          </div>
        ) : error ? (
          <div>
            <span className="text-2xl font-bold text-red-700 mb-2 block">Location Error</span>
            <p className="text-lg text-amber-800 font-medium mb-3">
              {error}
            </p>
            <button
              onClick={onRequestPermission}
              disabled={loading}
              className="bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600
                         text-white font-bold py-3 px-6 rounded-xl border-3 border-amber-700
                         shadow-lg hover:shadow-xl transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Fredoka, sans-serif' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Retrying...
                </span>
              ) : (
                <span>Try Again</span>
              )}
            </button>
          </div>
        ) : (
          <div>
            <span className="text-2xl font-bold text-amber-800 mb-2 block">Location</span>
            <p className="text-lg text-amber-800 font-medium mb-3">
              Share your location to see drive times and personalized predictions!
            </p>
            <button
              onClick={onRequestPermission}
              disabled={loading}
              className="bg-gradient-to-b from-green-400 to-green-500 hover:from-green-500 hover:to-green-600
                         text-white font-bold py-3 px-6 rounded-xl border-3 border-green-700
                         shadow-lg hover:shadow-xl transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Fredoka, sans-serif' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Getting location...
                </span>
              ) : (
                <span>Enable Location</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
