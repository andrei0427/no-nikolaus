import SwiftUI
import WidgetKit

// MARK: - Timeline entry

struct FerryEntry: TimelineEntry {
    let date: Date
    let ferryName: String?
    let driveTimeMinutes: Int?
    let departureTime: String?
    let colorCategory: ComplicationColor
    let terminal: Terminal
}

// MARK: - Color helpers

extension FerryEntry {
    var tintColor: Color {
        switch colorCategory {
        case .green: return .green
        case .red:   return Color(red: 1.0, green: 0.4, blue: 0.0) // orange-red
        case .gray:  return .gray
        }
    }

    var driveLabel: String {
        if let mins = driveTimeMinutes { return "\(mins)m" }
        if let dept = departureTime { return dept }
        return "--"
    }

    var ferryLabel: String {
        ferryName ?? "—"
    }

    var terminalLabel: String {
        terminal == "cirkewwa" ? "ĊKW" : "MGR"
    }

    /// Last word of the ferry name ("MV Malita" → "Malita"), truncated to 6 chars
    var ferryShortLabel: String {
        guard let name = ferryName else { return "—" }
        let last = name.split(separator: " ").last.map(String.init) ?? name
        return last.count > 6 ? String(last.prefix(6)) : last
    }
}

// MARK: - Complication views

// accessoryCircular: color ring + drive time + ferry name
struct CircularComplicationView: View {
    let entry: FerryEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            Circle()
                .stroke(entry.tintColor, lineWidth: 3)
                .padding(2)
            VStack(spacing: 0) {
                Text(entry.driveLabel)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.7)
                Text(entry.ferryShortLabel)
                    .font(.system(size: 8))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
    }
}

// accessoryRectangular: ferry name + drive time + color dot
struct RectangularComplicationView: View {
    let entry: FerryEntry

    var body: some View {
        HStack(alignment: .center, spacing: 6) {
            Circle()
                .fill(entry.tintColor)
                .frame(width: 10, height: 10)
            VStack(alignment: .leading, spacing: 1) {
                Text(entry.ferryLabel)
                    .font(.headline)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                HStack(spacing: 4) {
                    if let dept = entry.departureTime {
                        Text("~\(dept)")
                            .font(.caption2.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }
                    Text("·")
                        .foregroundStyle(.secondary)
                    Text(entry.driveLabel)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
        }
    }
}

// accessoryInline: "MV Malita · 12 min"
struct InlineComplicationView: View {
    let entry: FerryEntry

    var body: some View {
        if entry.ferryName != nil {
            Text("\(entry.ferryLabel) · \(entry.driveLabel)")
        } else {
            Text("No ferry data")
        }
    }
}

// accessoryCorner: drive time + ferry name
struct CornerComplicationView: View {
    let entry: FerryEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 1) {
                Text(entry.driveLabel)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(entry.tintColor)
                    .minimumScaleFactor(0.7)
                Text(entry.ferryShortLabel)
                    .font(.system(size: 8))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
    }
}
