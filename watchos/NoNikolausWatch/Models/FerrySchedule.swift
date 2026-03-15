import Foundation

struct FerrySchedule: Codable {
    let date: String
    let cirkewwa: [String]  // departure times "HH:MM"
    let mgarr: [String]

    /// Next departures from the given terminal after a given time string "HH:MM"
    func nextDepartures(from terminal: Terminal, after time: String, count: Int = 3) -> [String] {
        let times = terminal == "cirkewwa" ? cirkewwa : mgarr
        let future = times.filter { $0 > time }
        return Array(future.prefix(count))
    }
}
