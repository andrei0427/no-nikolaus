interface LocationPermissionProps {
  onRequestPermission: () => void;
  loading: boolean;
  permissionDenied: boolean;
  hasLocation: boolean;
}

export function LocationPermission({
  onRequestPermission,
  loading,
  permissionDenied,
  hasLocation,
}: LocationPermissionProps) {
  if (hasLocation) {
    return null;
  }

  if (permissionDenied) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mx-4 mt-4">
        <p className="text-amber-800 text-sm text-center">
          Location access denied. Drive times won't be shown, but you can still
          see Nikolaus status.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mx-4 mt-4">
      <p className="text-blue-800 text-sm text-center mb-2">
        Enable location to see estimated drive times to each terminal.
      </p>
      <button
        onClick={onRequestPermission}
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Getting location...' : 'Enable Location'}
      </button>
    </div>
  );
}
