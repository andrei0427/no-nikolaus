import SwiftUI

struct ContentView: View {
    @EnvironmentObject var apiService: APIService
    @EnvironmentObject var locationService: LocationService

    var body: some View {
        TabView {
            TerminalDetailView()
            WebcamView()
        }
        .task {
            locationService.requestPermission()
            locationService.startUpdating()
            await apiService.refresh()
        }
    }
}
