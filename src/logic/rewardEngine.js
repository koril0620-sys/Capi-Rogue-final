import { getRewardGradeProbabilities } from './momentumEngine'

export function getRewardGrade(momentum, momentumHistory) {
  const probs = getRewardGradeProbabilities(momentum, momentumHistory)
  const roll = Math.random()
  let cumulative = 0

  for (const [grade, prob] of Object.entries(probs)) {
    cumulative += prob
    if (roll < cumulative) return grade
  }

  return 'NORMAL'
}

export function getRewardOptions(grade) {
  const options = {
    NORMAL: [
      { id: 'health_1', label: '체력 +1', effect: { type: 'HEALTH', amount: 1 } },
      { id: 'cost_down', label: '다음 턴 원가 -10%', effect: { type: 'TEMP_COST_DOWN', amount: 0.10, duration: 1 } },
      { id: 'awareness_up', label: '인지도 +15%', effect: { type: 'AWARENESS', amount: 15 } },
    ],
    RARE: [
      { id: 'health_2', label: '체력 +2', effect: { type: 'HEALTH', amount: 2 } },
      { id: 'brand_up', label: '브랜드 +2', effect: { type: 'BRAND', amount: 2 } },
      { id: 'credit_up', label: '신용점수 +10', effect: { type: 'CREDIT', amount: 10 } },
    ],
    EPIC: [
      { id: 'health_3', label: '체력 +3', effect: { type: 'HEALTH', amount: 3 } },
      { id: 'quality_up', label: '품질 +10', effect: { type: 'QUALITY', amount: 10 } },
      { id: 'capital_up', label: '자본 +2,000,000원', effect: { type: 'CAPITAL', amount: 2000000 } },
    ],
    LEGEND: [
      { id: 'health_full', label: '체력 전체 회복', effect: { type: 'HEALTH_FULL' } },
      { id: 'quality_up_20', label: '품질 +20', effect: { type: 'QUALITY', amount: 20 } },
      { id: 'capital_up_big', label: '자본 +5,000,000원', effect: { type: 'CAPITAL', amount: 5000000 } },
    ],
  }

  return options[grade] || options.NORMAL
}

export function applyReward(rewardEffect, gameState) {
  const state = { ...gameState }

  switch (rewardEffect.type) {
    case 'HEALTH':
      state.health = Math.min(state.health + rewardEffect.amount, state.maxHealth)
      break
    case 'HEALTH_FULL':
      state.health = state.maxHealth
      break
    case 'QUALITY':
      state.quality += rewardEffect.amount
      break
    case 'BRAND':
      state.brand = Math.max(state.brand + rewardEffect.amount, 0)
      break
    case 'AWARENESS':
      state.awareness = Math.min(
        state.awareness + rewardEffect.amount,
        Math.min(100, state.brand * 2),
      )
      break
    case 'CAPITAL':
      state.capital += rewardEffect.amount
      break
    case 'CREDIT':
      state.creditScore = Math.min(state.creditScore + rewardEffect.amount, 100)
      break
    case 'TEMP_COST_DOWN':
      state.activeEffects = [
        ...(state.activeEffects || []),
        {
          type: 'COST_MULTIPLIER',
          costMultiplier: 1 - rewardEffect.amount,
          remainingTurns: rewardEffect.duration,
        },
      ]
      break
    default:
      break
  }

  return state
}

export function getClearGrade(gameState) {
  const { capital, creditScore, health } = gameState
  const getGradeLocal = score => score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
  const grade = getGradeLocal(creditScore)

  if (capital >= 50000000 && grade === 'A' && health >= 6) return 'S'
  if (capital >= 20000000 && (grade === 'A' || grade === 'B')) return 'A'
  if (capital >= 5000000) return 'B'
  return 'C'
}
