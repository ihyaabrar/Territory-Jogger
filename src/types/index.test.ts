/**
 * Smoke tests untuk memverifikasi TypeScript interface inti terdefinisi dengan benar.
 * Feature: territory-jogger
 */
import { describe, it, expect } from 'vitest'
import type {
  Coordinate,
  TrackData,
  Territory,
  PrivacyZone,
  RunSession,
  UserProfile,
  LeaderboardEntry,
  LoopDetectionResult,
  InvasionNotification,
  LeaderboardLevel,
} from './index'

describe('Core TypeScript Interfaces', () => {
  it('Coordinate interface memiliki semua field yang diperlukan', () => {
    const coord: Coordinate = {
      lat: -6.2088,
      lng: 106.8456,
      timestamp: Date.now(),
      accuracy: 5,
      speed: 2.5,
    }
    expect(coord.lat).toBe(-6.2088)
    expect(coord.lng).toBe(106.8456)
    expect(typeof coord.timestamp).toBe('number')
    expect(coord.accuracy).toBe(5)
    expect(coord.speed).toBe(2.5)
  })

  it('TrackData interface memiliki semua field yang diperlukan', () => {
    const track: TrackData = {
      coordinates: [],
      startTime: Date.now(),
      endTime: Date.now() + 3600000,
      totalDistance: 5.2,
    }
    expect(Array.isArray(track.coordinates)).toBe(true)
    expect(track.totalDistance).toBe(5.2)
  })

  it('Territory interface memiliki semua field yang diperlukan', () => {
    const territory: Territory = {
      id: 'uuid-1',
      userId: 'user-uuid-1',
      userColor: '#FF5733',
      username: 'runner01',
      geom: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[106.8, -6.2], [106.9, -6.2], [106.9, -6.3], [106.8, -6.3], [106.8, -6.2]]],
        },
        properties: {},
      },
      areaKm2: 1.23,
      updatedAt: new Date().toISOString(),
    }
    expect(territory.userColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(territory.areaKm2).toBeGreaterThan(0)
  })

  it('PrivacyZone interface memiliki center dan radiusM', () => {
    const zone: PrivacyZone = {
      id: 'zone-uuid-1',
      center: [106.8456, -6.2088],
      radiusM: 200,
    }
    expect(zone.center).toHaveLength(2)
    expect(zone.radiusM).toBeGreaterThanOrEqual(50)
    expect(zone.radiusM).toBeLessThanOrEqual(500)
  })

  it('RunSession interface memiliki semua field yang diperlukan', () => {
    const session: RunSession = {
      id: 'session-uuid-1',
      track: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[106.8, -6.2], [106.81, -6.21]],
        },
        properties: {},
      },
      distanceKm: 3.5,
      durationSec: 1800,
      startedAt: new Date().toISOString(),
    }
    expect(session.distanceKm).toBe(3.5)
    expect(session.durationSec).toBe(1800)
    expect(session.endedAt).toBeUndefined()
  })

  it('UserProfile interface memiliki semua field yang diperlukan', () => {
    const profile: UserProfile = {
      id: 'user-uuid-1',
      username: 'runner01',
      userColor: '#3498DB',
      lastActive: new Date().toISOString(),
    }
    expect(profile.username).toBe('runner01')
    expect(profile.userColor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    expect(profile.avatarUrl).toBeUndefined()
  })

  it('LeaderboardEntry interface memiliki semua field yang diperlukan', () => {
    const entry: LeaderboardEntry = {
      rank: 1,
      userId: 'user-uuid-1',
      username: 'runner01',
      avatarUrl: 'https://example.com/avatar.png',
      userColor: '#E74C3C',
      totalAreaKm2: 12.5,
    }
    expect(entry.rank).toBe(1)
    expect(entry.totalAreaKm2).toBeGreaterThan(0)
  })

  it('LoopDetectionResult interface memiliki semua field yang diperlukan', () => {
    const result: LoopDetectionResult = {
      intersectionPoint: [106.8456, -6.2088],
      loopStartIndex: 5,
      loopEndIndex: 20,
    }
    expect(result.loopStartIndex).toBeLessThan(result.loopEndIndex)
  })

  it('InvasionNotification interface memiliki semua field yang diperlukan', () => {
    const notif: InvasionNotification = {
      id: 'notif-uuid-1',
      victimId: 'user-uuid-2',
      attackerId: 'user-uuid-1',
      attackerUsername: 'runner01',
      areaLostKm2: 0.5,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    expect(notif.isRead).toBe(false)
    expect(notif.areaLostKm2).toBeGreaterThan(0)
  })

  it('LeaderboardLevel type hanya menerima nilai yang valid', () => {
    const levels: LeaderboardLevel[] = ['kelurahan', 'kecamatan', 'kota']
    expect(levels).toHaveLength(3)
    expect(levels).toContain('kelurahan')
    expect(levels).toContain('kecamatan')
    expect(levels).toContain('kota')
  })
})
