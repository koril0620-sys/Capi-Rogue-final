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
import { isBossStage } from '../constants/monopol'

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
  state.capital -= validMarketing
  result.marketingCost = validMarketing

  const allAttractions = calcAllAttractions(state)
  const { totalDemand, share } = calcTotalDemand(state, allAttractions)
  result.totalDemand = totalDemand

  const realCost = state.cost * (1 - (state.costReductionTotal || 0))
  const activeEffectCostMultiplier = state.activeEffects
    .filter(effect => effect.costMultiplier)
    .reduce((multiplier, effect) => multiplier * effect.costMultiplier, 1)
  const finalCost = Math.floor(realCost * activeEffectCostMultiplier)

  const maxAffordable = Math.floor(state.capital / Math.max(finalCost, 1))
  const orderAmount = Math.min(state.currentStrategy.orderAmount || 0, maxAffordable)
  const actualSales = Math.min(orderAmount, Math.floor(totalDemand))
  const unitPrice = state.currentStrategy.price || state.cost * 2
  const revenue = actualSales * unitPrice
  const totalCost = orderAmount * finalCost

  const totalOperatingCost = Object.values(OPERATING_COSTS).reduce((sum, value) => sum + value, 0)

  const { interestAmount, isLate, interestPaid } = processInterest(state)
  result.interestAmount = interestAmount
  result.interestLate = isLate
  result.interestPaid = interestPaid

  const netProfit = revenue - totalCost - validMarketing - totalOperatingCost - interestAmount
  state.capital += revenue - totalCost - totalOperatingCost - interestAmount
  result.revenue = revenue
  result.totalCost = totalCost
  result.operatingCost = totalOperatingCost
  result.netProfit = netProfit
  result.shareAfter = share
  result.isProfit = netProfit > 0
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

  state.econPhase = transitionPhase(state.econPhase, state.activeEffects, state.floor, state.selectedAdvisor)
  state.activeEffects = tickActiveEffects(state.activeEffects)
  state.stats = updateStats(state.stats, result, state)

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
  result.rivalNetProfit = updatedRival.netProfit
  result.rivalBankrupt = checkRivalBankrupt(updatedRival)
  state.rivalBankrupt = result.rivalBankrupt

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

  if (isBossStage(state.floor)) {
    const bossShare = 1 - share
    state.bossShareHistory = [...(state.bossShareHistory || []).slice(-2), bossShare]
    result.bossClear = checkBossClearCondition(state.bossShareHistory)
  }

  state.stageTurn = (state.stageTurn || 1) + 1
  state.lastCapital = state.capital
  state.factoryActionThisTurn = null

  const newlyUnlocked = checkAchievements(state, result)
  result.newlyUnlocked = newlyUnlocked

  return { updatedState: state, settlementResult: result }
}

function updateStats(stats, result, state) {
  return {
    ...stats,
    playtime: (stats.playtime || 0) + 1,
    profitTurns: result.isProfit ? (stats.profitTurns || 0) + 1 : (stats.profitTurns || 0),
    lossTurns: !result.isProfit ? (stats.lossTurns || 0) + 1 : (stats.lossTurns || 0),
    maxShare: Math.max(stats.maxShare || 0, result.shareAfter || 0),
    profitStreak: result.isProfit ? (stats.profitStreak || 0) + 1 : 0,
    bankruptcyCount: state.bankruptcyTurns === 1
      ? (stats.bankruptcyCount || 0) + 1
      : (stats.bankruptcyCount || 0),
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
