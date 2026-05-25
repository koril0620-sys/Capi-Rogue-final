import { getCurrentStage } from '../constants/monopol'

export function getRivalInitialCapital(floor, playerCapital) {
  const stage = getCurrentStage(floor)
  if (!stage) return 0
  if (stage.capitalMultiplier === Infinity) return Infinity
  return Math.floor(playerCapital * stage.capitalMultiplier)
}

export function settleRival(rivalState, playerShare, gameState) {
  const totalDemand = gameState.totalDemand || 10000
  const rivalShare = Math.max(1 - playerShare, 0)
  const rivalSales = Math.floor(totalDemand * rivalShare)
  const rivalRevenue = rivalSales * (rivalState.price || 10000)
  const rivalCost = rivalSales * (rivalState.cost || 3000)
  const rivalFixedCost = rivalState.operatingCost || 1500000
  const rivalInterest = rivalState.debt
    ? Math.floor((rivalState.debt * 0.065) / 12)
    : 0
  const rivalNetProfit = rivalRevenue - rivalCost - rivalFixedCost - rivalInterest

  return {
    ...rivalState,
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
