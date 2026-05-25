import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { initBossState, processBossTurn, judgeBossBattle } from '../logic/bossEngine'
import { playBGM, playSFX } from '../logic/audioEngine'
import '../styles/boss.css'

export default function BossScreen() {
  const gameState = useGameStore(state => state)
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const [bossState, setBossState] = useState(() => initBossState(useGameStore.getState().capital))
  const [phase, setPhase] = useState('intro')
  const [clearProgress, setClearProgress] = useState([false, false, false])
  const [counterWarning, setCounterWarning] = useState(false)

  useEffect(() => {
    playBGM('boss')
    playSFX('boss')
  }, [])

  const handleBattleStart = () => {
    setPhase('battle')
    setCurrentScreen('main')
  }

  const handleBossResult = (settlementResult) => {
    const bossShare = 1 - (settlementResult.shareAfter || 0)
    const newHistory = [...(gameState.bossShareHistory || []).slice(-2), bossShare]

    useGameStore.setState({ bossShareHistory: newHistory })

    const progress = newHistory.slice(-3).map(share => share < 0.5)
    setClearProgress(progress)

    const counter = bossState?.lastPlayerStrategy
      ? processBossTurn(bossState, gameState.currentStrategy, gameState.econPhase)
      : { counter: { isCounter: false } }

    if (counter.counter?.isCounter) {
      setCounterWarning(true)
      setTimeout(() => setCounterWarning(false), 3000)
    }

    setBossState(prev => ({
      ...prev,
      lastPlayerStrategy: gameState.currentStrategy,
      counterActive: counter.counter?.isCounter,
    }))

    const judgment = judgeBossBattle(newHistory, gameState.capital)
    if (judgment.isClear) {
      playSFX('clear')
      setCurrentScreen('ending')
    } else if (judgment.isGameOver) {
      setCurrentScreen('gameOver')
    }
  }

  if (phase === 'intro') {
    return (
      <div className="cr2-boss-screen">
        <div className="cr2-boss-intro">
          <div className="cr2-boss-title">FINAL BATTLE</div>

          <div className="cr2-boss-profile">
            <img
              src="/assets/images/rivals/hyekyung.png"
              alt="혜경"
              className="cr2-boss-img"
            />
            <div className="cr2-boss-name">혜경</div>
            <div className="cr2-boss-company">HK International</div>
            <div className="cr2-boss-dialogue">
              &quot;시장은 내가 만드는 거야.<br />
              네가 아무리 잘해도 내가 흔들면 끝이야.&quot;
            </div>
          </div>

          <div className="cr2-boss-condition">
            <div className="cr2-boss-condition-title">클리어 조건</div>
            <div>3턴 연속으로 혜경 점유율을 50% 이하로 유지</div>
          </div>

          <div className="cr2-boss-progress">
            {clearProgress.map((done, index) => (
              <div
                key={`boss-progress-${index}`}
                className={`cr2-boss-progress-dot ${done ? 'cr2-boss-dot-done' : ''}`}
              >
                {done ? '●' : '○'}
              </div>
            ))}
          </div>

          <div className="cr2-boss-hint">
            💡 같은 전략을 2턴 연속 쓰면 혜경이 카운터한다.
          </div>

          <button
            className="cr2-btn cr2-boss-start-btn"
            onClick={handleBattleStart}
          >
            전략 선택으로 →
          </button>
        </div>

        {counterWarning && (
          <div className="cr2-boss-counter-warning cr2-negative cr2-blink">
            ⚠️ 혜경이 당신의 전략을 읽었다. 패턴을 바꿔라.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="cr2-boss-screen">
      <button
        className="cr2-btn cr2-boss-start-btn"
        onClick={() => handleBossResult({ shareAfter: gameState.playerShareHistory?.at(-1) || 0 })}
      >
        보스 판정
      </button>
    </div>
  )
}
