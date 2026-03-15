import Foundation

// MARK: - Constants (mirrored from frontend/src/utils/constants.ts)

private let TURNAROUND_TIME: Double    = 15  // minutes
private let BUFFER_TIME: Double        = 15  // minutes
private let AVERAGE_CROSSING_TIME: Double = 25  // minutes

private let FERRY_CAPACITIES: [String: Double] = [
    "MV Ta' Pinu": 138,
    "MV Malita":   138,
    "MV Nikolaos": 160,
    "MV Gaudos":    72,
]

private let TRUCK_CAR_EQUIVALENT: Double  = 3.0
private let MOTORBIKE_CAR_EQUIVALENT: Double = 0.25

// MARK: - Helpers

private func haversineKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
    let R = 6371.0
    let dLat = (lat2 - lat1) * .pi / 180
    let dLon = (lon2 - lon1) * .pi / 180
    let a = sin(dLat/2)*sin(dLat/2)
          + cos(lat1 * .pi/180)*cos(lat2 * .pi/180)*sin(dLon/2)*sin(dLon/2)
    return R * 2 * atan2(sqrt(a), sqrt(1-a))
}

private func etaMinutes(distKm: Double, speedTenthsKnots: Int) -> Double? {
    guard speedTenthsKnots > 0 else { return nil }
    let kmh = Double(speedTenthsKnots) / 10.0 * 1.852
    return distKm / kmh * 60.0
}

private func minutesToHHMM(_ m: Double) -> String {
    let h   = Int(m / 60) % 24
    let min = Int(m.rounded()) % 60
    return String(format: "%02d:%02d", h, min)
}

// Terminal coordinates
private let TERMINALS: [Terminal: (lat: Double, lon: Double)] = [
    "cirkewwa": (35.989, 14.329),
    "mgarr":    (36.025, 14.299),
]

// MARK: - Prediction

/// Port of frontend/src/utils/ferryPrediction.ts → predictLikelyFerry()
func predictLikelyFerry(
    vessels: [Vessel],
    terminal: Terminal,
    driveTime: Double?,
    queueData: PortVehicleDetections? = nil
) -> FerryPrediction {
    guard !vessels.isEmpty,
          let term = TERMINALS[terminal],
          let other = TERMINALS[terminal == "cirkewwa" ? "mgarr" : "cirkewwa"]
    else {
        return FerryPrediction(ferry: nil, confidence: "low",
                               reason: "No ferry data", departureTime: nil)
    }

    let now = Calendar.current.dateComponents([.hour, .minute], from: Date())
    let nowMinutes = Double((now.hour ?? 0) * 60 + (now.minute ?? 0))
    let userArrival = driveTime.map { nowMinutes + $0 + BUFFER_TIME } ?? nowMinutes

    struct ReadyEntry {
        let vessel: Vessel
        let readyMinutes: Double
        let detail: String
    }

    var readyList: [ReadyEntry] = []

    for vessel in vessels {
        let s = vessel.state
        let isDocked      = (terminal == "cirkewwa" && s == "DOCKED_CIRKEWWA") ||
                            (terminal == "mgarr"    && s == "DOCKED_MGARR")
        let isEnRoute     = (terminal == "cirkewwa" && s == "EN_ROUTE_TO_CIRKEWWA") ||
                            (terminal == "mgarr"    && s == "EN_ROUTE_TO_MGARR")
        let isDockedOther = (terminal == "cirkewwa" && s == "DOCKED_MGARR") ||
                            (terminal == "mgarr"    && s == "DOCKED_CIRKEWWA")
        let isEnRouteAway = (terminal == "cirkewwa" && s == "EN_ROUTE_TO_MGARR") ||
                            (terminal == "mgarr"    && s == "EN_ROUTE_TO_CIRKEWWA")

        if isDocked {
            readyList.append(ReadyEntry(vessel: vessel, readyMinutes: nowMinutes, detail: "docked"))
        } else if isEnRoute {
            let dist = haversineKm(lat1: vessel.LAT, lon1: vessel.LON, lat2: term.lat, lon2: term.lon)
            if let eta = etaMinutes(distKm: dist, speedTenthsKnots: vessel.SPEED) {
                readyList.append(ReadyEntry(vessel: vessel,
                                            readyMinutes: nowMinutes + eta + TURNAROUND_TIME,
                                            detail: "arrives in ~\(Int(eta)) min"))
            }
        } else if isDockedOther {
            let ready = nowMinutes + TURNAROUND_TIME + AVERAGE_CROSSING_TIME + TURNAROUND_TIME
            let from  = terminal == "cirkewwa" ? "Gozo" : "Malta"
            readyList.append(ReadyEntry(vessel: vessel, readyMinutes: ready,
                                        detail: "crossing from \(from)"))
        } else if isEnRouteAway {
            let dist = haversineKm(lat1: vessel.LAT, lon1: vessel.LON, lat2: other.lat, lon2: other.lon)
            if let eta = etaMinutes(distKm: dist, speedTenthsKnots: vessel.SPEED) {
                let ready = nowMinutes + eta + TURNAROUND_TIME + AVERAGE_CROSSING_TIME + TURNAROUND_TIME
                let via   = terminal == "cirkewwa" ? "Gozo" : "Malta"
                readyList.append(ReadyEntry(vessel: vessel, readyMinutes: ready,
                                            detail: "returning via \(via)"))
            }
        }
    }

    readyList.sort { $0.readyMinutes < $1.readyMinutes }

    guard !readyList.isEmpty else {
        return FerryPrediction(ferry: nil, confidence: "low",
                               reason: "No ferry data", departureTime: nil)
    }

    // --- Queue drain (mirrors TypeScript logic) ---
    if let q = queueData {
        let totalQueue = Double(q.car)
            + Double(q.truck) * TRUCK_CAR_EQUIVALENT
            + Double(q.motorbike) * MOTORBIKE_CAR_EQUIVALENT

        var remaining = totalQueue

        for r in readyList {
            let capacity = FERRY_CAPACITIES[r.vessel.name] ?? 100
            remaining -= capacity
            if remaining <= 0 && r.readyMinutes >= userArrival {
                let queueNote = totalQueue > capacity ? " (queue clears)" : ""
                return FerryPrediction(
                    ferry: r.vessel,
                    confidence: r.detail == "docked" ? "high" : "medium",
                    reason: "\(r.vessel.name) — \(r.detail)\(queueNote)",
                    departureTime: minutesToHHMM(r.readyMinutes)
                )
            }
            if remaining <= 0 { remaining = 0 }
        }

        // Queue never drains — return last vessel
        let last = readyList[readyList.count - 1]
        return FerryPrediction(
            ferry: last.vessel,
            confidence: "low",
            reason: "Heavy queue — expect delays",
            departureTime: minutesToHHMM(last.readyMinutes)
        )
    }

    // --- No queue data: first vessel ready when user arrives ---
    if let ready = readyList.first(where: { $0.readyMinutes <= userArrival }) {
        return FerryPrediction(
            ferry: ready.vessel,
            confidence: ready.detail == "docked" ? "high" : "medium",
            reason: ready.detail == "docked"
                ? "\(ready.vessel.name) — docked & waiting"
                : "\(ready.vessel.name) — \(ready.detail)",
            departureTime: nil
        )
    }

    // Next ferry that will be ready
    let next = readyList[0]
    return FerryPrediction(
        ferry: next.vessel,
        confidence: "medium",
        reason: "\(next.vessel.name) — \(next.detail)",
        departureTime: minutesToHHMM(next.readyMinutes)
    )
}
