import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { playBGM } from '../logic/audioEngine'
import '../styles/title.css'

export default function TitleScreen() {
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const playerId = useGameStore(state => state.playerId)
  const [showIntro, setShowIntro] = useState(false)
  const [introStep, setIntroStep] = useState(0)

  const introTexts = [
    '거대 독점 기업 집단\nMONOPOL이\n시장을 장악하고 있다.',
    '그들은 경쟁자를 파산시키고\n소비자를 착취한다.',
    '당신은 작은 회사의 CEO.\nMONOPOL에 맞서 싸워라.',
  ]

  useEffect(() => {
    playBGM('main')
  }, [])

  const handleNewGame = () => setShowIntro(true)

  const handleIntroNext = () => {
    if (introStep < introTexts.length - 1) {
      setIntroStep(prev => prev + 1)
    } else {
      setShowIntro(false)
      setCurrentScreen('characterCreate')
    }
  }

  const handleIntroSkip = () => {
    setShowIntro(false)
    setCurrentScreen('characterCreate')
  }

  return (
    <div className="cr2-title-screen">
      <div className="cr2-title-bg" />

      <div className="cr2-title-logo">CapiRogue</div>
      <div className="cr2-title-version">v1.0.0</div>
      <div className="cr2-title-tagline">시장을 지배하라</div>

      <div className="cr2-title-menu">
        <button
          className="cr2-title-menu-item"
          onClick={handleNewGame}
        >
          &gt; 새 게임
        </button>
        {playerId && (
          <button
            className="cr2-title-menu-item"
            onClick={() => setCurrentScreen('slotSelect')}
          >
            &gt; 계속하기
          </button>
        )}
        <button
          className="cr2-title-menu-item"
          onClick={() => setCurrentScreen('playRecord')}
        >
          &gt; 플레이 기록
        </button>
        <button
          className="cr2-title-menu-item"
          onClick={() => setCurrentScreen('settings')}
        >
          &gt; 설정
        </button>
      </div>

      {!playerId && (
        <div className="cr2-title-guest">게스트 모드</div>
      )}

      {showIntro && (
        <div className="cr2-title-intro-overlay">
          <div className="cr2-title-intro-box">
            <div className="cr2-title-intro-text">
              {introTexts[introStep].split('\n').map(line => (
                <div key={line}>{line}</div>
              ))}
            </div>
            <div className="cr2-title-intro-indicator">
              {introTexts.map((text, index) => (
                <span key={text} className={index === introStep ? 'cr2-dot-active' : 'cr2-dot'}>
                  ●
                </span>
              ))}
            </div>
            <div className="cr2-title-intro-btns">
              <button className="cr2-btn" onClick={handleIntroNext}>
                {introStep < introTexts.length - 1 ? '다음' : '시작'}
              </button>
              <button className="cr2-btn cr2-btn-ghost" onClick={handleIntroSkip}>
                스킵
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
