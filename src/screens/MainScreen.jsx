import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import { settle } from '../logic/settlementEngine'
import { getRivalInitialCapital } from '../logic/monopolEngine'
import { getCurrentStage, isNewStage } from '../constants/monopol'
import { getCurrentTier, isNewTier } from '../constants/productTiers'
import { getLearningGoals } from '../constants/learningGoals'
import { RIVALS } from '../constants/rivals'
import { saveAchievements } from '../logic/achievementEngine'
import { playSFX, playBGM } from '../logic/audioEngine'
import { getUpcomingMaturityLoans } from '../logic/loanEngine'
import { rollInternalEvent } from '../logic/eventEngine'
import { requestStrategyAdvice } from '../logic/aiAdvisorEngine'
import RightPanel from '../components/RightPanel'
import RivalCapitalBar from '../components/RivalCapitalBar'
import CheatPanel from '../components/CheatPanel'
import '../styles/main.css'

export default function MainScreen() {
  const gameState = useGameStore(state => state)
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const setRivalState = useGameStore(state => state.setRivalState)
  const setIsPaused = useGameStore(state => state.setIsPaused)

  const [stagePopup, setStagePopup] = useState(null)
  const [tierPopup, setTierPopup] = useState(null)
  const [learningPopup, setLearningPopup] = useState(null)
  const [learningPopupQueue, setLearningPopupQueue] = useState([])
  const [activeTab, setActiveTab] = useState('sale')
  const [aiStrategyAdvice, setAiStrategyAdvice] = useState(null)
  const prevFloorRef = useRef(Math.max((gameState.floor || 1) - 1, 0))

  useEffect(() => {
    playBGM(gameState.econPhase)
  }, [gameState.econPhase])

  useEffect(() => {
    const price = gameState.currentStrategy?.price || 0
    if (!price) return

    requestStrategyAdvice({
      selectedAdvisor: gameState.selectedAdvisor,
      econPhase: gameState.econPhase,
      currentStrategy: {
        price,
        orderAmount: gameState.currentStrategy?.orderAmount || 0,
        qualityMode: gameState.currentStrategy?.qualityMode || 'maintain',
      },
      cost: gameState.cost,
      capital: gameState.capital,
      rivalPrice: gameState.rivalPrice,
    }, advice => {
      setAiStrategyAdvice(advice)
    })
  }, [
    gameState.currentStrategy,
    gameState.currentStrategy?.orderAmount,
    gameState.currentStrategy?.price,
    gameState.currentStrategy?.qualityMode,
    gameState.capital,
    gameState.cost,
    gameState.econPhase,
    gameState.rivalPrice,
    gameState.selectedAdvisor,
  ])

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
            rivals: [],
            stageTurn: 1,
            currentStageId: nextStage.id,
          })

          setStagePopup({
            rival: nextStage.rival,
            rivalName: nextStage.rivalName,
            company: nextStage.company,
            message: nextStage.entryMessage,
            hint: nextStage.hint,
            tier: nextStage.tier,
          })
          playSFX('rival')
        }
      }

      if (isNewTier(prevFloor, currentFloor)) {
        const tier = getCurrentTier(currentFloor)
        setTierPopup({
          name: tier.name,
          category: tier.category,
          baseCost: tier.baseCost,
          operatingCost: tier.operatingCost,
          baseDemand: tier.baseDemand,
          message: tier.entryMessage,
        })
        useGameStore.setState({ rivalCost: tier.baseCost })
        playSFX('rival')
      }

      const goals = getLearningGoals(currentFloor)
      if (goals.length > 0 && gameState.settings?.tutorial !== false) {
        setLearningPopupQueue(goals)
        setLearningPopup(goals[0])
      }

      playBGM(gameState.econPhase)
    })
  }, [
    gameState.capital,
    gameState.econPhase,
    gameState.floor,
    gameState.settings?.tutorial,
    setRivalState,
  ])

  const handleSettle = async () => {
    playSFX('nextfloor')

    const internalEvent = rollInternalEvent(gameState)

    if (internalEvent) {
      useGameStore.setState({
        currentExternalEvent: null,
        currentInternalEvent: internalEvent,
        currentRivalEvent: null,
        pendingNextFloor: null,
      })
      setCurrentScreen('event')
      return
    }

    const { updatedState, settlementResult } = settle(gameState)

    useGameStore.setState({
      ...updatedState,
      lastSettlementResult: settlementResult,
      currentExternalEvent: null,
      currentInternalEvent: null,
      currentRivalEvent: null,
      pendingNextFloor: null,
      playerShareHistory: [
        ...(gameState.playerShareHistory || []),
        settlementResult.shareAfter || 0,
      ],
      revenueHistory: [
        ...(gameState.revenueHistory || []).slice(-9),
        settlementResult.revenue || 0,
      ],
      profitHistory: [
        ...(gameState.profitHistory || []).slice(-9),
        settlementResult.netProfit || 0,
      ],
      capitalHistory: [
        ...(gameState.capitalHistory || []).slice(-9),
        updatedState.capital,
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

    setTimeout(() => {
      setCurrentScreen('result')
    }, 0)
  }

  const handlePopupConfirm = () => {
    const next = learningPopupQueue.slice(1)
    setLearningPopupQueue(next)
    setLearningPopup(next[0] || null)
  }

  const handlePopupHide = () => {
    setLearningPopupQueue([])
    setLearningPopup(null)
  }

  const background = getBackground(gameState.econPhase)
  const stage = getCurrentStage(gameState.floor)
  const upcomingLoans = getUpcomingMaturityLoans(gameState.loans || [])
  const monopolEffect = gameState.activeEffects?.find(effect => effect.source === 'MONOPOL')

  return (
    <div className="cr2-main-screen">
      <div
        className="cr2-main-bg"
        style={{ backgroundImage: `url(${background})` }}
      />

      <button
        className="cr2-pause-trigger-btn"
        onClick={() => setIsPaused(true)}
        aria-label="일시정지"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <rect x="2" y="2" width="3.5" height="10" rx="1" fill="white" />
          <rect x="8.5" y="2" width="3.5" height="10" rx="1" fill="white" />
        </svg>
      </button>

      <div className="cr2-main-left">
        <div className="cr2-main-overlay-top">
          <div className="cr2-overlay-row">
            <span className="cr2-overlay-floor">
              {gameState.floor} / 120
            </span>
            <span className="cr2-overlay-reward cr2-gray">
              보상 {getRewardLabel(gameState.floor)}
            </span>
          </div>

          <div className="cr2-overlay-row">
            <span className="cr2-overlay-phase-label cr2-gray">경기</span>
            <span
              className="cr2-overlay-phase-value"
              style={{ color: getPhaseColor(gameState.econPhase) }}
            >
              {phaseLabel(gameState.econPhase)}
            </span>
            <span className="cr2-overlay-phase-multiplier cr2-gray">
              수요 ×{getDemandMultiplier(gameState.econPhase).toFixed(1)}
            </span>
          </div>

          <div className="cr2-overlay-row">
            <span className="cr2-overlay-phase-desc">
              {getPhaseDesc(gameState.econPhase)}
            </span>
          </div>

          {gameState.activeEffects?.filter(effect => effect.source !== 'MONOPOL').length > 0 && (
            <div className="cr2-overlay-row">
              <span style={{
                fontSize: '8px',
                color: 'var(--cr2-red)',
                fontFamily: "'Noto Sans KR', sans-serif",
              }}>
                ⚠️ {gameState.activeEffects
                  .filter(effect => effect.source !== 'MONOPOL')
                  .map(effect => effect.title || effect.type)
                  .join(' · ')}
              </span>
            </div>
          )}

          {monopolEffect && (
            <span className="cr2-negative">MONOPOL 개입 중</span>
          )}
        </div>

        <div className="cr2-game-area">
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            display: 'flex',
            flexDirection: 'row',
            gap: '6px',
            zIndex: 4,
          }}>
            {(gameState.rivals?.length > 0 ? gameState.rivals : stage ? [stage] : []).map((rival, idx) => (
              <div
                key={rival.id || idx}
                style={{
                  border: '2px solid var(--cr2-red)',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '4px',
                  width: '80px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <img
                  src={getRivalProfileImage(rival.rivalId || rival.rival || rival.id || stage?.rival)}
                  alt={rival.name || stage?.rivalName}
                  style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                />
                <div style={{ fontSize: '9px', color: 'var(--cr2-red)', textAlign: 'center' }}>
                  {rival.name || stage?.rivalName}
                </div>
                <div style={{ fontSize: '8px', color: 'var(--cr2-gray)', textAlign: 'center' }}>
                  {rival.company || stage?.company}
                </div>
                <div style={{ fontSize: '8px', color: 'var(--cr2-white)', textAlign: 'center' }}>
                  [{rival.tier || stage?.tier}]
                </div>
              </div>
            ))}
          </div>

          <div style={{
            position: 'absolute',
            top: '300px',
            left: '16px',
            background: 'rgba(0,0,0,0.85)',
            border: '2px solid var(--cr2-lime)',
            borderRadius: '50%',
            width: '90px',
            height: '90px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '3px',
            backdropFilter: 'blur(4px)',
            boxShadow: '0 0 12px rgba(0,255,65,0.2)',
            zIndex: 10,
          }}>
            {(() => {
              const totalDemand = Math.floor(
                getCurrentTier(gameState.floor).baseDemand
                  * getDemandMultiplier(gameState.econPhase),
              )
              const lastShare = (gameState.playerShareHistory || []).slice(-1)[0] ?? 0.5
              const myDemand = Math.floor(totalDemand * lastShare)
              return (
                <>
                  <div style={{ fontSize: '8px', color: 'var(--cr2-green)' }}>
                    예상 수요 {totalDemand.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--cr2-lime)' }}>
                    내 예상 {myDemand.toLocaleString()}
                  </div>
                </>
              )
            })()}
          </div>

          <div style={{
            position: 'absolute',
            bottom: '0px',
            left: '12px',
            background: 'rgba(0,0,0,0.85)',
            border: '2px solid var(--cr2-lime)',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            width: '100px',
            backdropFilter: 'blur(4px)',
            zIndex: 4,
          }}>
            <img
              src={gameState.playerProfile?.avatar || '/assets/player_male_a_profile-_nb4zKZU.png'}
              alt="플레이어"
              style={{
                width: '56px',
                height: '56px',
                objectFit: 'contain',
              }}
            />
            <div style={{ fontSize: '9px', color: 'var(--cr2-lime)', textAlign: 'center' }}>
              {gameState.playerProfile?.company || '내 회사'}
            </div>
            <div style={{ fontSize: '7px', color: 'var(--cr2-gray)', textAlign: 'center' }}>
              {gameState.playerProfile?.name || ''}
            </div>

            <div style={{
              display: 'flex',
              gap: '1px',
              flexWrap: 'nowrap',
              justifyContent: 'center',
              maxWidth: '90px',
              marginTop: '2px',
              overflowX: 'hidden',
            }}>
              {Array.from({ length: gameState.maxHealth || 10 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '5px',
                    height: '5px',
                    flexShrink: 0,
                    background: i < (gameState.health || 0)
                      ? (gameState.health <= 3 ? 'var(--cr2-red)' : 'var(--cr2-lime)')
                      : 'rgba(255,255,255,0.1)',
                    border: `1px solid ${i < (gameState.health || 0)
                      ? 'var(--cr2-green)' : 'rgba(255,255,255,0.15)'}`,
                  }}
                />
              ))}
            </div>

            <div style={{
              fontSize: '8px',
              marginTop: '2px',
              color: gameState.momentum >= 3 ? 'var(--cr2-lime)'
                : gameState.momentum >= 1 ? 'var(--cr2-green)'
                  : gameState.momentum === 0 ? 'var(--cr2-gray)'
                    : gameState.momentum >= -2 ? 'var(--cr2-gold)'
                      : 'var(--cr2-red)',
            }}>
              {getMomentumLabel(gameState.momentum)}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              marginTop: '2px',
            }}>
              <img
                src={getAdvisorProfileImage(gameState.selectedAdvisor)}
                alt="어드바이저"
                style={{
                  width: '20px',
                  height: '20px',
                  objectFit: 'contain',
                  border: '1px solid var(--cr2-green)',
                }}
              />
              <span style={{ fontSize: '7px', color: 'var(--cr2-gray)' }}>
                {getAdvisorShortName(gameState.selectedAdvisor)}
              </span>
            </div>
          </div>
        </div>

        <div className="cr2-main-bottom">
          <div className="cr2-strategy-panel">
            <div className="cr2-strategy-title">전략 진단</div>
            <div className="cr2-strategy-content">
              {getStrategyWarning(gameState) || '전략 안정권'}
            </div>
            {aiStrategyAdvice && (
              <div style={{
                fontSize: '8px',
                color: 'var(--cr2-lime)',
                marginTop: '3px',
                fontFamily: "'Noto Sans KR', sans-serif",
                lineHeight: '1.6',
                borderTop: '1px solid rgba(0,255,65,0.2)',
                paddingTop: '3px',
              }}>
                ✨ {aiStrategyAdvice}
              </div>
            )}
            {getLearningGoals(gameState.floor)[0] && (
              <div className="cr2-learning-hint">
                {getLearningGoals(gameState.floor)[0].title}
              </div>
            )}
          </div>

          <div className="cr2-finance-panel">
            <div className="cr2-finance-row cr2-finance-capital">
              <span className="cr2-finance-label">자본</span>
              <span className={`cr2-finance-big ${gameState.capital < 0 ? 'cr2-negative' : 'cr2-positive'}`}>
                {formatCapital(gameState.capital)}
              </span>
              {gameState.lastCapital !== undefined && gameState.capital !== gameState.lastCapital && (
                <span className={`cr2-finance-delta ${gameState.capital > gameState.lastCapital ? 'cr2-positive' : 'cr2-negative'}`}>
                  {gameState.capital > gameState.lastCapital ? '▲' : '▼'}
                  {formatCapital(Math.abs(gameState.capital - gameState.lastCapital))}
                </span>
              )}
            </div>

            <div className="cr2-finance-row">
              <div className="cr2-finance-cell">
                <span className="cr2-finance-label">부채</span>
                <span className={`cr2-finance-value ${gameState.debt > 0 ? 'cr2-negative' : ''}`}>
                  {formatCapital(gameState.debt)}
                </span>
              </div>
              <div className="cr2-finance-cell">
                <span className="cr2-finance-label">월이자</span>
                <span className="cr2-finance-value cr2-negative">
                  {formatCapital(calcMonthlyInterest(gameState.loans))}
                </span>
              </div>
              <div className="cr2-finance-cell">
                <span className="cr2-finance-label">신용</span>
                <span className={`cr2-finance-value ${getCreditColor(gameState.creditScore)}`}>
                  {getCreditGrade(gameState.creditScore)}
                </span>
              </div>
            </div>

            <div className="cr2-finance-row">
              <div className="cr2-finance-cell">
                <span className="cr2-finance-label">품질</span>
                <span className="cr2-finance-value cr2-lime">
                  {gameState.quality}
                </span>
              </div>
              <div className="cr2-finance-cell">
                <span className="cr2-finance-label">브랜드</span>
                <span className="cr2-finance-value">
                  {gameState.brand?.toFixed(1)}
                </span>
              </div>
              <div className="cr2-finance-cell">
                <span className="cr2-finance-label">인지도</span>
                <span className="cr2-finance-value">
                  {gameState.awareness?.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <RivalCapitalBar />

        {upcomingLoans.length > 0 && (
          <div className={`cr2-loan-warning ${upcomingLoans[0].remainingTurns <= 1 ? 'cr2-blink' : ''}`}>
            대출 만기 {upcomingLoans[0].remainingTurns}턴 후 ·
            원금 {(upcomingLoans[0].principal / 10000).toFixed(0)}만원
          </div>
        )}
      </div>

      <RightPanel
        activeTab={activeTab}
        onSettle={handleSettle}
      />

      <div className="cr2-tab-bar">
        <button
          className={`cr2-tab ${activeTab === 'rival' ? 'cr2-tab-active' : ''}`}
          onClick={() => {
            setActiveTab('rival')
            playSFX('click')
          }}
          style={{
            flex: 1,
            borderColor: activeTab === 'rival'
              ? 'var(--cr2-red)' : 'rgba(220,20,60,0.5)',
            color: activeTab === 'rival'
              ? '#FF6B6B' : 'rgba(220,20,60,0.7)',
            background: activeTab === 'rival'
              ? 'rgba(220,20,60,0.12)' : 'rgba(0,0,0,0.9)',
            fontSize: '10px',
          }}
        >
          라이벌
        </button>
        <button
          className={`cr2-tab ${activeTab === 'sale' ? 'cr2-tab-active' : ''}`}
          onClick={() => {
            setActiveTab('sale')
            playSFX('click')
          }}
          style={{ flex: 1, fontSize: '10px' }}
        >
          판매
        </button>
        <button
          className={`cr2-tab ${activeTab === 'operation' ? 'cr2-tab-active' : ''}`}
          onClick={() => {
            setActiveTab('operation')
            playSFX('click')
          }}
          style={{ flex: 1, fontSize: '10px' }}
        >
          운영
        </button>
        <button
          className="cr2-tab cr2-tab-next"
          onClick={() => {
            setActiveTab('next')
            playSFX('click')
          }}
          style={{ flex: 1, fontSize: '10px' }}
        >
          정산확인
        </button>
      </div>

      {stagePopup && (
        <div className="cr2-popup-overlay">
          <div className="cr2-stage-popup">
            <div className="cr2-stage-popup-title">MONOPOL 조직원 등장</div>
            <div className="cr2-stage-popup-info">
              <img
                src={getRivalProfileImage(stagePopup.rival)}
                alt={stagePopup.rivalName}
                className="cr2-stage-popup-img"
              />
              <div className="cr2-stage-popup-name">{stagePopup.rivalName}</div>
              <div className="cr2-stage-popup-company">{stagePopup.company}</div>
            </div>
            <div className="cr2-stage-popup-message">{stagePopup.message}</div>
            <div className="cr2-stage-popup-hint">{stagePopup.hint}</div>
            <button
              className="cr2-btn"
              onClick={() => setStagePopup(null)}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {tierPopup && (
        <div className="cr2-popup-overlay">
          <div style={{
            background: 'var(--cr2-bg2)',
            border: '2px solid var(--cr2-gold)',
            padding: '24px',
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--cr2-gold)' }}>
              📦 새로운 시장
            </div>
            <div style={{ fontSize: '18px', color: 'var(--cr2-lime)' }}>
              {tierPopup.name}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--cr2-gray)' }}>
              {tierPopup.category}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              width: '100%',
              fontSize: '9px',
            }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px' }}>
                <div style={{ color: 'var(--cr2-gray)' }}>기본 원가</div>
                <div style={{ color: 'var(--cr2-white)' }}>
                  {tierPopup.baseCost.toLocaleString()}원
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px' }}>
                <div style={{ color: 'var(--cr2-gray)' }}>월 운영비</div>
                <div style={{ color: 'var(--cr2-red)' }}>
                  {(tierPopup.operatingCost / 10000).toFixed(0)}만원
                </div>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '8px' }}>
                <div style={{ color: 'var(--cr2-gray)' }}>시장 수요</div>
                <div style={{ color: 'var(--cr2-lime)' }}>
                  {tierPopup.baseDemand.toLocaleString()}개
                </div>
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--cr2-white)', lineHeight: '1.8' }}>
              {tierPopup.message}
            </div>
            <button
              className="cr2-btn"
              style={{ borderColor: 'var(--cr2-gold)', color: 'var(--cr2-gold)' }}
              onClick={() => setTierPopup(null)}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {learningPopup && (
        <div className="cr2-popup-overlay">
          <div className="cr2-learning-popup">
            <div className="cr2-learning-popup-title">{learningPopup.title}</div>
            <div className="cr2-learning-popup-hint" style={{ whiteSpace: 'pre-line' }}>
              {learningPopup.content}
            </div>
            <div className="cr2-learning-popup-btns">
              <button className="cr2-btn" onClick={handlePopupConfirm}>
                {learningPopupQueue.length > 1 ? '다음' : '확인'}
              </button>
              <button
                className="cr2-btn cr2-btn-ghost"
                onClick={handlePopupHide}
              >
                다시 보지 않기
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState.monopolEvaluation && (
        <div className="cr2-popup-overlay">
          <div style={{
            background: '#0A0A0F',
            border: '2px solid var(--cr2-red)',
            padding: '24px',
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 0 30px rgba(220,20,60,0.3)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--cr2-red)' }}>
              ⚠️ MONOPOL 통보
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--cr2-white)',
              lineHeight: '1.8',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>
              {gameState.monopolEvaluation.message}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--cr2-gray)' }}>
              {gameState.monopolEvaluation.type === 'REPLACE'
                ? '새로운 라이벌이 시장에 투입됩니다.'
                : '추가 라이벌이 시장에 투입됩니다.'}
            </div>
            <button
              className="cr2-btn"
              style={{ borderColor: 'var(--cr2-red)', color: 'var(--cr2-red)' }}
              onClick={() => {
                useGameStore.setState({ monopolEvaluation: null })
                playSFX('rival')
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      <CheatPanel />
    </div>
  )
}

function getBackground(econPhase) {
  const bgMap = {
    boom: '/assets/bg_phase_boom-BqFLGgpW.jpg',
    growth: '/assets/bg_phase_growth-BN5UHyVn.jpg',
    stable: '/assets/bg_phase_stable-BS4q62fz.jpg',
    contraction: '/assets/bg_phase_contraction-CbRrs-qy.jpg',
    recession: '/assets/bg_phase_recession-CCyrxX4k.jpg',
  }
  return bgMap[econPhase] || bgMap.stable
}

function phaseLabel(phase) {
  const map = {
    boom: '호황',
    growth: '성장',
    stable: '안정',
    contraction: '위축',
    recession: '불황',
  }
  return map[phase] || phase
}

function getPhaseColor(phase) {
  const map = {
    boom: '#FFD700',
    growth: '#00FF41',
    stable: '#AAAAAA',
    contraction: '#FF8800',
    recession: '#DC143C',
  }
  return map[phase] || '#AAAAAA'
}

function getPhaseDesc(phase) {
  const map = {
    boom: '소비 활발 · 품질 중시 소비자 ↑',
    growth: '경기 회복 · 균형 소비',
    stable: '일반적인 시장 상황',
    contraction: '소비 위축 · 가격 중시 소비자 ↑',
    recession: '극심한 침체 · 최저가 경쟁',
  }
  return map[phase] || ''
}

function getDemandMultiplier(phase) {
  const map = { boom: 1.4, growth: 1.2, stable: 1.0, contraction: 0.8, recession: 0.6 }
  return map[phase] || 1.0
}

function getMomentumLabel(momentum) {
  if (momentum >= 3) return '강한 상승'
  if (momentum >= 1) return '상승'
  if (momentum === 0) return '중립'
  if (momentum >= -2) return '약세'
  return '침체'
}

function getTierColor(tier) {
  const map = {
    ENTRY: 'var(--cr2-green)',
    MID: 'var(--cr2-lime)',
    SENIOR: 'var(--cr2-gold)',
    CHAMPION: 'var(--cr2-red)',
  }
  return map[tier] || 'var(--cr2-gold)'
}

function getRewardLabel(floor) {
  if (floor % 20 === 0) return '이번 층'
  const next = Math.ceil(floor / 20) * 20
  return `${next - floor}개월 후`
}

function getStrategyWarning(gameState) {
  const price = gameState.currentStrategy?.price || 0
  const cost = gameState.cost || 3000
  const quality = gameState.quality || 0
  const debt = gameState.debt || 0
  const capital = gameState.capital || 0
  const loans = gameState.loans || []
  const orderAmount = gameState.currentStrategy?.orderAmount || 0
  const operatingCost = 1500000
  const monthlyInterest = loans.reduce(
    (sum, loan) => sum + Math.floor(loan.principal * (loan.interestRate || 0.065) / 12),
    0,
  )
  const totalFixedCost = operatingCost + monthlyInterest
  const margin = price - cost
  const breakeven = margin > 0 ? Math.ceil(totalFixedCost / margin) : null

  if (!price) return '가격을 설정하세요.'
  if (price < cost) return '⚠️ 판매가가 원가보다 낮습니다. 팔수록 손해입니다.'
  if (price < cost * 1.1) return '⚠️ 마진이 너무 낮습니다. 운영비(150만원)를 감당하기 어렵습니다.'

  if (price > cost * 4 && quality < 10) return '⚠️ 고가 전략인데 품질이 너무 낮습니다. 소비자가 외면합니다.'
  if (price > cost * 3 && quality < 7) return '⚠️ 가격 대비 품질이 낮습니다. 점유율이 떨어질 수 있습니다.'
  if (price > cost * 2 && quality < 5) return '⚠️ 품질이 매우 낮습니다. 저가 전략을 고려하세요.'

  if (breakeven && orderAmount > 0 && orderAmount < breakeven) {
    return `⚠️ 발주량(${orderAmount.toLocaleString()})이 손익분기점(${breakeven.toLocaleString()})보다 낮습니다.`
  }
  if (monthlyInterest > operatingCost) return `⚠️ 월 이자(${(monthlyInterest / 10000).toFixed(0)}만원)가 운영비(150만원)를 넘었습니다.`
  if (totalFixedCost > capital * 0.3) return `⚠️ 고정비용(${(totalFixedCost / 10000).toFixed(0)}만원)이 자본의 30%를 넘습니다.`

  if (debt > capital * 0.7) return '⚠️ 부채가 자본의 70%를 넘었습니다. 이자 부담이 큽니다.'
  if ((gameState.health || 0) <= 3) return '⚠️ 경영 체력이 위험 수준입니다. 흑자를 내야 합니다.'
  if ((gameState.momentum || 0) <= -3) return '⚠️ 연속 적자로 모멘텀이 매우 낮습니다.'
  if ((gameState.awareness || 0) < 5) return '⚠️ 인지도가 너무 낮습니다. 마케팅 투자가 필요합니다.'

  return '전략 안정권'
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

function getCreditGrade(score) {
  if (score >= 80) return 'A'
  if (score >= 60) return 'B'
  if (score >= 40) return 'C'
  return 'D'
}

function getCreditColor(score) {
  if (score >= 80) return 'cr2-positive'
  if (score >= 60) return 'cr2-gold'
  if (score >= 40) return ''
  return 'cr2-negative'
}

function getRivalProfileImage(rivalId) {
  return RIVALS.find(rival => rival.id === rivalId)?.profileImage || '/assets/logo_image-f7z3e97D.png'
}

function getAdvisorProfileImage(id) {
  const map = {
    raider: '/assets/advisor_raider_profile-BG4Qmc-_.png',
    guardian: '/assets/advisor_guardian_profile-DheSXB--.png',
    analyst: '/assets/advisor_analyst_profile-aFBaficW.png',
    gambler: '/assets/advisor_gambler_profile-Mw_W8stF.png',
  }
  return map[id] || '/assets/logo_image-f7z3e97D.png'
}

function getAdvisorShortName(id) {
  const map = {
    raider: 'Raider',
    guardian: 'Guardian',
    analyst: 'Analyst',
    gambler: 'Gambler',
  }
  return map[id] || ''
}
