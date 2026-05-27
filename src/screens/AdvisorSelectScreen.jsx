import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { ADVISORS } from '../constants/advisors'
import { playSFX } from '../logic/audioEngine'

export default function AdvisorSelectScreen() {
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const setSelectedAdvisor = useGameStore(state => state.setSelectedAdvisor)
  const [selected, setSelected] = useState(null)

  const handleSelect = (advisorId) => {
    playSFX('click')
    setSelected(advisorId)
  }

  const handleConfirm = () => {
    if (!selected) return
    setSelectedAdvisor(selected)
    setCurrentScreen('characterCreate')
  }

  const selectedAdvisor = ADVISORS.find(advisor => advisor.id === selected)

  return (
    <div className="cr2-advisor-screen">
      <div className="cr2-advisor-title">당신의 어드바이저를 선택하세요</div>

      <div className="cr2-advisor-grid">
        {ADVISORS.map(advisor => (
          <div
            key={advisor.id}
            className={`cr2-advisor-card ${selected === advisor.id ? 'cr2-selected' : ''}`}
            style={{ borderColor: selected === advisor.id ? 'var(--cr2-lime)' : getAdvisorColor(advisor.id) }}
            onClick={() => handleSelect(advisor.id)}
          >
            <img
              src={advisor.profileImage}
              alt={advisor.name}
              className="cr2-advisor-img"
            />
            <div
              className="cr2-advisor-name"
              style={{ color: getAdvisorColor(advisor.id) }}
            >
              {advisor.name}
            </div>
            <div className="cr2-advisor-style">{advisor.style}</div>
            <div className="cr2-advisor-passive">{advisor.passive}</div>
          </div>
        ))}

        {selectedAdvisor && (
          <div className="cr2-advisor-detail">
            <img src={selectedAdvisor.profileImage} alt={selectedAdvisor.name} />
            <div
              className="cr2-advisor-detail-name"
              style={{ color: getAdvisorColor(selectedAdvisor.id) }}
            >
              {selectedAdvisor.name} {selectedAdvisor.style}
            </div>
            <div className="cr2-advisor-detail-desc">{selectedAdvisor.description}</div>

            <div className="cr2-advisor-detail-section cr2-buff">패시브</div>
            {selectedAdvisor.buffs.map(buff => (
              <div key={buff} className="cr2-advisor-detail-buff">✅ {buff}</div>
            ))}

            <div className="cr2-advisor-detail-section cr2-nerf">너프</div>
            {selectedAdvisor.nerfs.map(nerf => (
              <div key={nerf} className="cr2-advisor-detail-nerf">❌ {nerf}</div>
            ))}

            <div className="cr2-advisor-difficulty">
              난이도 {'★'.repeat(selectedAdvisor.difficulty)}{'☆'.repeat(5 - selectedAdvisor.difficulty)}
            </div>

            <button
              className="cr2-btn cr2-advisor-confirm-btn"
              onClick={handleConfirm}
            >
              이 어드바이저로 시작
            </button>
          </div>
        )}
      </div>

      <button
        className="cr2-btn cr2-back-btn"
        onClick={() => setCurrentScreen('title')}
      >
        이전으로
      </button>
    </div>
  )
}

function getAdvisorColor(id) {
  const colors = {
    raider: '#DC143C',
    guardian: '#00AA00',
    analyst: '#00FF41',
    gambler: '#FFD700',
  }
  return colors[id] || '#00FF41'
}
