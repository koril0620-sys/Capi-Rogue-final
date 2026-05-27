import { useEffect, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { resolveChoice, resolveCashAmount } from '../logic/eventEngine'
import { settle } from '../logic/settlementEngine'
import { saveAchievements } from '../logic/achievementEngine'
import { playBGM, playSFX } from '../logic/audioEngine'
import '../styles/event.css'

export default function EventScreen() {
  const gameState = useGameStore(state => state)
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const [selectedChoice, setSelectedChoice] = useState(null)
  const [result, setResult] = useState(null)
  const [settling, setSettling] = useState(false)

  const externalEvent = gameState.currentExternalEvent
  const internalEvent = gameState.currentInternalEvent

  useEffect(() => {
    playBGM('tension')
  }, [])

  const handleExternalConfirm = () => {
    if (!externalEvent) {
      proceedToInternal()
      return
    }

    const newEffects = [
      ...(gameState.activeEffects || []),
      {
        ...externalEvent.effect,
        remainingTurns: externalEvent.effect.duration || 1,
      },
    ]
    useGameStore.setState({ activeEffects: newEffects, currentExternalEvent: null })
    playSFX('event')
    proceedToInternal()
  }

  const proceedToInternal = () => {
    if (!internalEvent) proceedToSettle()
  }

  const handleChoiceSelect = (choice) => {
    playSFX('click')
    setSelectedChoice(choice.id)
  }

  const handleChoiceConfirm = () => {
    if (!selectedChoice || !internalEvent) return

    const choice = internalEvent.choices.find(item => item.id === selectedChoice)
    if (!choice) return

    const outcome = resolveChoice(choice, gameState, gameState.selectedAdvisor)
    applyOutcome(outcome)
    const isSuccess = outcome.capitalChange?.startsWith('+') ||
      (!outcome.capitalChange && !outcome.healthChange)

    useGameStore.setState(state => ({
      stats: {
        ...(state.stats || {}),
        eventTotalCount: (state.stats?.eventTotalCount || 0) + 1,
        eventSuccessCount: isSuccess
          ? (state.stats?.eventSuccessCount || 0) + 1
          : state.stats?.eventSuccessCount || 0,
        absurdStreak: choice.type === 'ABSURD' && isSuccess
          ? (state.stats?.absurdStreak || 0) + 1
          : 0,
        gambleFailSafeRecover: choice.type === 'GAMBLE' && !isSuccess
          ? (state.stats?.gambleFailSafeRecover || 0) + 1
          : state.stats?.gambleFailSafeRecover || 0,
      },
    }))
    setResult({ choice, outcome })

    const cashDelta = outcome.capitalChange
      ? resolveCashAmount(outcome.capitalChange, gameState.capital)
      : 0
    playSFX(cashDelta > 0 ? 'profit' : 'loss')
  }

  const applyOutcome = (outcome) => {
    const updates = {}

    if (outcome.capitalChange) {
      const delta = resolveCashAmount(outcome.capitalChange, gameState.capital)
      updates.capital = gameState.capital + delta
    }
    if (outcome.healthChange) {
      updates.health = Math.min(
        Math.max((gameState.health || 10) + outcome.healthChange, 0),
        gameState.maxHealth || 10,
      )
    }
    if (outcome.qualityChange) {
      updates.quality = Math.max((gameState.quality || 8) + outcome.qualityChange, 0)
    }
    if (outcome.brandChange) {
      updates.brand = Math.max((gameState.brand || 2) + outcome.brandChange, 0)
    }
    if (outcome.awarenessChange) {
      updates.awareness = Math.min(
        Math.max((gameState.awareness || 10) + outcome.awarenessChange, 0),
        Math.min(100, (gameState.brand || 2) * 2),
      )
    }
    if (outcome.creditChange) {
      updates.creditScore = Math.min(
        Math.max((gameState.creditScore || 70) + outcome.creditChange, 0),
        100,
      )
    }
    if (outcome.orderCapChange) {
      updates.orderCap = Math.max((gameState.orderCap || 1000) + outcome.orderCapChange, 100)
    }
    if (outcome.costReduction) {
      updates.costReductionTotal = Math.min(
        (gameState.costReductionTotal || 0) + outcome.costReduction,
        0.40,
      )
    }

    useGameStore.setState({ ...updates, currentInternalEvent: null })
  }

  const proceedToSettle = async () => {
    setSettling(true)
    const currentState = useGameStore.getState()
    const { updatedState, settlementResult } = settle(currentState)

    useGameStore.setState({
      ...updatedState,
      lastSettlementResult: settlementResult,
      playerShareHistory: [
        ...(currentState.playerShareHistory || []),
        settlementResult.shareAfter,
      ],
      revenueHistory: [
        ...(currentState.revenueHistory || []).slice(-9),
        settlementResult.revenue || 0,
      ],
      profitHistory: [
        ...(currentState.profitHistory || []).slice(-9),
        settlementResult.netProfit || 0,
      ],
      capitalHistory: [
        ...(currentState.capitalHistory || []).slice(-9),
        updatedState.capital,
      ],
    })

    if (settlementResult.newlyUnlocked?.length > 0) {
      useGameStore.setState({ newAchievements: settlementResult.newlyUnlocked })
      if (currentState.playerId) {
        void saveAchievements(currentState.playerId, settlementResult.newlyUnlocked)
      }
    }

    if (updatedState.isGameOver || settlementResult.isGameOver) {
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

  if (externalEvent && !result) {
    return (
      <div className="cr2-event-screen">
        <div
          className="cr2-event-bg"
          style={{ backgroundImage: `url(${externalEvent.backgroundImage})` }}
        />
        <div className="cr2-event-card cr2-event-external">
          <div className="cr2-event-badge cr2-badge-external">외부 이벤트</div>
          <div className="cr2-event-title">{externalEvent.title}</div>
          <div className="cr2-event-desc">{externalEvent.description}</div>
          <div className="cr2-event-effect">
            {formatEffect(externalEvent.effect)}
          </div>
          <button className="cr2-btn cr2-event-confirm-btn" onClick={handleExternalConfirm}>
            확인
          </button>
        </div>
      </div>
    )
  }

  if (internalEvent && !result) {
    return (
      <div className="cr2-event-screen">
        <div className="cr2-event-card cr2-event-internal">
          <div className="cr2-event-badge cr2-badge-internal">
            {getCategoryLabel(internalEvent.category)}
          </div>
          <div className="cr2-event-title">{internalEvent.title}</div>
          <div className="cr2-event-desc">{internalEvent.description}</div>

          <div className="cr2-event-choices">
            {internalEvent.choices.map(choice => (
              <div
                key={choice.id}
                className={`cr2-event-choice cr2-choice-${choice.type.toLowerCase()} ${selectedChoice === choice.id ? 'cr2-selected' : ''}`}
                onClick={() => handleChoiceSelect(choice)}
              >
                <div className="cr2-choice-header">
                  <span className="cr2-choice-label">
                    {choice.id}. {getChoiceTypeLabel(choice.type)}
                  </span>
                  <span className="cr2-choice-prob">{getChoiceProb(choice)}</span>
                </div>
                <div className="cr2-choice-desc">{choice.label}</div>
              </div>
            ))}
          </div>

          {selectedChoice && (
            <button className="cr2-btn cr2-event-confirm-btn" onClick={handleChoiceConfirm}>
              선택 확정
            </button>
          )}
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="cr2-event-screen">
        <div className="cr2-event-card cr2-event-result">
          <div className="cr2-event-title">결과</div>
          <div className={`cr2-event-result-text ${getResultType(result.outcome)}`}>
            {formatOutcome(result.outcome, gameState.capital)}
          </div>
          <button className="cr2-btn cr2-event-confirm-btn" onClick={proceedToSettle}>
            계속
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cr2-event-screen">
      <div className="cr2-event-card cr2-event-result">
        <div className="cr2-event-title">
          {settling ? '정산 중...' : '정산 준비 중...'}
        </div>
        <div className="cr2-event-result-text cr2-gray">
          잠시만 기다려 주세요.
        </div>
      </div>
    </div>
  )
}

function formatEffect(effect) {
  const lines = []
  if (effect.forcePhase) lines.push(`경기 국면 → ${phaseKorean(effect.forcePhase)}`)
  if (effect.demandMultiplier) lines.push(`수요 ${effect.demandMultiplier > 1 ? '+' : ''}${((effect.demandMultiplier - 1) * 100).toFixed(0)}%`)
  if (effect.costMultiplier) lines.push(`원가 ${effect.costMultiplier > 1 ? '+' : ''}${((effect.costMultiplier - 1) * 100).toFixed(0)}%`)
  if (effect.interestRateChange) lines.push(`이자율 ${effect.interestRateChange > 0 ? '+' : ''}${(effect.interestRateChange * 100).toFixed(1)}%p`)
  if (effect.duration) lines.push(`지속: ${effect.duration}턴`)
  return lines.join(' / ')
}

function formatOutcome(outcome, capital) {
  const lines = []
  if (outcome.capitalChange) {
    const delta = resolveCashAmount(outcome.capitalChange, capital)
    lines.push(`자본 ${delta > 0 ? '+' : ''}${(delta / 10000).toFixed(0)}만원`)
  }
  if (outcome.healthChange) lines.push(`체력 ${outcome.healthChange > 0 ? '+' : ''}${outcome.healthChange}`)
  if (outcome.qualityChange) lines.push(`품질 ${outcome.qualityChange > 0 ? '+' : ''}${outcome.qualityChange}`)
  if (outcome.brandChange) lines.push(`브랜드 ${outcome.brandChange > 0 ? '+' : ''}${outcome.brandChange}`)
  if (outcome.creditChange) lines.push(`신용점수 ${outcome.creditChange > 0 ? '+' : ''}${outcome.creditChange}`)
  if (outcome.costReduction) lines.push(`원가 절감 +${(outcome.costReduction * 100).toFixed(1)}%`)
  return lines.length > 0 ? lines.join(' / ') : '변화 없음'
}

function getResultType(outcome) {
  if (!outcome.capitalChange) return 'cr2-neutral'
  return outcome.capitalChange.startsWith('+') ? 'cr2-positive' : 'cr2-negative'
}

function getCategoryLabel(category) {
  const map = { PRODUCTION: '생산/품질', HR: '인사/조직', MARKETING: '마케팅/브랜드', FINANCE: '재무/기회' }
  return map[category] || category
}

function getChoiceTypeLabel(type) {
  const map = { SAFE: '안전', NORMAL: '일반', GAMBLE: '도박', ABSURD: '말도안됨' }
  return map[type] || type
}

function getChoiceProb(choice) {
  if (choice.type === 'SAFE') return '성공 100%'
  if (choice.type === 'NORMAL') return '성공 70% / 실패 30%'
  if (choice.type === 'GAMBLE') return '성공 30% / 실패 70%'
  if (choice.type === 'ABSURD') return '대박 20% / 보통 40% / 손해 40%'
  return ''
}

function phaseKorean(phase) {
  const map = { boom: '호황', growth: '성장', stable: '안정', contraction: '위축', recession: '불황' }
  return map[phase] || phase
}
