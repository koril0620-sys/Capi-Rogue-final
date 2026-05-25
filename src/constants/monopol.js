export const MONOPOL_STAGES = []

export function getCurrentStage(floor) {
  return MONOPOL_STAGES.find(
    stage => floor >= stage.floorMin && floor <= stage.floorMax,
  ) || null
}

export function isNewStage(prevFloor, currentFloor) {
  const prev = getCurrentStage(prevFloor)
  const current = getCurrentStage(currentFloor)
  if (!prev || !current) return false
  return prev.id !== current.id
}

export function isBossStage(floor) {
  return floor === 120
}
