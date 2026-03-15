import SwiftUI

@main
struct NoNikolausWatchApp: App {
    @StateObject private var apiService      = APIService()
    @StateObject private var locationService = LocationService()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(apiService)
                .environmentObject(locationService)
        }
    }
}
