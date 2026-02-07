interface HeaderProps {
  connected: boolean;
  lastUpdate: Date | null;
}

export function Header({ connected, lastUpdate }: HeaderProps) {
  const formatTime = (date: Date | null) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <header className="bg-blue-600 text-white px-4 py-4 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center">No Nikolaus</h1>
        <p className="text-blue-100 text-center text-sm mt-1">
          Avoid the MV Nikolaos ferry
        </p>
        <div className="flex justify-center items-center gap-4 mt-2 text-xs text-blue-200">
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            {connected ? 'Live' : 'Offline'}
          </span>
          <span>Updated: {formatTime(lastUpdate)}</span>
        </div>
      </div>
    </header>
  );
}
