/**
 * LeaderboardPage — Behance Running App Style
 * Activities Analyze screen
 * Fix: query regions from Supabase leaderboard_cache instead of hardcoded IDs
 */

import { useState, useEffect, useCallback } from 'react'
import { AVAILABLE_AVATARS } from '../profile/ProfileSettings'
import { startLeaderboardPolling } from '../../services/leaderboardService'
import { supabase } from '../../lib/supabase'
import type { LeaderboardEntry, LeaderboardLevel } from '../../types'

interface LeaderboardPageProps {
  userId: string | null
  regionIds?: Partial<Record<LeaderboardLevel, string>>
}

const TABS: { level: LeaderboardLevel; label: string }[] = [
  { level: 'kelurahan', label: 'Kelurahan' },
  { level: 'kecamatan', label: 'Kecamatan' },
  { level: 'kota', label: 'Kota' },
]

interface RegionOption { id: string; name: string }

function resolveEmoji(avatarUrl: string): string {
  const found = AVAILABLE_AVATARS.find(a => a.id === avatarUrl)
  return found?.emoji ?? '🏃'
}

function RankBadge({ rank }: { rank: number }) {
  // Medal SVG untuk top 3
  if (rank === 1) return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="#FFF3CD" stroke="#F0C040" strokeWidth="1.5"/>
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="900" fill="#B8860B" fontFamily="Inter,sans-serif">1</text>
    </svg>
  )
  if (rank === 2) return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="#F0F0F0" stroke="#AAAAAA" strokeWidth="1.5"/>
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="900" fill="#666" fontFamily="Inter,sans-serif">2</text>
    </svg>
  )
  if (rank === 3) return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" fill="#FDE8D8" stroke="#CD7F32" strokeWidth="1.5"/>
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="900" fill="#8B4513" fontFamily="Inter,sans-serif">3</text>
    </svg>
  )
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#AAA' }}>{rank}</span>
    </div>
  )
}

function EntryRow({ entry, isMe }: { entry: LeaderboardEntry; isMe: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      background: isMe ? '#FDECEA' : '#fff',
      borderRadius: 16,
      border: isMe ? '1.5px solid #F5B7B1' : '1px solid #F5F5F5',
      boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
    }}>
      <RankBadge rank={entry.rank} />

      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: `${entry.userColor}20`,
        border: `2px solid ${entry.userColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {resolveEmoji(entry.avatarUrl)}
      </div>

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.username}
          </p>
          {isMe && (
            <span style={{ fontSize: 9, fontWeight: 700, color: '#C0392B', background: '#FDECEA', border: '1px solid #F5B7B1', padding: '1px 6px', borderRadius: 99, flexShrink: 0 }}>
              KAMU
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.userColor }} />
          <p style={{ fontSize: 10, color: '#AAA', margin: 0, fontFamily: 'monospace' }}>{entry.userColor}</p>
        </div>
      </div>

      {/* Area */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 18, fontWeight: 900, color: isMe ? '#C0392B' : '#1A1A1A', margin: 0, letterSpacing: '-0.02em' }}>
          {entry.totalAreaKm2.toFixed(2)}
        </p>
        <p style={{ fontSize: 10, color: '#AAA', margin: 0, fontWeight: 600 }}>km²</p>
      </div>
    </div>
  )
}

export function LeaderboardPage({ userId, regionIds = {} }: LeaderboardPageProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardLevel>('kelurahan')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRegionIds, setSelectedRegionIds] = useState<Partial<Record<LeaderboardLevel, string>>>(regionIds)
  // Regions fetched from leaderboard_cache in DB
  const [availableRegions, setAvailableRegions] = useState<Record<LeaderboardLevel, RegionOption[]>>({
    kelurahan: [], kecamatan: [], kota: [],
  })
  const [regionsLoading, setRegionsLoading] = useState(true)

  // Fetch distinct regions from leaderboard_cache
  useEffect(() => {
    async function loadRegions() {
      setRegionsLoading(true)
      try {
        const { data, error: err } = await supabase
          .from('leaderboard_cache')
          .select('region_id, region_level, region_name')
          .order('region_name', { ascending: true })

        if (err || !data) {
          // Fallback: show empty state with helpful message
          setRegionsLoading(false)
          return
        }

        const grouped: Record<LeaderboardLevel, RegionOption[]> = {
          kelurahan: [], kecamatan: [], kota: [],
        }
        const seen = new Set<string>()
        for (const row of data as { region_id: string; region_level: string; region_name: string }[]) {
          const key = `${row.region_level}:${row.region_id}`
          if (!seen.has(key) && (row.region_level === 'kelurahan' || row.region_level === 'kecamatan' || row.region_level === 'kota')) {
            seen.add(key)
            grouped[row.region_level as LeaderboardLevel].push({ id: row.region_id, name: row.region_name })
          }
        }
        setAvailableRegions(grouped)
      } finally {
        setRegionsLoading(false)
      }
    }
    void loadRegions()
  }, [])

  const regionId = selectedRegionIds[activeTab]
  const myRank = entries.find(e => e.userId === userId)?.rank

  const handleData = useCallback((data: LeaderboardEntry[]) => { setEntries(data); setLoading(false); setError(null) }, [])
  const handleError = useCallback((err: Error) => { setError(err.message); setLoading(false) }, [])

  useEffect(() => {
    if (!regionId) { setEntries([]); setLoading(false); return }
    setLoading(true); setError(null); setEntries([])
    return startLeaderboardPolling(activeTab, regionId, handleData, handleError)
  }, [activeTab, regionId, handleData, handleError])

  const currentRegions = availableRegions[activeTab]

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100%', paddingBottom: 16 }}>

      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 20px 14px', borderBottom: '1px solid #F5F5F5' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: '#AAA', margin: '0 0 2px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Activities Analyze</p>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0, letterSpacing: '-0.02em' }}>Peringkat</h1>
          </div>
          {myRank && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 10, color: '#AAA', margin: '0 0 2px', fontWeight: 600 }}>Peringkat Kamu</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#C0392B', margin: 0, letterSpacing: '-0.03em' }}>#{myRank}</p>
            </div>
          )}
        </div>
      </div>

      {/* Level tabs */}
      <div style={{ background: '#fff', padding: '0 20px 14px', borderBottom: '1px solid #F5F5F5', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #F0F0F0' }}>
          {TABS.map(({ level, label }) => (
            <button key={level} type="button" onClick={() => setActiveTab(level)}
              style={{
                flex: 1, padding: '10px 4px',
                border: 'none', background: 'transparent',
                fontSize: 13, fontWeight: activeTab === level ? 700 : 500,
                color: activeTab === level ? '#C0392B' : '#AAA',
                cursor: 'pointer',
                borderBottom: activeTab === level ? '2px solid #C0392B' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Region selector */}
      <div style={{ padding: '0 16px', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          Pilih {activeTab}
        </p>
        {regionsLoading ? (
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 32, width: 80, background: '#F5F5F5', borderRadius: 99, opacity: 1 - i * 0.2 }} />
            ))}
          </div>
        ) : currentRegions.length === 0 ? (
          <p style={{ fontSize: 12, color: '#AAA', margin: 0 }}>
            Belum ada data wilayah. Mulai berlari untuk mengisi leaderboard!
          </p>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currentRegions.map(r => {
              const isSelected = selectedRegionIds[activeTab] === r.id
              return (
                <button key={r.id} type="button"
                  onClick={() => setSelectedRegionIds(prev => ({ ...prev, [activeTab]: r.id }))}
                  style={{
                    padding: '7px 14px', borderRadius: 99,
                    background: isSelected ? '#C0392B' : '#fff',
                    border: isSelected ? 'none' : '1px solid #F0F0F0',
                    color: isSelected ? '#fff' : '#555',
                    fontSize: 12, fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 8px rgba(192,57,43,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
                  }}>
                  {r.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '0 16px' }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 68, background: '#fff', borderRadius: 16, border: '1px solid #F5F5F5', opacity: 1 - i * 0.15 }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div style={{ padding: '16px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 16, color: '#C0392B', fontSize: 13, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {!loading && !error && !regionId && !regionsLoading && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M7 3H17V12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12V3Z" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 6H4.5C4.5 6 3 6.5 3 8.5C3 10.5 5 11.5 7 11" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 6H19.5C19.5 6 21 6.5 21 8.5C21 10.5 19 11.5 17 11" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 17V20M9 20H15" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: '0 0 6px' }}>
              {currentRegions.length > 0 ? 'Pilih wilayah di atas' : 'Belum ada data wilayah'}
            </p>
            <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>
              {currentRegions.length > 0
                ? 'untuk melihat peringkat di area kamu'
                : 'Klaim wilayah pertamamu untuk muncul di sini!'}
            </p>
          </div>
        )}

        {!loading && !error && regionId && entries.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M3 6L9 4L15 7L21 5V19L15 21L9 18L3 20V6Z" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', margin: '0 0 6px' }}>Belum ada data</p>
            <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>Jadilah yang pertama klaim wilayah!</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map(entry => (
              <EntryRow key={entry.userId} entry={entry} isMe={userId !== null && entry.userId === userId} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
