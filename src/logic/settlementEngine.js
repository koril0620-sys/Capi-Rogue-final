import { calcAllAttractions } from './marketEngine'
import { calcTotalDemand } from './demandEngine'
import { updateAwareness, updateBrand, getMarketingLimit } from './brandQualityEngine'
import { updateMomentum } from './momentumEngine'
import { updateCreditScore } from './creditEngine'
import { checkBankruptcy, checkGameOver, autoHealthRecovery, checkStreakBonus } from './healthEngine'
import { processInterest, tickLoanDurations } from './loanEngine'
import { transitionPhase, tickActiveEffects } from './econEngine'
import { attemptQualityUpgrade, attemptCostReduction } from './factoryEngine'
import { checkAchievements } from './achievementEngine'
import {
  settleRival,
  checkRivalBankrupt,
  checkMarketIntervention,
  checkSpecialAbility,
  checkBossClearCondition,
} from './monopolEngine'
import { OPERATING_COSTS } from '../constants/economy'
import { getCurrentStage, isBossStage } from '../constants/monopol'

export function settle(gameState) {
  const state = {
    ...gameState,
    currentStrategy: gameState.currentStrategy || {},
    activeEffects: gameState.activeEffects || [],
    loans: gameState.loans || [],
    momentumHistory: gameState.momentumHistory || [],
    stats: gameState.stats || {},
    unlockedAchievements: gameState.unlockedAchievements || [],
  }
  const result = {}

  if (state.factoryActionThisTurn) {
    const { type } = state.factoryActionThisTurn
    const factoryResult = type === 'quality'
      ? attemptQualityUpgrade(state)
      : attemptCostReduction(state)

    state.capital -= factoryResult.cost

    if (factoryResult.success) {
      if (type === 'quality') {
        state.quality = factoryResult.newQuality
        state.qualityUpgradeCount = (state.qualityUpgradeCount || 0) + 1
        state.factoryFailStreak = 0
      } else {
        state.costReductionTotal = factoryResult.newCostReductionTotal
        state.costReductionCount = (state.costReductionCount || 0) + 1
        state.costReductionFailStreak = 0
      }
    } else if (type === 'quality') {
      state.factoryFailStreak = (state.factoryFailStreak || 0) + 1
    } else {
      state.costReductionFailStreak = (state.costReductionFailStreak || 0) + 1
    }

    result.factoryResult = factoryResult
  }

  const marketingLimit = getMarketingLimit(state.capital, state.settings?.marketingLimitMode || 'ratio')
  const validMarketing = Math.min(state.currentStrategy.marketingBudget || 0, marketingLimit)
  result.marketingCost = validMarketing

  const allAttractions = calcAllAttractions(state)
  const { totalDemand: rawDemand, share } = calcTotalDemand(state, allAttractions)
  const activeEffectDemandMultiplier = state.activeEffects
    .filter(effect => effect.demandMultiplier)
    .reduce((multiplier, effect) => multiplier * effect.demandMultiplier, 1)
  const totalDemand = Math.floor(rawDemand * activeEffectDemandMultiplier)
  result.totalDemand = totalDemand
  state.lastTotalDemand = totalDemand

  const realCost = state.cost * (1 - (state.costReductionTotal || 0))
  const activeEffectCostMultiplier = state.activeEffects
    .filter(effect => effect.costMultiplier)
    .reduce((multiplier, effect) => multiplier * effect.costMultiplier, 1)
  const finalCost = Math.floor(realCost * activeEffectCostMultiplier)

  const availableCapital = Math.max(state.capital - validMarketing, 0)
  const maxAffordable = Math.floor(availableCapital / Math.max(finalCost, 1))
  const orderAmount = Math.min(state.currentStrategy.orderAmount || 0, maxAffordable)
  const myDemand = Math.floor(totalDemand * share)
  const actualSales = Math.min(orderAmount, myDemand)
  const unitPrice = state.currentStrategy.price || state.cost * 2
  const revenue = actualSales * unitPrice
  const totalCost = orderAmount * finalCost

  const totalOperatingCost = Object.values(OPERATING_COSTS).reduce((sum, value) => sum + value, 0)

  const interestRateBonus = state.activeEffects
    .filter(effect => effect.interestRateChange)
    .reduce((sum, effect) => sum + effect.interestRateChange, 0)
  const adjustedLoans = (state.loans || []).map(loan => ({
    ...loan,
    interestRate: Math.max((loan.interestRate || 0.065) + interestRateBonus, 0.01),
  }))
  const stateWithAdjustedLoans = { ...state, loans: adjustedLoans }
  const { interestAmount, isLate, interestPaid } = processInterest(stateWithAdjustedLoans)
  result.interestAmount = interestAmount
  result.interestLate = isLate
  result.interestPaid = interestPaid

  const netProfit = revenue - totalCost - validMarketing - totalOperatingCost - interestAmount
  state.capital += revenue - totalCost - validMarketing - totalOperatingCost - interestAmount
  result.revenue = revenue
  result.totalCost = totalCost
  result.operatingCost = totalOperatingCost
  result.netProfit = netProfit
  result.shareAfter = share
  result.prevShare = (state.playerShareHistory || []).at(-1) || 0
  result.isProfit = netProfit > 0
  result.myDemand = myDemand
  result.actualSales = actualSales
  result.orderAmount = orderAmount

  state.loans = tickLoanDurations(state.loans)

  state.awareness = updateAwareness(state.awareness, validMarketing, state.brand)
  state.brand = updateBrand(state.brand, netProfit, null)

  const { newHistory, momentum } = updateMomentum(
    state.momentumHistory,
    result.isProfit,
    state.selectedAdvisor,
  )
  state.momentumHistory = newHistory
  state.momentum = momentum

  const creditResult = updateCreditScore(state, result, state.selectedAdvisor)
  state.creditScore = creditResult.newScore
  result.creditResult = creditResult

  if (!result.isProfit) state.health = Math.max(state.health - 1, 0)
  state.health = Math.min(
    state.health + autoHealthRecovery(state.floor, state.selectedAdvisor),
    state.maxHealth,
  )
  state.health = Math.min(
    state.health + checkStreakBonus(newHistory, state.selectedAdvisor),
    state.maxHealth,
  )

  state.bankruptcyTurns = checkBankruptcy(state.capital, state.bankruptcyTurns)
  result.isGameOver = checkGameOver(state.health, state.bankruptcyTurns)

  const forcePhaseEffect = state.activeEffects.find(effect => effect.forcePhase)
  if (forcePhaseEffect) {
    const prevPhase = state.econPhase
    state.econPhase = forcePhaseEffect.forcePhase
    if (prevPhase !== state.econPhase) {
      import('./audioEngine').then(({ onPhaseChange }) => {
        onPhaseChange(state.econPhase)
      })
    }
  } else {
    state.econPhase = transitionPhase(
      state.econPhase,
      state.activeEffects,
      state.floor,
      state.selectedAdvisor,
    )
  }
  state.activeEffects = tickActiveEffects(state.activeEffects)

  const updatedRival = settleRival(
    {
      capital: state.rivalCapital,
      consecutiveLoss: state.rivalConsecutiveLoss,
      price: state.rivalPrice || 10000,
      cost: state.rivalCost || 3000,
      operatingCost: totalOperatingCost,
      debt: 0,
    },
    share,
    state,
  )
  state.rivalCapital = updatedRival.capital
  state.rivalConsecutiveLoss = updatedRival.consecutiveLoss
  state.rivalNetProfit = updatedRival.netProfit
  state.rivalPrice = updatedRival.price
  state.rivalQuality = updatedRival.quality
  state.rivalOrderAmount = updatedRival.orderAmount
  state.rivalActualSales = updatedRival.actualSales
  result.rivalNetProfit = updatedRival.netProfit
  result.rivalBankrupt = checkRivalBankrupt(updatedRival)
  state.rivalBankrupt = result.rivalBankrupt

  if (result.rivalBankrupt) {
    const stage = getCurrentStage(state.floor)
    if (stage && !state.metRivals?.includes(stage.rival)) {
      state.metRivals = [...(state.metRivals || []), stage.rival]
    }
  }

  const intervention = checkMarketIntervention(state.floor, state.stageTurn)
  if (intervention) {
    state.activeEffects = [
      ...state.activeEffects,
      {
        ...intervention.effect,
        type: intervention.type,
        source: 'MONOPOL',
        remainingTurns: intervention.duration || 1,
      },
    ]
    result.monopolIntervention = intervention
  }

  const specialAbility = checkSpecialAbility(state.floor, state.stageTurn, updatedRival)
  if (specialAbility) {
    result.rivalSpecialAbility = specialAbility
  }

  state.stats = updateStats(state.stats, result, state)

  if (isBossStage(state.floor)) {
    const bossShare = 1 - share
    state.bossShareHistory = [...(state.bossShareHistory || []).slice(-2), bossShare]
    state.bossCounterActive = isRepeatingStrategy(state.currentStrategy, state.bossLastPlayerStrategy)
    state.bossLastPlayerStrategy = { ...state.currentStrategy }
    result.bossClear = checkBossClearCondition(state.bossShareHistory)
  }

  state.stageTurn = (state.stageTurn || 1) + 1
  state.lastCapital = state.capital
  state.factoryActionThisTurn = null

  const newlyUnlocked = checkAchievements(state, result)
  result.newlyUnlocked = newlyUnlocked
  if (newlyUnlocked.length > 0) {
    state.unlockedAchievements = [
      ...new Set([...(state.unlockedAchievements || []), ...newlyUnlocked]),
    ]
  }

  state.revenueHistory = [
    ...(state.revenueHistory || []).slice(-9),
    result.revenue,
  ]
  state.profitHistory = [
    ...(state.profitHistory || []).slice(-9),
    result.netProfit,
  ]
  state.capitalHistory = [
    ...(state.capitalHistory || []).slice(-9),
    state.capital,
  ]

  return { updatedState: state, settlementResult: result }
}

function isRepeatingStrategy(currentStrategy = {}, lastStrategy = null) {
  if (!lastStrategy) return false
  return (
    Math.abs((lastStrategy.price || 0) - (currentStrategy.price || 0)) < 100 &&
    Math.abs((lastStrategy.orderAmount || 0) - (currentStrategy.orderAmount || 0)) < 50
  )
}

function updateStats(stats, result, state) {
  const newPhasesExperienced = [...(stats.phasesExperienced || [])]
  if (!newPhasesExperienced.includes(state.econPhase)) {
    newPhasesExperienced.push(state.econPhase)
  }

  return {
    ...stats,
    playtime: (stats.playtime || 0) + 1,
    profitTurns: result.isProfit
      ? (stats.profitTurns || 0) + 1
      : stats.profitTurns || 0,
    lossTurns: !result.isProfit
      ? (stats.lossTurns || 0) + 1
      : stats.lossTurns || 0,
    maxShare: Math.max(stats.maxShare || 0, result.shareAfter || 0),
    profitStreak: result.isProfit
      ? (stats.profitStreak || 0) + 1
      : 0,
    shareFirstStreak: result.shareAfter > 0.5
      ? (stats.shareFirstStreak || 0) + 1
      : 0,
    bankruptcyCount: state.bankruptcyTurns === 1
      ? (stats.bankruptcyCount || 0) + 1
      : stats.bankruptcyCount || 0,
    phasesExperienced: newPhasesExperienced,
    interestPaidCount: result.interestPaid
      ? (stats.interestPaidCount || 0) + 1
      : stats.interestPaidCount || 0,
    marketingCount: (result.marketingCost || 0) > 0
      ? (stats.marketingCount || 0) + 1
      : stats.marketingCount || 0,
    shareOverSustained: result.shareAfter >= 0.5
      ? (stats.shareOverSustained || 0) + 1
      : 0,
    healthLossCount: !result.isProfit
      ? (stats.healthLossCount || 0) + 1
      : stats.healthLossCount || 0,
    priceShareUp: (result.shareAfter || 0) > (result.prevShare || 0)
      ? (stats.priceShareUp || 0) + 1
      : stats.priceShareUp || 0,
    rivalsDefeated: result.rivalBankrupt
      ? (stats.rivalsDefeated || 0) + 1
      : stats.rivalsDefeated || 0,
    externalEventCount: result.monopolIntervention
      ? (stats.externalEventCount || 0) + 1
      : stats.externalEventCount || 0,
  }
}

export function getMaxOrderAmount(capital, cost, orderCap) {
  let safeCost = cost
  let safeOrderCap = orderCap

  if (!safeCost || safeCost <= 0) safeCost = 3000
  if (!capital || capital <= 0) return 0
  if (!safeOrderCap || safeOrderCap <= 0) safeOrderCap = 1000

  const capitalBased = Math.floor(capital / safeCost)
  const result = Math.min(capitalBased, safeOrderCap)
  if (capital >= safeCost && result <= 0) return 1
  return Math.max(result, 0)
}
