interface CartoonLocationPermissionProps {
  onRequestPermission: () => void;
  loading: boolean;
  permissionDenied: boolean;
  hasLocation: boolean;
}

export function CartoonLocationPermission({
  onRequestPermission,
  loading,
  permissionDenied,
  hasLocation,
}: CartoonLocationPermissionProps) {
  if (hasLocation) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 mt-6">
      <div className="cartoon-card p-4 text-center">
        {permissionDenied ? (
          <div>
            <span className="text-3xl mb-2 block">😢</span>
            <p className="text-amber-800 font-medium">
              Location access denied. Enable it in your browser settings for drive time estimates!
            </p>
          </div>
        ) : (
          <div>
            <span className="text-3xl mb-2 block">📍</span>
            <p className="text-amber-800 font-medium mb-3">
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
                  <span className="animate-spin">🔄</span> Getting location...
                </span>
              ) : (
                <span>🗺️ Enable Location</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
