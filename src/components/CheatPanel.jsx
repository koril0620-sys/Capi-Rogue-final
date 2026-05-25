import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { ACHIEVEMENTS } from '../constants/achievements'

export default function CheatPanel() {
  const [open, setOpen] = useState(false)
  const gameState = useGameStore(state => state)
  const setFloor = useGameStore(state => state.setFloor)

  if (!import.meta.env.DEV) return null

  const add = (key, amount) => {
    useGameStore.setState(prev => ({ [key]: (prev[key] || 0) + amount }))
  }

  return (
    <>
      <button
        className="cr2-dev-btn"
        onClick={() => setOpen(current => !current)}
        style={{
          position: 'absolute',
          bottom: 48,
          right: 8,
          background: '#333',
          color: '#0f0',
          border: '1px solid #0f0',
          fontFamily: 'monospace',
          fontSize: 10,
          padding: '2px 6px',
          zIndex: 9999,
        }}
      >
        DEV
      </button>

      {open && (
        <div
          className="cr2-dev-panel"
          style={{
            position: 'absolute',
            bottom: 80,
            right: 8,
            background: '#111',
            border: '1px solid #0f0',
            padding: 12,
            zIndex: 9999,
            width: 200,
            fontFamily: 'monospace',
            fontSize: 10,
            color: '#0f0',
          }}
        >
          <div style={{ marginBottom: 8 }}>🔧 DEV PANEL</div>

          <div>Floor</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button onClick={() => setFloor(Math.max(1, gameState.floor - 10))}>-10</button>
            <button onClick={() => setFloor(Math.min(120, gameState.floor + 10))}>+10</button>
            <button onClick={() => setFloor(120)}>→120</button>
          </div>

          <div>자본</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button onClick={() => add('capital', 10000000)}>+1천만</button>
            <button onClick={() => add('capital', 100000000)}>+1억</button>
          </div>

          <div>체력</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button onClick={() => useGameStore.setState({ health: gameState.maxHealth })}>만땅</button>
          </div>

          <div>신용점수</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button onClick={() => useGameStore.setState({ creditScore: 100 })}>100</button>
          </div>

          <div>국면</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {['boom', 'growth', 'stable', 'contraction', 'recession'].map(phase => (
              <button key={phase} onClick={() => useGameStore.setState({ econPhase: phase })}>
                {phase.slice(0, 3)}
              </button>
            ))}
          </div>

          <div>MONOPOL</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            <button
              onClick={() => useGameStore.setState({
                rivalCapital: Math.floor(gameState.rivalCapital * 0.5),
              })}
            >
              자본 -50%
            </button>
            <button
              onClick={() => useGameStore.setState({
                rivalCapital: -1,
                rivalConsecutiveLoss: 4,
              })}
            >
              즉시 파산
            </button>
          </div>

          <div>업적</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button
              onClick={() => {
                useGameStore.setState({
                  unlockedAchievements: ACHIEVEMENTS.map(achievement => achievement.id),
                })
              }}
            >
              전부 달성
            </button>
          </div>
        </div>
      )}
    </>
  )
}
