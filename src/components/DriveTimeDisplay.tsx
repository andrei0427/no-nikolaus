interface DriveTimeDisplayProps {
  driveTime: number | null;
  loading: boolean;
  locationAvailable: boolean;
}

export function DriveTimeDisplay({
  driveTime,
  loading,
  locationAvailable,
}: DriveTimeDisplayProps) {
  if (loading) {
    return (
      <div className="text-slate-500 text-sm">
        Calculating drive time...
      </div>
    );
  }

  if (!locationAvailable) {
    return (
      <div className="text-slate-400 text-sm italic">
        Location unavailable
      </div>
    );
  }

  if (driveTime === null) {
    return null;
  }

  return (
    <div className="text-slate-600 text-sm">
      <span className="font-medium">Drive:</span> ~{driveTime} min
    </div>
  );
}
