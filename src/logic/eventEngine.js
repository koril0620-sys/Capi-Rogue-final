import { EXTERNAL_EVENTS } from '../constants/events/external'
import { INTERNAL_EVENTS, CASH_CONSTANTS } from '../constants/events/internal'
import { RIVAL_EVENTS } from '../constants/events/rival'
import { FIXED_EVENT_FLOORS } from '../constants/economy'

export function rollExternalEvent(floor) {
  if (FIXED_EVENT_FLOORS.includes(floor)) {
    const forceEvents = EXTERNAL_EVENTS.filter(event => event.effect.forcePhase)
    return forceEvents[Math.floor(Math.random() * forceEvents.length)]
  }

  if (Math.random() > 0.40) return null
  return EXTERNAL_EVENTS[Math.floor(Math.random() * EXTERNAL_EVENTS.length)]
}

export function rollInternalEvent() {
  if (Math.random() > 0.60) return null
  return INTERNAL_EVENTS[Math.floor(Math.random() * INTERNAL_EVENTS.length)]
}

export function rollRivalEvent() {
  if (Math.random() > 0.30) return null

  const eligible = RIVAL_EVENTS.filter(() => {
    // TODO: 현재 구간 라이벌 티어 기반 필터
    return true
  })

  if (eligible.length === 0) return null
  return eligible[Math.floor(Math.random() * eligible.length)]
}

export function resolveChoice(choice, gameState, advisorId) {
  let outcomes = choice.outcome

  if (advisorId === 'gambler') {
    if (choice.type === 'GAMBLE') outcomes = boostProb(outcomes, 0.15)
    if (choice.type === 'ABSURD') outcomes = boostFirst(outcomes, 0.15)
  }

  if (Array.isArray(outcomes)) {
    const roll = Math.random()
    let cumulative = 0

    for (const outcome of outcomes) {
      cumulative += outcome.prob
      if (roll < cumulative) return outcome.result
    }

    return outcomes[outcomes.length - 1].result
  }

  return outcomes
}

export function resolveCashAmount(cashKey, capital) {
  const fn = CASH_CONSTANTS[cashKey]
  return fn ? fn(capital) : 0
}

export function applyExternalEffect(effect, gameState) {
  const newEffects = [...(gameState.activeEffects || [])]
  newEffects.push({ ...effect, remainingTurns: effect.duration || 1 })
  return newEffects
}

export function tickActiveEffects(activeEffects) {
  return activeEffects
    .map(effect => ({ ...effect, remainingTurns: effect.remainingTurns - 1 }))
    .filter(effect => effect.remainingTurns > 0)
}

function boostProb(outcomes, boost) {
  if (!Array.isArray(outcomes)) return outcomes
  return outcomes.map((outcome, index) => ({
    ...outcome,
    prob: index === 0 ? Math.min(outcome.prob + boost, 0.95) : outcome.prob,
  }))
}

function boostFirst(outcomes, boost) {
  if (!Array.isArray(outcomes)) return outcomes
  return outcomes.map((outcome, index) => ({
    ...outcome,
    prob: index === 0
      ? Math.min(outcome.prob + boost, 0.95)
      : Math.max(outcome.prob - boost / (outcomes.length - 1), 0.05),
  }))
}

export function getNextEvent() {
  return null
}
