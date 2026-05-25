export const LEARNING_GOALS = []

export function getLearningGoal(floor) {
  return LEARNING_GOALS.find(
    goal => floor >= goal.floorMin && floor <= goal.floorMax,
  ) || null
}
