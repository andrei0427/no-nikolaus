import Foundation

typealias VesselState = String
// Values: "DOCKED_CIRKEWWA", "DOCKED_MGARR", "EN_ROUTE_TO_MGARR", "EN_ROUTE_TO_CIRKEWWA", "UNKNOWN"

typealias Terminal = String
// Values: "cirkewwa", "mgarr"

struct Vessel: Identifiable {
    var id: Int { MMSI }
    let MMSI: Int
    let LAT: Double
    let LON: Double
    let SPEED: Int   // tenths of knots
    let HEADING: Int
    let COURSE: Int
    let STATUS: Int
    let name: String
    let isNikolaus: Bool
    let state: VesselState
}

// Custom Codable — the API returns numeric fields as strings
extension Vessel: Codable {
    enum CodingKeys: String, CodingKey {
        case MMSI, LAT, LON, SPEED, HEADING, COURSE, STATUS
        case name, isNikolaus, state
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        MMSI      = try c.decode(Int.self,    forKey: .MMSI)
        LAT       = try Self.decodeDouble(c, key: .LAT)
        LON       = try Self.decodeDouble(c, key: .LON)
        SPEED     = try Self.decodeInt(c,    key: .SPEED)
        HEADING   = try Self.decodeInt(c,    key: .HEADING)
        COURSE    = try Self.decodeInt(c,    key: .COURSE)
        STATUS    = try Self.decodeInt(c,    key: .STATUS)
        name      = try c.decode(String.self, forKey: .name)
        isNikolaus = try c.decode(Bool.self,  forKey: .isNikolaus)
        state     = try c.decode(String.self, forKey: .state)
    }

    // Accepts either a JSON number or a quoted string
    private static func decodeDouble(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) throws -> Double {
        if let v = try? c.decode(Double.self, forKey: key) { return v }
        let s = try c.decode(String.self, forKey: key)
        guard let v = Double(s) else { throw DecodingError.dataCorruptedError(forKey: key, in: c, debugDescription: "Expected Double") }
        return v
    }

    private static func decodeInt(_ c: KeyedDecodingContainer<CodingKeys>, key: CodingKeys) throws -> Int {
        if let v = try? c.decode(Int.self, forKey: key) { return v }
        let s = try c.decode(String.self, forKey: key)
        guard let v = Int(s) else { throw DecodingError.dataCorruptedError(forKey: key, in: c, debugDescription: "Expected Int") }
        return v
    }
}
