import SwiftUI
import ImageIO

/// Loads and displays a single webcam snapshot with auto-refresh.
struct WebcamImageView: View {
    let alias: String
    let cameraName: String

    @State private var image: Image?
    @State private var isLoading = false
    @State private var refreshTask: Task<Void, Never>?

    var body: some View {
        VStack(spacing: 4) {
            Group {
                if let image {
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                } else if isLoading {
                    ProgressView()
                        .frame(height: 80)
                } else {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color.secondary.opacity(0.2))
                        .frame(height: 80)
                        .overlay {
                            Image(systemName: "video.slash")
                                .foregroundStyle(.secondary)
                        }
                }
            }
            Text(cameraName)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .task {
            await loadOnce()
            startAutoRefresh()
        }
        .onDisappear {
            refreshTask?.cancel()
        }
    }

    // MARK: - Private

    private func loadOnce() async {
        isLoading = true
        image = await fetchImage()
        isLoading = false
    }

    private func startAutoRefresh() {
        refreshTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 30_000_000_000)
                guard !Task.isCancelled else { break }
                if let fresh = await fetchImage() {
                    image = fresh
                }
            }
        }
    }

    private func fetchImage() async -> Image? {
        guard let data = await APIClient.fetchWebcamSnapshot(alias: alias) else { return nil }
        return cgImageFromData(data)
    }

    private func cgImageFromData(_ data: Data) -> Image? {
        guard
            let source   = CGImageSourceCreateWithData(data as CFData, nil),
            let cgImage  = CGImageSourceCreateImageAtIndex(source, 0, nil)
        else { return nil }
        return Image(decorative: cgImage, scale: 1.0, orientation: .up)
    }
}
