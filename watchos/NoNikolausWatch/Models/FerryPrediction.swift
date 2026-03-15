import Foundation

struct FerryPrediction {
    let ferry: Vessel?
    let confidence: String   // "high", "medium", "low"
    let reason: String
    let departureTime: String?  // "HH:MM" or nil if already waiting

    /// True when this prediction is safe (no Nikolaus, or Nikolaus not in service)
    var isSafe: Bool {
        guard let ferry else { return true }
        if !ferry.isNikolaus { return true }
        return ferry.state == "UNKNOWN"
    }

    /// Color category for complication display
    var colorCategory: ComplicationColor {
        guard ferry != nil else { return .gray }
        return isSafe ? .green : .red
    }
}

enum ComplicationColor {
    case green, red, gray
}
