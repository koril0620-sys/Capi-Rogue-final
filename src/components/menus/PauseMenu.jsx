import { useGameStore } from '../../store/useGameStore'
import { saveOnFloorEnter } from '../../logic/saveEngine'
import { signOut } from '../../logic/authEngine'
import { playSFX } from '../../logic/audioEngine'

export default function PauseMenu() {
  const gameState = useGameStore(s => s)
  const setCurrentScreen = useGameStore(s => s.setCurrentScreen)
  const setIsPaused = useGameStore(s => s.setIsPaused)

  const handleResume = () => {
    playSFX('click')
    setIsPaused(false)
  }

  const handleSaveAndQuit = async () => {
    playSFX('click')
    await saveOnFloorEnter(gameState)
    setIsPaused(false)
    setCurrentScreen('title')
  }

  const handleLogout = async () => {
    playSFX('click')
    await saveOnFloorEnter(gameState)
    await signOut()
    setIsPaused(false)
    setCurrentScreen('login')
  }

  const menuItems = [
    {
      label: '▶ 게임 설정',
      onClick: () => setCurrentScreen('settings'),
    },
    {
      label: '플레이 기록',
      onClick: () => setCurrentScreen('playRecord'),
    },
    {
      label: '업적',
      onClick: () => setCurrentScreen('achievement'),
    },
    {
      label: '경제 용어 사전',
      onClick: () => setCurrentScreen('dictionary'),
    },
    {
      label: '어드바이저 정보',
      onClick: () => setCurrentScreen('advisorInfo'),
    },
    {
      label: '라이벌 도감',
      onClick: () => setCurrentScreen('rivalDex'),
    },
  ]

  return (
    <div className="cr2-pause-overlay">
      <div className="cr2-pause-menu">
        <div className="cr2-pause-title">CapiRogue</div>
        <div className="cr2-pause-floor">Floor {gameState.floor} / 120</div>

        <div className="cr2-pause-divider" />

        {menuItems.map(item => (
          <button
            key={item.label}
            className="cr2-pause-item"
            onClick={() => {
              item.onClick()
              playSFX('click')
            }}
          >
            {item.label}
          </button>
        ))}

        <div className="cr2-pause-divider" />

        <button className="cr2-pause-item cr2-pause-danger" onClick={handleSaveAndQuit}>
          저장 후 나가기
        </button>
        <button className="cr2-pause-item cr2-pause-ghost" onClick={handleLogout}>
          로그아웃
        </button>

        <button className="cr2-btn cr2-pause-resume-btn" onClick={handleResume}>
          계속하기
        </button>
      </div>
    </div>
  )
}
