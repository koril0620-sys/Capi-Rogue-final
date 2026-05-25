import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { loadSaveSlots } from '../logic/saveEngine'
import { playSFX } from '../logic/audioEngine'

export default function SlotSelectScreen() {
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const setCurrentSlot = useGameStore(state => state.setCurrentSlot)
  const playerId = useGameStore(state => state.playerId)
  const [slots, setSlots] = useState([])
  const [confirmSlot, setConfirmSlot] = useState(null)
  const [loading, setLoading] = useState(Boolean(playerId))

  useEffect(() => {
    if (!playerId) return undefined

    let ignore = false

    loadSaveSlots(playerId).then(data => {
      if (!ignore) {
        setSlots(data)
        setLoading(false)
      }
    })

    return () => {
      ignore = true
    }
  }, [playerId])

  const getSlotData = slotNumber =>
    slots.find(slot => slot.slot_number === slotNumber)

  const handleSlotClick = (slotNumber) => {
    playSFX('click')
    const slotData = getSlotData(slotNumber)
    if (slotData) {
      setConfirmSlot(slotNumber)
    } else {
      selectSlot(slotNumber)
    }
  }

  const selectSlot = (slotNumber) => {
    setCurrentSlot(slotNumber)
    setCurrentScreen('main')
  }

  const handleConfirmOverwrite = () => {
    selectSlot(confirmSlot)
    setConfirmSlot(null)
  }

  if (loading) {
    return (
      <div className="cr2-slot-screen">
        <div className="cr2-loading">불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="cr2-slot-screen">
      <div className="cr2-slot-title">저장 슬롯을 선택하세요</div>

      <div className="cr2-slot-list">
        {[1, 2, 3, 4, 5].map(slotNumber => {
          const slotData = getSlotData(slotNumber)
          const gameState = slotData?.game_state_json

          return (
            <div
              key={slotNumber}
              className={`cr2-slot-item ${slotData ? 'cr2-slot-saved' : 'cr2-slot-empty'}`}
              onClick={() => handleSlotClick(slotNumber)}
            >
              <div className="cr2-slot-number">슬롯 {slotNumber}</div>
              {slotData ? (
                <div className="cr2-slot-info">
                  <div className="cr2-slot-company">{gameState?.playerProfile?.company || '???'}</div>
                  <div className="cr2-slot-floor">Floor {gameState?.floor || '?'} / 120</div>
                  <div className="cr2-slot-capital">
                    {gameState?.capital ? `${Math.floor(gameState.capital / 10000)}만원` : '???'}
                  </div>
                  <div className="cr2-slot-date">
                    {new Date(slotData.updated_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              ) : (
                <div className="cr2-slot-empty-label">비어있음</div>
              )}
            </div>
          )
        })}
      </div>

      {confirmSlot && (
        <div className="cr2-slot-confirm-overlay">
          <div className="cr2-slot-confirm-box">
            <div className="cr2-slot-confirm-title">⚠️ 덮어쓰기</div>
            <div className="cr2-slot-confirm-text">
              슬롯 {confirmSlot}에 저장된 데이터가 있습니다.<br />
              덮어쓸까요?
            </div>
            <div className="cr2-slot-confirm-btns">
              <button className="cr2-btn cr2-btn-danger" onClick={handleConfirmOverwrite}>
                덮어쓰기
              </button>
              <button className="cr2-btn" onClick={() => setConfirmSlot(null)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        className="cr2-btn cr2-back-btn"
        onClick={() => setCurrentScreen('advisorSelect')}
      >
        뒤로가기
      </button>
    </div>
  )
}
