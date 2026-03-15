import Foundation

// MARK: - Response model

struct VesselsResponse: Codable {
    let vessels: [Vessel]
    let portVehicleData: PortVehicleData?
    let schedule: FerrySchedule?
    let timestamp: Int
}

// MARK: - Static client (used by both watch app and widget extension)

enum APIClient {
    static let baseURL = "https://wheresnikolaus-api.lifeofmarrow.com"

    static func fetchVessels() async throws -> VesselsResponse {
        // Use the SSE stream endpoint — it includes portVehicleData + schedule.
        // Read the first data: line and return; URLSession cancels automatically.
        guard let url = URL(string: "\(APIClient.baseURL)/api/vessels/stream") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url, timeoutInterval: 10)
        let (bytes, _) = try await URLSession.shared.bytes(for: request)
        for try await line in bytes.lines {
            if line.hasPrefix("data: "),
               let data = line.dropFirst(6).data(using: .utf8) {
                return try JSONDecoder().decode(VesselsResponse.self, from: data)
            }
        }
        throw URLError(.cannotParseResponse)
    }

    static func fetchWebcamSnapshot(alias: String) async -> Data? {
        guard let url = URL(string: "https://www.ipcamlive.com/player/snapshot.php?alias=\(alias)") else {
            return nil
        }
        return try? await URLSession.shared.data(from: url).0
    }
}

// MARK: - ObservableObject wrapper (watch app views)

@MainActor
class APIService: ObservableObject {
    @Published var vessels: [Vessel] = []
    @Published var portVehicleData: PortVehicleData?
    @Published var schedule: FerrySchedule?
    @Published var lastUpdated: Date?
    @Published var error: String?
    @Published var isLoading = false

    func refresh() async {
        isLoading = true
        do {
            let response = try await APIClient.fetchVessels()
            vessels = response.vessels
            portVehicleData = response.portVehicleData
            schedule = response.schedule
            lastUpdated = Date()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
