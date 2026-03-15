import CoreLocation
import Combine

// Terminal coordinates (WGS84)
private let cirkewwaCoord = CLLocation(latitude: 35.989, longitude: 14.329)
private let mgarrCoord    = CLLocation(latitude: 36.025, longitude: 14.299)

@MainActor
class LocationService: NSObject, ObservableObject {
    private let manager = CLLocationManager()

    @Published var location: CLLocation?
    @Published var authorizationStatus: CLAuthorizationStatus = .notDetermined
    @Published var nearestTerminal: Terminal = "cirkewwa"
    @Published var driveTimeCirkewwa: Double?  // minutes
    @Published var driveTimeMgarr: Double?     // minutes

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    func requestPermission() {
        manager.requestWhenInUseAuthorization()
    }

    func startUpdating() {
        manager.startUpdatingLocation()
    }

    func stopUpdating() {
        manager.stopUpdatingLocation()
    }

    /// Drive time to the nearest terminal, in minutes
    var nearestTerminalDriveTime: Double? {
        nearestTerminal == "cirkewwa" ? driveTimeCirkewwa : driveTimeMgarr
    }

    // MARK: - Private

    private func updateDriveTimes(from location: CLLocation) {
        let distCirkewwa = location.distance(from: cirkewwaCoord) / 1000.0  // km
        let distMgarr    = location.distance(from: mgarrCoord)    / 1000.0

        // Drive time: distance × 1.3 (winding roads) ÷ 40 km/h × 60 min/h
        driveTimeCirkewwa = distCirkewwa * 1.3 / 40.0 * 60.0
        driveTimeMgarr    = distMgarr    * 1.3 / 40.0 * 60.0

        nearestTerminal = distCirkewwa <= distMgarr ? "cirkewwa" : "mgarr"
    }
}

extension LocationService: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        Task { @MainActor in
            self.location = loc
            self.updateDriveTimes(from: loc)
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        Task { @MainActor in
            self.authorizationStatus = manager.authorizationStatus
            if manager.authorizationStatus == .authorizedWhenInUse ||
               manager.authorizationStatus == .authorizedAlways {
                manager.startUpdatingLocation()
            }
        }
    }
}
