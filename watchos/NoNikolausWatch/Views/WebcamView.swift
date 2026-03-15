import SwiftUI

private struct Camera: Identifiable {
    let id = UUID()
    let alias: String
    let name: String
}

private let cameras: [Terminal: [Camera]] = [
    "cirkewwa": [
        Camera(alias: "5ff3216215c7c", name: "Marshalling (Front)"),
        Camera(alias: "5ff327ab87fd7", name: "Marshalling (Side)"),
    ],
    "mgarr": [
        Camera(alias: "5975bfa3e7f2d", name: "Marshalling (Front)"),
        Camera(alias: "598d6542f2f4d", name: "Shore (Upper)"),
        Camera(alias: "6110f4b30ec0d", name: "Shore (Middle)"),
        Camera(alias: "5979b0b2141aa", name: "Shore (Lower)"),
        Camera(alias: "598d64ffc350e", name: "Mġarr Road"),
    ],
]

struct WebcamView: View {
    @EnvironmentObject var locationService: LocationService
    @State private var selectedAlias: String?

    private var terminal: Terminal { locationService.nearestTerminal }
    private var terminalCameras: [Camera] { cameras[terminal] ?? [] }
    private var terminalName: String { terminal == "cirkewwa" ? "Ċirkewwa" : "Mġarr" }

    var body: some View {
        Group {
            if let alias = selectedAlias,
               let cam = terminalCameras.first(where: { $0.alias == alias }) {
                fullScreenView(cam: cam, alias: alias)
            } else {
                listView
            }
        }
        .navigationTitle("Webcams")
    }

    // MARK: - List of cameras

    private var listView: some View {
        ScrollView {
            VStack(spacing: 8) {
                Text(terminalName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                ForEach(terminalCameras) { cam in
                    Button {
                        selectedAlias = cam.alias
                    } label: {
                        WebcamImageView(alias: cam.alias, cameraName: cam.name)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 4)
        }
    }

    // MARK: - Full-screen single camera

    private func fullScreenView(cam: Camera, alias: String) -> some View {
        VStack(spacing: 6) {
            WebcamImageView(alias: alias, cameraName: cam.name)
            Button("Back") {
                selectedAlias = nil
            }
            .font(.caption)
        }
    }
}
