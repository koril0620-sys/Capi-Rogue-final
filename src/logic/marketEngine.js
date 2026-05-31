import { calcAttraction, calcShare } from './demandEngine'
import { getCurrentStage } from '../constants/monopol'
import { RIVALS } from '../constants/rivals'

export function calcAllAttractions(gameState) {
  const stage = getCurrentStage(gameState.floor)
  const activeRivals = Array.isArray(gameState.rivals) && gameState.rivals.length > 0
    ? gameState.rivals
    : stage ? [{ id: stage.rival }] : []

  const playerAttractions = ['quality', 'brand', 'price', 'general'].map(group =>
    calcAttraction(
      {
        quality: gameState.quality,
        brand: gameState.brand,
        awareness: gameState.awareness,
        price: gameState.currentStrategy.price || gameState.cost * 2,
      },
      group,
      gameState.econPhase,
    ),
  )
  const playerAvg = playerAttractions.reduce((sum, attraction) => sum + attraction, 0) / 4

  const result = [{ id: 'player', value: playerAvg }]

  activeRivals.forEach((activeRival) => {
    const rival = getRivalById(activeRival.id)
    if (!rival) return

    const rivalAttractions = ['quality', 'brand', 'price', 'general'].map(group =>
      calcAttraction(
        {
          quality: activeRival.quality || rival.stats.quality,
          brand: activeRival.brand || rival.stats.brand,
          awareness: activeRival.awareness || rival.stats.awareness || 20,
          price: activeRival.price || gameState.rivalPrice || gameState.cost * 2,
        },
        group,
        gameState.econPhase,
      ),
    )
    const rivalAvg = rivalAttractions.reduce((sum, attraction) => sum + attraction, 0) / 4
    result.push({ id: rival.id, value: rivalAvg })
  })

  return result
}

function getRivalById(id) {
  return RIVALS.find(rival => rival.id === id) || null
}

export function calcPlayerShare(gameState) {
  const allAttractions = calcAllAttractions(gameState)
  const playerAttr = allAttractions.find(attraction => attraction.id === 'player')?.value || 0
  return calcShare(playerAttr, allAttractions.map(attraction => attraction.value))
}

export function calcRivalShare(gameState) {
  const allAttractions = calcAllAttractions(gameState)
  const rivalAttr = allAttractions.find(attraction => attraction.id !== 'player')?.value || 0
  return calcShare(rivalAttr, allAttractions.map(attraction => attraction.value))
}

export function calculateMarketShare() {
  return 0
}
