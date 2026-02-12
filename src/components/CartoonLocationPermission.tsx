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
    <div className="max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-center gap-2 bg-amber-50 bg-opacity-80 rounded-xl px-3 py-2 border border-amber-300">
        <span className="text-base">📍</span>
        {permissionDenied ? (
          <span className="text-sm text-amber-700">
            Location denied — enable in browser settings for drive times
          </span>
        ) : error ? (
          <>
            <span className="text-sm text-amber-700">{error}</span>
            <button
              onClick={onRequestPermission}
              disabled={loading}
              className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1 rounded-full border border-amber-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Retrying...' : 'Retry'}
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-amber-700">Share location for drive times</span>
            <button
              onClick={onRequestPermission}
              disabled={loading}
              className="shrink-0 bg-green-500 hover:bg-green-600 text-white font-bold text-xs px-3 py-1 rounded-full border border-green-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Enable'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
