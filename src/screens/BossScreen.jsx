import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { checkBossClearCondition } from '../logic/monopolEngine'
import { playBGM, playSFX } from '../logic/audioEngine'
import '../styles/boss.css'

export default function BossScreen() {
  const gameState = useGameStore(s => s)
  const setCurrentScreen = useGameStore(s => s.setCurrentScreen)
  const bossCounterActive = useGameStore(s => s.bossCounterActive)
  const bossShareHistory = useGameStore(s => s.bossShareHistory)

  useEffect(() => {
    playBGM('boss')
    playSFX('boss')
  }, [])

  useEffect(() => {
    if (checkBossClearCondition(bossShareHistory)) {
      setCurrentScreen('ending')
    }
  }, [bossShareHistory, setCurrentScreen])

  const clearProgress = bossShareHistory.slice(-3).map(share => share < 0.5)
  while (clearProgress.length < 3) clearProgress.push(false)

  return (
    <div className="cr2-boss-screen">
      <div className="cr2-boss-intro">
        <div className="cr2-boss-title">FINAL BATTLE</div>

        <div className="cr2-boss-profile">
          <img
            src="/assets/rival_champion_hyegyeong-Cuy8B_O2.png"
            alt="혜경"
            className="cr2-boss-img"
          />
          <div className="cr2-boss-name">혜경</div>
          <div className="cr2-boss-company">HK International</div>
          <div className="cr2-boss-dialogue">
            &quot;시장은 내가 만든다.<br />
            네가 아무리 피해도 내가 흔들면 끝이다.&quot;
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
              {done ? '✓' : '·'}
            </div>
          ))}
        </div>

        <div className="cr2-boss-hint">
          현재 Floor {gameState.floor}. 같은 전략을 2턴 연속 쓰면 혜경이 카운터한다.
        </div>

        <button
          className="cr2-btn cr2-boss-start-btn"
          onClick={() => setCurrentScreen('main')}
        >
          전략 선택으로 이동
        </button>
      </div>

      {bossCounterActive && (
        <div className="cr2-boss-counter-warning cr2-negative cr2-blink">
          혜경이 반복 전략을 읽었다. 패턴을 바꿔야 한다.
        </div>
      )}
    </div>
  )
}
