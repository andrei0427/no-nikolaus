import SwiftUI

struct TerminalDetailView: View {
    @EnvironmentObject var apiService: APIService
    @EnvironmentObject var locationService: LocationService

    private var terminal: Terminal {
        locationService.nearestTerminal
    }

    private var queueData: PortVehicleDetections? {
        apiService.portVehicleData?.detections(for: terminal)
    }

    private var prediction: FerryPrediction {
        predictLikelyFerry(
            vessels: apiService.vessels,
            terminal: terminal,
            driveTime: locationService.nearestTerminalDriveTime,
            queueData: queueData
        )
    }

    private var terminalDisplayName: String {
        terminal == "cirkewwa" ? "Ċirkewwa" : "Mġarr"
    }

    private var currentTimeString: String {
        let now = Calendar.current.dateComponents([.hour, .minute], from: Date())
        return String(format: "%02d:%02d", now.hour ?? 0, now.minute ?? 0)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {

                // Terminal header
                HStack {
                    Image(systemName: "ferry.fill")
                        .foregroundStyle(.blue)
                    Text(terminalDisplayName)
                        .font(.headline)
                }

                // Status badge
                statusBadge

                // Drive time
                if let driveTime = locationService.nearestTerminalDriveTime {
                    Label("\(Int(driveTime.rounded())) min drive", systemImage: "car.fill")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()

                // Predicted ferry
                VStack(alignment: .leading, spacing: 4) {
                    Text("Next ferry")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    if let ferry = prediction.ferry {
                        Text(ferry.name)
                            .font(.body.bold())
                        if let dept = prediction.departureTime {
                            Text("Departs ~\(dept)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Text("No data")
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                }

                Divider()

                // Queue data
                if let queue = queueData {
                    queueSection(queue)
                }

                // Schedule
                if let schedule = apiService.schedule {
                    scheduleSection(schedule)
                }
            }
            .padding(.horizontal, 4)
        }
        .navigationTitle(terminalDisplayName)
    }

    // MARK: - Subviews

    @ViewBuilder
    private var statusBadge: some View {
        let nikolaus = apiService.vessels.first(where: { $0.isNikolaus })
        let isUnknown = nikolaus?.state == "UNKNOWN" || nikolaus == nil

        HStack(spacing: 6) {
            Circle()
                .fill(badgeColor)
                .frame(width: 10, height: 10)
            Text(badgeLabel)
                .font(.caption.bold())
                .foregroundStyle(badgeColor)
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 8)
        .background(badgeColor.opacity(0.15))
        .clipShape(Capsule())

        if isUnknown {
            Text("Nikolaus not in service")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var badgeLabel: String {
        let ferry = prediction.ferry
        guard let ferry else { return "NO DATA" }
        if !ferry.isNikolaus { return "ALL CLEAR" }
        if ferry.state == "UNKNOWN" { return "ALL CLEAR" }
        // Check if Nikolaus is docked at THIS terminal
        let dockedHere = (terminal == "cirkewwa" && ferry.state == "DOCKED_CIRKEWWA") ||
                         (terminal == "mgarr"    && ferry.state == "DOCKED_MGARR")
        return dockedHere ? "DOCKED HERE" : "HEADS UP"
    }

    private var badgeColor: Color {
        switch prediction.colorCategory {
        case .green: return .green
        case .red:   return .orange
        case .gray:  return .gray
        }
    }

    @ViewBuilder
    private func queueSection(_ queue: PortVehicleDetections) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Queue")
                .font(.caption2)
                .foregroundStyle(.secondary)
            HStack(spacing: 12) {
                Label("\(queue.car)", systemImage: "car")
                Label("\(queue.truck)", systemImage: "truck.box")
                Label("\(queue.motorbike)", systemImage: "motorcycle")
            }
            .font(.caption)
            Text("Severity: \(queue.queueSeverity.rawValue)")
                .font(.caption2)
                .foregroundStyle(severityColor(queue.queueSeverity))
        }
    }

    @ViewBuilder
    private func scheduleSection(_ schedule: FerrySchedule) -> some View {
        let next = schedule.nextDepartures(from: terminal, after: currentTimeString)
        if !next.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text("Departures")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                ForEach(next, id: \.self) { time in
                    Text(time)
                        .font(.caption.monospacedDigit())
                }
            }
        }
    }

    private func severityColor(_ s: QueueSeverity) -> Color {
        switch s {
        case .low:      return .green
        case .moderate: return .yellow
        case .high:     return .red
        }
    }
}
