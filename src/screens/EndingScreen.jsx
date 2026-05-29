import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { saveRecord } from '../logic/saveEngine'
import { getClearGrade } from '../logic/rewardEngine'
import { getGrade } from '../logic/creditEngine'
import { playBGM, playSFX } from '../logic/audioEngine'
import { generateEndingAnalysis } from '../logic/aiAdvisorEngine'
import { ADVISORS } from '../constants/advisors'
import { RIVALS } from '../constants/rivals'
import '../styles/ending.css'

export default function EndingScreen() {
  const gameState = useGameStore(state => state)
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const resetGame = useGameStore(state => state.resetGame)
  const [page, setPage] = useState(1)
  const [saved, setSaved] = useState(false)
  const [endingAnalysis, setEndingAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(true)

  useEffect(() => {
    playBGM('boom')
  }, [])

  useEffect(() => {
    generateEndingAnalysis(gameState, 'CLEAR').then(result => {
      setEndingAnalysis(result)
      setAnalysisLoading(false)
    })
  }, [gameState])

  const grade = gameState.clearGrade || getClearGrade(gameState)
  const gradeColors = { S: '#FFD700', A: '#00FF41', B: '#00AA00', C: '#DC143C' }
  const gradeColor = gradeColors[grade] || '#00FF41'
  const advisor = ADVISORS.find(item => item.id === gameState.selectedAdvisor)

  const endingMessages = {
    S: 'MONOPOL을 완전히 무너뜨렸다. 시장은 이제 자유롭다.',
    A: 'MONOPOL의 수장을 꺾었다. 독점의 시대가 끝났다.',
    B: '혜경을 물리쳤다. 하지만 MONOPOL의 잔당은 아직 남아있다.',
    C: '겨우 살아남았다. MONOPOL은 물러났지만 언제 돌아올지 모른다.',
  }

  const handleSaveRecord = async () => {
    if (saved || !gameState.playerId) return

    await saveRecord(gameState.playerId, {
      result_type: 'CLEAR',
      clear_grade: grade,
      advisor_id: gameState.selectedAdvisor,
      final_capital: gameState.capital,
      clear_floor: 120,
      playtime: gameState.stats.playtime,
      profit_turns: gameState.stats.profitTurns,
      loss_turns: gameState.stats.lossTurns,
      max_share: gameState.stats.maxShare,
      bankruptcy_count: gameState.stats.bankruptcyCount,
      external_events: gameState.stats.externalEventCount,
      event_success_rate: gameState.stats.eventTotalCount > 0
        ? gameState.stats.eventSuccessCount / gameState.stats.eventTotalCount
        : 0,
      rival_dominated: gameState.stats.rivalDominated,
      monopol_clears: gameState.metRivals || [],
    })
    setSaved(true)
  }

  return (
    <div className="cr2-ending-screen">
      <div className="cr2-page-indicator">
        {[1, 2, 3].map(item => (
          <span key={item} className={item === page ? 'cr2-dot-active' : 'cr2-dot'}>●</span>
        ))}
      </div>

      {page === 1 && (
        <div className="cr2-ending-page cr2-ending-intro">
          <div className="cr2-ending-main-title cr2-negative">MONOPOL 붕괴</div>

          <img
            src="/assets/logo_image-f7z3e97D.png"
            alt="엔딩"
            className="cr2-ending-main-img"
          />

          <div className="cr2-ending-grade" style={{ color: gradeColor }}>
            {grade} 등급 클리어!
          </div>

          <div className="cr2-ending-message">{endingMessages[grade]}</div>

          <div className="cr2-ending-advisor">
            <img
              src={advisor?.profileImage || '/assets/logo_image-f7z3e97D.png'}
              alt="어드바이저"
              className="cr2-ending-advisor-img"
            />
            <div>{getAdvisorName(gameState.selectedAdvisor)}와 함께</div>
          </div>

          <div className="cr2-ending-final-stats">
            <div>최종 자본: <span style={{ color: gradeColor }}>{(gameState.capital / 10000).toFixed(0)}만원</span></div>
            <div>신용등급: {getGrade(gameState.creditScore)}</div>
          </div>
        </div>
      )}

      {page === 2 && (
        <div className="cr2-ending-page cr2-scrollable">
          <div className="cr2-ending-page-title">📊 클리어 통계</div>

          <div className="cr2-ending-stats">
            <div className="cr2-stat-row"><span>플레이타임</span><span>{formatTime(gameState.stats.playtime)}</span></div>
            <div className="cr2-stat-row"><span>어드바이저</span><span>{getAdvisorName(gameState.selectedAdvisor)}</span></div>
            <div className="cr2-stat-row"><span>최종 자본</span><span style={{ color: gradeColor }}>{(gameState.capital / 10000).toFixed(0)}만원</span></div>
            <div className="cr2-stat-row"><span>최종 신용등급</span><span>{getGrade(gameState.creditScore)} ({gameState.creditScore}점)</span></div>
            <div className="cr2-stat-row"><span>최종 체력</span><span>{gameState.health} / {gameState.maxHealth}</span></div>
            <div className="cr2-stat-row"><span>총 흑자 턴</span><span className="cr2-positive">{gameState.stats.profitTurns}턴</span></div>
            <div className="cr2-stat-row"><span>총 적자 턴</span><span className="cr2-negative">{gameState.stats.lossTurns}턴</span></div>
            <div className="cr2-stat-row"><span>최고 점유율</span><span>{(gameState.stats.maxShare * 100).toFixed(1)}%</span></div>
            <div className="cr2-stat-row"><span>파산 위기</span><span>{gameState.stats.bankruptcyCount}회</span></div>
            <div className="cr2-stat-row"><span>MONOPOL 격파</span><span>{gameState.metRivals?.length || 0}명</span></div>
          </div>

          <div className="cr2-ending-rivals">
            <div className="cr2-ending-rivals-title">격파한 MONOPOL</div>
            <div className="cr2-ending-rivals-list">
              {(gameState.metRivals || []).map(rivalId => (
                <img
                  key={rivalId}
                  src={RIVALS.find(rival => rival.id === rivalId)?.profileImage || '/assets/logo_image-f7z3e97D.png'}
                  alt={rivalId}
                  className="cr2-ending-rival-sprite"
                />
              ))}
            </div>
          </div>

          {analysisLoading ? (
            <div style={{ color: 'var(--cr2-gray)', fontSize: '9px' }}>
              AI 분석 중...
            </div>
          ) : endingAnalysis ? (
            <div style={{
              padding: '12px',
              background: 'rgba(0,255,65,0.05)',
              border: '1px solid rgba(0,255,65,0.3)',
              fontSize: '10px',
              color: 'var(--cr2-white)',
              lineHeight: '1.8',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>
              <div style={{ color: 'var(--cr2-lime)', fontSize: '9px', marginBottom: '6px' }}>
                ✨ AI 경영 분석
              </div>
              {endingAnalysis}
            </div>
          ) : null}
        </div>
      )}

      {page === 3 && (
        <div className="cr2-ending-page">
          <div className="cr2-ending-page-title">💾 기록 저장</div>

          {!saved ? (
            <>
              <div className="cr2-ending-save-desc">이 클리어 기록을 저장하시겠습니까?</div>
              <button className="cr2-btn cr2-ending-save-btn" onClick={handleSaveRecord}>
                저장하기
              </button>
            </>
          ) : (
            <div className="cr2-positive">플레이 기록에 저장됐습니다.</div>
          )}

          <div className="cr2-ending-final-btns">
            <button
              className="cr2-btn"
              onClick={() => {
                playSFX('click')
                resetGame(gameState.selectedAdvisor, gameState.playerProfile, gameState.currentSlot)
                setCurrentScreen('advisorSelect')
              }}
            >
              새 게임
            </button>
            <button
              className="cr2-btn cr2-btn-ghost"
              onClick={() => {
                playSFX('click')
                setCurrentScreen('title')
              }}
            >
              타이틀로
            </button>
          </div>
        </div>
      )}

      <div className="cr2-page-nav">
        <button
          className="cr2-btn cr2-btn-ghost"
          onClick={() => setPage(current => Math.max(current - 1, 1))}
          disabled={page === 1}
        >
          ◀ 이전
        </button>
        <button
          className="cr2-btn cr2-btn-ghost"
          onClick={() => setPage(current => Math.min(current + 1, 3))}
          disabled={page === 3}
        >
          다음 ▶
        </button>
      </div>
    </div>
  )
}

function formatTime(seconds) {
  if (!seconds) return '00:00'
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function getAdvisorName(id) {
  const map = { raider: 'The Raider', guardian: 'The Guardian', analyst: 'The Analyst', gambler: 'The Gambler' }
  return map[id] || id
}
