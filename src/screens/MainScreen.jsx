import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import { settle } from '../logic/settlementEngine'
import { rollExternalEvent, rollInternalEvent } from '../logic/eventEngine'
import { getRivalInitialCapital } from '../logic/monopolEngine'
import { getCurrentStage, isNewStage } from '../constants/monopol'
import { getLearningGoal } from '../constants/learningGoals'
import { saveAchievements } from '../logic/achievementEngine'
import { playSFX, playBGM } from '../logic/audioEngine'
import RightPanel from '../components/RightPanel'
import RivalCapitalBar from '../components/RivalCapitalBar'
import CheatPanel from '../components/CheatPanel'
import '../styles/main.css'

export default function MainScreen() {
  const gameState = useGameStore(state => state)
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const setRivalState = useGameStore(state => state.setRivalState)

  const [stagePopup, setStagePopup] = useState(null)
  const [learningPopup, setLearningPopup] = useState(null)
  const [activePanelTab, setActivePanelTab] = useState('sale')
  const prevFloorRef = useRef(gameState.floor)

  useEffect(() => {
    const prevFloor = prevFloorRef.current
    const currentFloor = gameState.floor

    if (currentFloor === prevFloor) return

    prevFloorRef.current = currentFloor

    queueMicrotask(() => {
      if (isNewStage(prevFloor, currentFloor)) {
        const nextStage = getCurrentStage(currentFloor)
        if (nextStage) {
          const rivalCapital = getRivalInitialCapital(currentFloor, gameState.capital)
          setRivalState({
            rivalCapital,
            rivalInitialCapital: rivalCapital,
            rivalConsecutiveLoss: 0,
            rivalBankrupt: false,
            stageTurn: 1,
            currentStageId: nextStage.id,
          })

          setStagePopup({
            rivalName: nextStage.rivalName,
            company: nextStage.company,
            message: nextStage.entryMessage,
            hint: nextStage.hint,
            tier: nextStage.tier,
          })
          playSFX('rival')
        }
      }

      const goal = getLearningGoal(currentFloor)
      const hideGoal = localStorage.getItem('cr2_hide_goal')
      if (goal && !hideGoal && gameState.isTutorialEnabled) {
        setLearningPopup(goal)
      }

      playBGM(gameState.econPhase)
    })
  }, [
    gameState.capital,
    gameState.econPhase,
    gameState.floor,
    gameState.isTutorialEnabled,
    setRivalState,
  ])

  const handleSettle = async () => {
    playSFX('nextfloor')

    const externalEvent = rollExternalEvent(gameState.floor, gameState.activeEffects)
    const internalEvent = rollInternalEvent(gameState)

    if (externalEvent || internalEvent) {
      useGameStore.setState({
        currentExternalEvent: externalEvent,
        currentInternalEvent: internalEvent,
      })
      setCurrentScreen('event')
      return
    }

    const { updatedState, settlementResult } = settle(gameState)

    useGameStore.setState({
      ...updatedState,
      lastSettlementResult: settlementResult,
      playerShareHistory: [
        ...(gameState.playerShareHistory || []),
        settlementResult.shareAfter,
      ],
    })

    if (settlementResult.newlyUnlocked?.length > 0 && gameState.playerId) {
      await saveAchievements(gameState.playerId, settlementResult.newlyUnlocked)
      useGameStore.setState({ newAchievements: settlementResult.newlyUnlocked })
    }

    if (settlementResult.isGameOver) {
      setCurrentScreen('gameOver')
      return
    }

    if (settlementResult.bossClear) {
      setCurrentScreen('ending')
      return
    }

    if (settlementResult.rivalBankrupt) {
      playSFX('clear')
    }

    setCurrentScreen('result')
  }

  const background = getBackground(gameState.econPhase)
  const stage = getCurrentStage(gameState.floor)

  return (
    <div className="cr2-main-screen">
      <div
        className="cr2-main-bg"
        style={{ backgroundImage: `url(${background})` }}
      />

      <div className="cr2-main-left">
        <div className="cr2-main-overlay-top">
          <span>{gameState.floor}/120</span>
          <span>{phaseLabel(gameState.econPhase)}</span>
          <span>보상: {getRewardLabel(gameState.floor)}</span>
          {gameState.currentExternalEvent && (
            <span className="cr2-event-label">
              {gameState.currentExternalEvent.title}
            </span>
          )}
        </div>

        <div className="cr2-demand-area">
          <div className="cr2-demand-bubble">
            <div className="cr2-demand-label">수요</div>
            <div className="cr2-demand-value">
              {(10000 * getDemandMultiplier(gameState.econPhase)).toLocaleString()}
            </div>
            <button className="cr2-tooltip-btn">?</button>
          </div>

          {stage && (
            <div className="cr2-rival-bubble">
              <img
                src={`/assets/images/rivals/${stage.rival}.png`}
                alt={stage.rivalName}
                className="cr2-rival-img"
              />
              <div className="cr2-rival-name">{stage.rivalName}</div>
              <div className="cr2-rival-company">{stage.company}</div>
              <div className="cr2-rival-status">정산 후 공개</div>
            </div>
          )}

          <div className="cr2-player-bubble">
            <img
              src={gameState.playerProfile?.avatar || '/assets/images/avatars/male_a.png'}
              alt="내 회사"
              className="cr2-player-img"
            />
            <div className="cr2-player-company">{gameState.playerProfile?.company || '내 회사'}</div>
            <div className="cr2-player-ceo">{gameState.playerProfile?.name || ''}</div>
            <div className="cr2-health-bar">
              {Array.from({ length: gameState.maxHealth }).map((_, index) => (
                <div
                  key={`health-${index}`}
                  className={`cr2-health-cell ${index < gameState.health ? 'cr2-health-full' : 'cr2-health-empty'}`}
                  style={{
                    background: index < gameState.health
                      ? gameState.health <= 3 ? 'var(--cr2-red)' : 'var(--cr2-lime)'
                      : 'transparent',
                  }}
                />
              ))}
            </div>
            <div className="cr2-momentum-label">
              {getMomentumLabel(gameState.momentum)}
            </div>
            <div className="cr2-advisor-mini">
              <img
                src={`/assets/images/advisors/${gameState.selectedAdvisor}.png`}
                alt="어드바이저"
                className="cr2-advisor-mini-img"
              />
            </div>
          </div>
        </div>

        <div className="cr2-main-bottom">
          <div className="cr2-strategy-panel">
            <div className="cr2-strategy-title">전략 진단</div>
            <div className="cr2-strategy-content">
              {getStrategyWarning(gameState) || '전략 안정권'}
            </div>
            {getLearningGoal(gameState.floor) && (
              <div className="cr2-learning-hint">
                📚 {getLearningGoal(gameState.floor).hint}
              </div>
            )}
          </div>

          <div className="cr2-finance-panel">
            <div className="cr2-finance-item">
              <span className="cr2-finance-label">자본</span>
              <span className={`cr2-finance-value cr2-capital ${gameState.capital < 0 ? 'cr2-negative' : 'cr2-positive'}`}>
                {formatCapital(gameState.capital)}
                {gameState.lastCapital !== gameState.capital && (
                  <span className={`cr2-capital-delta ${gameState.capital > gameState.lastCapital ? 'cr2-positive' : 'cr2-negative'}`}>
                    {gameState.capital > gameState.lastCapital ? '▲' : '▼'}
                    {formatCapital(Math.abs(gameState.capital - gameState.lastCapital))}
                  </span>
                )}
              </span>
            </div>
            <div className="cr2-finance-item">
              <span className="cr2-finance-label">부채</span>
              <span className="cr2-finance-value">{formatCapital(gameState.debt)}</span>
            </div>
            <div className="cr2-finance-item">
              <span className="cr2-finance-label">월 이자</span>
              <span className="cr2-finance-value">{formatCapital(calcMonthlyInterest(gameState.loans))}</span>
            </div>
            <div className="cr2-finance-item">
              <span className="cr2-finance-label">품질</span>
              <span className="cr2-finance-value">{gameState.quality}</span>
            </div>
            <div className="cr2-finance-item">
              <span className="cr2-finance-label">브랜드</span>
              <span className="cr2-finance-value">{gameState.brand.toFixed(1)}</span>
            </div>
            <div className="cr2-finance-item">
              <span className="cr2-finance-label">인지도</span>
              <span className="cr2-finance-value">{gameState.awareness.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <RivalCapitalBar />
      </div>

      <RightPanel
        activeTab={activePanelTab}
        onTabChange={setActivePanelTab}
        onSettle={handleSettle}
      />

      <div className="cr2-tab-bar">
        <button
          className={`cr2-tab cr2-tab-sale ${activePanelTab === 'sale' ? 'cr2-tab-active' : ''}`}
          onClick={() => setActivePanelTab('sale')}
        >
          판매 ❓
        </button>
        <button
          className={`cr2-tab cr2-tab-quality ${activePanelTab === 'quality' ? 'cr2-tab-active' : ''}`}
          onClick={() => setActivePanelTab('quality')}
        >
          품질 ❓
        </button>
        <button
          className={`cr2-tab cr2-tab-operation ${activePanelTab === 'operation' ? 'cr2-tab-active' : ''}`}
          onClick={() => setActivePanelTab('operation')}
        >
          운영 ❓
        </button>
        <button className="cr2-tab cr2-tab-next" onClick={handleSettle}>정산하기</button>
      </div>

      {stagePopup && (
        <div className="cr2-popup-overlay">
          <div className="cr2-stage-popup">
            <div className="cr2-stage-popup-title">⚠️ MONOPOL 새 조직원 등장</div>
            <div className="cr2-stage-popup-info">
              <img
                src={`/assets/images/rivals/${stage?.rival}.png`}
                alt={stagePopup.rivalName}
                className="cr2-stage-popup-img"
              />
              <div className="cr2-stage-popup-name">{stagePopup.rivalName}</div>
              <div className="cr2-stage-popup-company">{stagePopup.company}</div>
            </div>
            <div className="cr2-stage-popup-message">{stagePopup.message}</div>
            <div className="cr2-stage-popup-hint">💡 {stagePopup.hint}</div>
            <button
              className="cr2-btn"
              onClick={() => setStagePopup(null)}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {learningPopup && (
        <div className="cr2-popup-overlay">
          <div className="cr2-learning-popup">
            <div className="cr2-learning-popup-title">💡 이번 구간</div>
            <div className="cr2-learning-popup-hint">{learningPopup.hint}</div>
            <div className="cr2-learning-popup-monopol">{learningPopup.monopolContext}</div>
            <div className="cr2-learning-popup-btns">
              <button className="cr2-btn" onClick={() => setLearningPopup(null)}>
                확인
              </button>
              <button
                className="cr2-btn cr2-btn-ghost"
                onClick={() => {
                  localStorage.setItem('cr2_hide_goal', 'true')
                  setLearningPopup(null)
                }}
              >
                다시 보지 않기
              </button>
            </div>
          </div>
        </div>
      )}

      <CheatPanel />
    </div>
  )
}

function getBackground(econPhase) {
  const bgMap = {
    boom: '/assets/images/backgrounds/bg_boom.png',
    growth: '/assets/images/backgrounds/bg_growth.png',
    stable: '/assets/images/backgrounds/bg_stable.png',
    contraction: '/assets/images/backgrounds/bg_contraction.png',
    recession: '/assets/images/backgrounds/bg_recession.png',
  }
  return bgMap[econPhase] || bgMap.stable
}

function phaseLabel(phase) {
  const map = { boom: '호황', growth: '성장', stable: '안정', contraction: '위축', recession: '불황' }
  return map[phase] || phase
}

function getDemandMultiplier(phase) {
  const map = { boom: 1.4, growth: 1.2, stable: 1.0, contraction: 0.8, recession: 0.6 }
  return map[phase] || 1.0
}

function getMomentumLabel(momentum) {
  if (momentum >= 3) return '호황세'
  if (momentum >= 1) return '상승세'
  if (momentum === 0) return '중립'
  if (momentum >= -2) return '둔화'
  return '침체'
}

function getRewardLabel(floor) {
  if (floor % 20 === 0) return '이번 달'
  const next = Math.ceil(floor / 20) * 20
  return `${next - floor}개월 후`
}

function getStrategyWarning(gameState) {
  const price = gameState.currentStrategy?.price || 0
  const cost = gameState.cost || 3000
  const quality = gameState.quality || 0
  if (!price) return null
  if (price < cost * 1.2 && quality > 20) return '⚠️ 수익성 위험'
  if (price > cost * 4 && quality < 10) return '⚠️ 브랜드 리스크'
  return null
}

function formatCapital(amount) {
  if (!amount) return '0원'
  const abs = Math.abs(amount)
  if (abs >= 100000000) return `${(amount / 100000000).toFixed(1)}억원`
  if (abs >= 10000) return `${Math.floor(amount / 10000)}만원`
  return `${amount.toLocaleString()}원`
}

function calcMonthlyInterest(loans = []) {
  return loans.reduce((sum, loan) => (
    sum + Math.floor(loan.principal * (loan.interestRate / 12))
  ), 0)
}
