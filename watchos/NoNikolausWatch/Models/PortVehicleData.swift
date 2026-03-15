import Foundation

struct PortVehicleDetections: Codable {
    let car: Int
    let motorbike: Int
    let truck: Int

    var totalCarEquivalent: Double {
        Double(car) + Double(truck) * 3.0 + Double(motorbike) * 0.25
    }

    var queueSeverity: QueueSeverity {
        switch totalCarEquivalent {
        case ..<50:  return .low
        case 50..<100: return .moderate
        default: return .high
        }
    }
}

enum QueueSeverity: String {
    case low = "Low"
    case moderate = "Moderate"
    case high = "High"
}

struct PortVehicleData: Codable {
    let cirkewwa: PortVehicleDetections?
    let mgarr: PortVehicleDetections?

    func detections(for terminal: Terminal) -> PortVehicleDetections? {
        terminal == "cirkewwa" ? cirkewwa : mgarr
    }
}
