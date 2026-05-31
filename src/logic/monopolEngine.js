import { getCurrentStage } from '../constants/monopol'
import { RIVALS } from '../constants/rivals'
import { ECO_PHASES } from '../constants/economy'

const PHASE_PRICE_MODIFIER = {
  boom: 1.20,
  growth: 1.10,
  stable: 1.00,
  contraction: 0.90,
  recession: 0.75,
}

const PHASE_QUALITY_MODIFIER = {
  boom: 3,
  growth: 1,
  stable: 0,
  contraction: -1,
  recession: -2,
}

const MARKETING_BUDGET_MAP = {
  LOW: 0.02,
  MID: 0.05,
  HIGH: 0.10,
  MAX: 0.15,
}

export function getRivalInitialCapital(floor, playerCapital) {
  const stage = getCurrentStage(floor)
  if (!stage) return 0
  if (stage.capitalMultiplier === Infinity) return Infinity
  return Math.floor(playerCapital * stage.capitalMultiplier)
}

export function evaluateRivalPerformance(gameState) {
  const floor = gameState.floor
  if (floor % 10 !== 0) return null

  const primaryRival = gameState.rivals?.[0] || null
  const rivalCapital = primaryRival?.capital ?? gameState.rivalCapital ?? 0
  const rivalInitialCapital = primaryRival?.initialCapital ?? gameState.rivalInitialCapital ?? 1
  const rivalShare = primaryRival?.marketShare ?? (1 - (gameState.playerShareHistory?.slice(-1)[0] || 0))
  const capitalRatio = rivalCapital / rivalInitialCapital
  const isPoorPerformance = rivalShare < 0.20 || capitalRatio < 0.50

  if (isPoorPerformance) {
    return {
      type: 'REPLACE',
      message: `"${primaryRival?.name || getCurrentStage(floor)?.rivalName || '라이벌'}... 실망이군. 퇴출한다. 더 강한 자를 보내겠다."`,
      action: 'replace_rival',
    }
  }

  return {
    type: 'REINFORCE',
    message: '"거슬리는군. 지원을 더 붙이겠다."',
    action: 'add_rival',
  }
}

export function createRivalState(rivalId, gameState, overrides = {}) {
  const rival = RIVALS.find(item => item.id === rivalId)
  if (!rival) return null

  const baseCapital = Number.isFinite(gameState.rivalInitialCapital)
    ? gameState.rivalInitialCapital
    : Math.floor((gameState.capital || 5000000) * 0.5)
  const initialCapital = overrides.initialCapital || Math.max(baseCapital, gameState.rivalCost * 50 || 150000)

  return {
    id: rival.id,
    name: rival.name,
    company: rival.company,
    tier: rival.tier,
    capital: overrides.capital ?? initialCapital,
    initialCapital,
    consecutiveLoss: 0,
    marketShare: 0,
    price: overrides.price || gameState.rivalPrice || gameState.rivalCost * rival.baseStrategy.priceMultiplier || 10000,
    cost: overrides.cost || gameState.rivalCost || 3000,
    quality: overrides.quality || rival.stats.quality,
    orderAmount: 0,
    actualSales: 0,
    netProfit: 0,
  }
}

export function getNextRival(gameState) {
  const stage = getCurrentStage(gameState.floor)
  const currentId = gameState.rivals?.[0]?.id || stage?.rival
  const currentIndex = RIVALS.findIndex(rival => rival.id === currentId)
  const next = RIVALS[Math.min(currentIndex + 1, RIVALS.length - 1)] || RIVALS[0]
  return createRivalState(next.id, gameState)
}

export function generateNewRival(gameState) {
  const stage = getCurrentStage(gameState.floor)
  const usedIds = new Set([
    stage?.rival,
    ...(gameState.rivals || []).map(rival => rival.id),
  ].filter(Boolean))
  const fallbackIndex = Math.max(RIVALS.findIndex(rival => rival.id === stage?.rival), 0)
  const candidate =
    RIVALS.find((rival, index) => index >= fallbackIndex && !usedIds.has(rival.id)) ||
    RIVALS.find(rival => !usedIds.has(rival.id)) ||
    RIVALS[fallbackIndex] ||
    RIVALS[0]

  return createRivalState(candidate.id, gameState, {
    initialCapital: Math.floor((gameState.rivalInitialCapital || gameState.capital || 5000000) * 0.75),
  })
}

export function calcRivalStrategy(rivalId, gameState, playerShare) {
  const rival = RIVALS.find(item => item.id === rivalId)
  if (!rival) return null

  const phase = ECO_PHASES[gameState.econPhase] ? gameState.econPhase : 'stable'
  const baseCost = gameState.rivalCost || 3000

  let price = Math.floor(baseCost * rival.baseStrategy.priceMultiplier)
  price = Math.floor(price * (PHASE_PRICE_MODIFIER[phase] || 1.0))

  if (playerShare > 0.8) {
    price = Math.floor(price * 0.70)
  } else if (playerShare > 0.6) {
    price = Math.floor(price * 0.85)
  }

  const playerPrice = gameState.currentStrategy?.price || 0
  if (playerPrice > 0 && playerPrice < price * 0.80) {
    price = Math.floor(price * 0.90)
  }

  let quality = rival.stats.quality
  quality += PHASE_QUALITY_MODIFIER[phase] || 0

  if ((gameState.quality || 0) > quality + 10) {
    quality += 3
  }

  const totalDemand = gameState.lastTotalDemand || 1000
  const rivalShare = Math.max(1 - playerShare, 0)
  const expectedSales = Math.floor(totalDemand * rivalShare)
  let orderAmount = Math.floor(expectedSales * rival.baseStrategy.orderMultiplier)

  if (phase === 'boom' || phase === 'growth') {
    orderAmount = Math.floor(orderAmount * 1.2)
  } else if (phase === 'recession') {
    orderAmount = Math.floor(orderAmount * 0.7)
  }

  if (rivalId === 'hyekyung') {
    const playerOrder = gameState.currentStrategy?.orderAmount || 0
    orderAmount = Math.floor(playerOrder * 1.2)
    price = Math.floor(playerPrice * 0.85)
  }

  const marketingRate = MARKETING_BUDGET_MAP[rival.baseStrategy.marketingBudget] || 0.05
  const marketingBudget = Math.floor((Number.isFinite(gameState.rivalCapital) ? gameState.rivalCapital : 0) * marketingRate)

  return {
    price,
    quality,
    orderAmount,
    marketingBudget,
    awareness: rival.stats.awareness,
    brand: rival.stats.brand,
  }
}

export function settleRival(rivalState, playerShare, gameState, rivalShareOverride = null) {
  const stage = getCurrentStage(gameState.floor)
  const rivalId = rivalState.id || stage?.rival
  const strategyState = {
    ...gameState,
    rivalCapital: rivalState.capital ?? gameState.rivalCapital,
    rivalCost: rivalState.cost ?? gameState.rivalCost,
  }
  const strategy = rivalId
    ? calcRivalStrategy(rivalId, strategyState, playerShare)
    : null

  const price = strategy?.price || rivalState.price || 10000
  const quality = strategy?.quality || 8
  const orderAmount = strategy?.orderAmount || 100
  const marketingBudget = strategy?.marketingBudget || 0

  const totalDemand = gameState.lastTotalDemand || 1000
  const rivalShare = rivalShareOverride ?? Math.max(1 - playerShare, 0)
  const maxSales = Math.floor(totalDemand * rivalShare)
  const actualSales = Math.min(orderAmount, maxSales)
  const unsoldAmount = Math.max(orderAmount - actualSales, 0)
  const inventoryLoss = Math.floor(unsoldAmount * (rivalState.cost || 3000) * 0.3)

  const rivalRevenue = actualSales * price
  const rivalProductionCost = orderAmount * (rivalState.cost || 3000)
  const rivalFixedCost = rivalState.operatingCost || 1500000
  const rivalInterest = rivalState.debt
    ? Math.floor((rivalState.debt * 0.065) / 12)
    : 0
  const rivalMarketingCost = marketingBudget
  const rivalNetProfit = rivalRevenue
    - rivalProductionCost
    - rivalFixedCost
    - rivalInterest
    - rivalMarketingCost
    - inventoryLoss

  return {
    ...rivalState,
    price,
    quality,
    marketShare: rivalShare,
    orderAmount,
    actualSales,
    unsoldAmount,
    capital: rivalState.capital + rivalNetProfit,
    netProfit: rivalNetProfit,
    consecutiveLoss: rivalNetProfit < 0
      ? (rivalState.consecutiveLoss || 0) + 1
      : 0,
  }
}

export function checkRivalBankrupt(rivalState) {
  return rivalState.capital < 0 && (rivalState.consecutiveLoss || 0) >= 4
}

export function checkSpecialAbility(floor, stageTurn) {
  const stage = getCurrentStage(floor)
  if (!stage?.specialAbility) return null

  const { type, interval, effect } = stage.specialAbility
  if (!interval || stageTurn % interval !== 0) return null
  return { type, effect }
}

export function checkMarketIntervention(floor, stageTurn) {
  const stage = getCurrentStage(floor)
  if (!stage?.marketIntervention) return null

  const { type, interval, effect, duration } = stage.marketIntervention
  if (!interval || stageTurn % interval !== 0) return null
  return { type, effect, duration: duration || 1, source: 'MONOPOL' }
}

export function getBossCounterStrategy(playerStrategy, bossLastStrategy) {
  if (!bossLastStrategy) return { isCounter: false }

  const isRepeating =
    Math.abs((bossLastStrategy.price || 0) - (playerStrategy.price || 0)) < 100 &&
    Math.abs((bossLastStrategy.orderAmount || 0) - (playerStrategy.orderAmount || 0)) < 50

  if (isRepeating) {
    return {
      priceMultiplier: 0.65,
      qualityBoost: 15,
      marketingMultiplier: 2.5,
      isCounter: true,
      counterMessage: '혜경이 당신의 전략을 읽었다. 패턴을 바꿔라.',
    }
  }

  return {
    priceMultiplier: 1.0,
    qualityBoost: 5,
    marketingMultiplier: 1.5,
    isCounter: false,
  }
}

export function checkBossClearCondition(bossShareHistory) {
  if (!bossShareHistory || bossShareHistory.length < 3) return false
  return bossShareHistory.slice(-3).every(share => share < 0.5)
}

export function getStageFailPenalty() {
  return {
    healthPenalty: 1,
    capitalPenaltyRate: 0.1,
    rivalCapitalMultiplierBonus: 0.2,
  }
}

export function calcTurnsToRivalBankrupt(rivalCapital, rivalNetProfit) {
  if (!rivalNetProfit || rivalNetProfit >= 0) return null
  if (rivalCapital <= 0) return 0
  return Math.ceil(rivalCapital / Math.abs(rivalNetProfit))
}
