// ios/MyRoutineRN/AlarmKitModule.swift
// Requires iOS 26+ SDK — compile only when targeting iOS 26+.
import Foundation
import React

#if canImport(AlarmKit)
import AlarmKit
#endif

// AlarmKit metadata payload — must be Codable.
struct AlarmLocalMetadata: Codable {}

@objc(IOSAlarmKitModule)
class IOSAlarmKitModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }

  // MARK: - isAvailable

  @objc
  func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 26.0, *) {
      resolve(true)
    } else {
      resolve(false)
    }
  }

  // MARK: - requestAuthorization

  @objc
  func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 26.0, *) else {
      reject("UNAVAILABLE", "AlarmKit requires iOS 26+", nil)
      return
    }
    #if canImport(AlarmKit)
    Task {
      do {
        let status = try await AlarmManager.shared.requestAuthorization()
        resolve(status == .authorized)
      } catch {
        reject("AUTH_ERROR", error.localizedDescription, error)
      }
    }
    #else
    reject("UNAVAILABLE", "AlarmKit not available in this SDK", nil)
    #endif
  }

  // MARK: - scheduleAlarm

  @objc
  func scheduleAlarm(_ config: NSDictionary,
                     resolver resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 26.0, *) else {
      reject("UNAVAILABLE", "AlarmKit requires iOS 26+", nil)
      return
    }
    guard
      let idString = config["id"] as? String,
      let hour = config["hour"] as? Int,
      let minute = config["minute"] as? Int,
      let label = config["label"] as? String
    else {
      reject("INVALID_CONFIG", "Missing required alarm fields", nil)
      return
    }

    let repeatDays = (config["repeatDays"] as? [Int]) ?? []

    #if canImport(AlarmKit)
    Task {
      do {
        let alarmId = UUID(uuidString: idString) ?? UUID()

        let schedule: AlarmSchedule
        if repeatDays.isEmpty {
          schedule = .fixed(DateComponents(hour: hour, minute: minute))
        } else {
          let weekdays: [Locale.Weekday] = repeatDays.compactMap { day in
            switch day {
            case 0: return .sunday
            case 1: return .monday
            case 2: return .tuesday
            case 3: return .wednesday
            case 4: return .thursday
            case 5: return .friday
            case 6: return .saturday
            default: return nil
            }
          }
          schedule = .repeating(
            DateComponents(hour: hour, minute: minute),
            on: weekdays
          )
        }

        let stopButton = AlarmPresentation.Alert.Button(
          title: "Detener",
          systemImageName: "stop.fill"
        )
        let snoozeButton = AlarmPresentation.Alert.Button(
          title: "Posponer",
          systemImageName: "moon.zzz.fill"
        )
        let alert = AlarmPresentation.Alert(
          title: label,
          stopButton: stopButton,
          snoozeButton: snoozeButton
        )
        let presentation = AlarmPresentation(alert: alert, tintColor: .orange)

        let configuration = AlarmConfiguration(
          schedule: schedule,
          presentation: presentation
        )

        try await AlarmManager.shared.schedule(id: alarmId, with: configuration)
        resolve(alarmId.uuidString)
      } catch {
        reject("SCHEDULE_ERROR", error.localizedDescription, error)
      }
    }
    #else
    reject("UNAVAILABLE", "AlarmKit not available in this SDK", nil)
    #endif
  }

  // MARK: - snoozeAlarm

  @objc
  func snoozeAlarm(_ alarmId: String,
                   minutes: Int,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 26.0, *) else { resolve(true); return }
    guard let uuid = UUID(uuidString: alarmId) else {
      reject("INVALID_ID", "Alarm id is not a valid UUID", nil)
      return
    }
    #if canImport(AlarmKit)
    Task {
      do {
        try? await AlarmManager.shared.cancel(id: uuid)

        let snoozeDate = Date().addingTimeInterval(TimeInterval(minutes * 60))
        let components = Calendar.current.dateComponents([.hour, .minute], from: snoozeDate)
        let hour = components.hour ?? 0
        let minute = components.minute ?? 0

        let schedule = AlarmSchedule.fixed(DateComponents(hour: hour, minute: minute))
        let stopButton = AlarmPresentation.Alert.Button(title: "Detener", systemImageName: "stop.fill")
        let snoozeButton = AlarmPresentation.Alert.Button(title: "Posponer", systemImageName: "moon.zzz.fill")
        let alert = AlarmPresentation.Alert(
          title: "Alarma pospuesta",
          stopButton: stopButton,
          snoozeButton: snoozeButton
        )
        let presentation = AlarmPresentation(alert: alert, tintColor: .orange)
        let configuration = AlarmConfiguration(schedule: schedule, presentation: presentation)
        try await AlarmManager.shared.schedule(id: uuid, with: configuration)
        resolve(true)
      } catch {
        reject("SNOOZE_ERROR", error.localizedDescription, error)
      }
    }
    #else
    resolve(true)
    #endif
  }

  // MARK: - cancelAlarm

  @objc
  func cancelAlarm(_ alarmId: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 26.0, *) else { resolve(true); return }
    guard let uuid = UUID(uuidString: alarmId) else {
      reject("INVALID_ID", "Alarm id is not a valid UUID", nil)
      return
    }
    #if canImport(AlarmKit)
    Task {
      do {
        try await AlarmManager.shared.cancel(id: uuid)
        resolve(true)
      } catch {
        reject("CANCEL_ERROR", error.localizedDescription, error)
      }
    }
    #else
    resolve(true)
    #endif
  }
}
