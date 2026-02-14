interface StartTripButtonProps {
  onStartTrip: () => void;
}

export function StartTripButton({ onStartTrip }: StartTripButtonProps) {
  return (
    <div className="max-w-md mx-auto">
      <button
        onClick={onStartTrip}
        className="w-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg py-4 px-6 rounded-2xl border-2 border-blue-700 shadow-lg transition-all duration-200 active:scale-[0.98]"
        style={{ fontFamily: 'Fredoka, sans-serif' }}
      >
        Planning to cross? Start a trip
      </button>
      <p className="text-center text-white text-opacity-70 text-sm mt-2">
        Get personalized predictions and a notification
      </p>
    </div>
  );
}
