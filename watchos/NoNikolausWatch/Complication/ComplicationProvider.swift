import WidgetKit
import SwiftUI
import CoreLocation

private struct WidgetBackgroundModifier: ViewModifier {
    func body(content: Content) -> some View {
        if #available(watchOS 10.0, *) {
            content.containerBackground(for: .widget) { }
        } else {
            content
        }
    }
}

// MARK: - TimelineProvider

struct FerryTimelineProvider: TimelineProvider {
    typealias Entry = FerryEntry

    func placeholder(in context: Context) -> FerryEntry {
        FerryEntry(
            date: Date(),
            ferryName: "MV Malita",
            driveTimeMinutes: 12,
            departureTime: "10:30",
            colorCategory: .green,
            terminal: "cirkewwa"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (FerryEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<FerryEntry>) -> Void) {
        Task {
            let entry = await buildEntry()
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
            completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
        }
    }

    // MARK: - Private

    private func buildEntry() async -> FerryEntry {
        // Fetch vessel data
        guard let response = try? await APIClient.fetchVessels() else {
            return FerryEntry(date: Date(), ferryName: nil, driveTimeMinutes: nil,
                              departureTime: nil, colorCategory: .gray, terminal: "cirkewwa")
        }

        let (terminal, driveTime) = await MainActor.run { locationAndDriveTime() }

        let queueData = response.portVehicleData?.detections(for: terminal)
        let prediction = predictLikelyFerry(
            vessels: response.vessels,
            terminal: terminal,
            driveTime: driveTime.map(Double.init),
            queueData: queueData
        )

        return FerryEntry(
            date: Date(),
            ferryName: prediction.ferry?.name,
            driveTimeMinutes: driveTime,
            departureTime: prediction.departureTime,
            colorCategory: prediction.colorCategory,
            terminal: terminal
        )
    }

    @MainActor
    private func locationAndDriveTime() -> (Terminal, Int?) {
        let manager = CLLocationManager()
        guard let loc = manager.location else { return ("cirkewwa", nil) }

        let cirkewwa = CLLocation(latitude: 35.989, longitude: 14.329)
        let mgarr    = CLLocation(latitude: 36.025, longitude: 14.299)
        let terminal: Terminal = loc.distance(from: cirkewwa) <= loc.distance(from: mgarr) ? "cirkewwa" : "mgarr"

        let termLoc = terminal == "cirkewwa" ? cirkewwa : mgarr
        let distKm  = loc.distance(from: termLoc) / 1000.0
        let drive   = Int((distKm * 1.3 / 40.0 * 60.0).rounded())
        return (terminal, drive)
    }
}

// MARK: - Widget definition

struct NoNikolausWidget: Widget {
    let kind: String = "NoNikolausWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FerryTimelineProvider()) { entry in
            NoNikolausWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("No Nikolaus")
        .description("Shows the predicted ferry and drive time to the nearest terminal.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
            .accessoryCorner,
        ])
    }
}

struct NoNikolausWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: FerryEntry

    var body: some View {
        Group {
            switch family {
            case .accessoryCircular:
                CircularComplicationView(entry: entry)
            case .accessoryRectangular:
                RectangularComplicationView(entry: entry)
            case .accessoryInline:
                InlineComplicationView(entry: entry)
            case .accessoryCorner:
                CornerComplicationView(entry: entry)
            default:
                CircularComplicationView(entry: entry)
            }
        }
        .modifier(WidgetBackgroundModifier())
    }
}

// MARK: - Widget bundle entry point
@main
struct NoNikolausWidgetBundle: WidgetBundle {
    var body: some Widget {
        NoNikolausWidget()
    }
}
