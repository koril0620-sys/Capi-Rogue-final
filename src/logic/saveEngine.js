import { supabase } from '../lib/supabaseClient'
import { useGameStore } from '../store/useGameStore'

const EXCLUDE_FIELDS = [
  'currentScreen',
  'isPaused',
  'stagePopup',
  'learningPopup',
  'newAchievements',
  'lastSettlementResult',
]

export function serializeGameState(gameState) {
  const serialized = {}

  for (const [key, value] of Object.entries(gameState)) {
    if (typeof value === 'function') continue
    if (EXCLUDE_FIELDS.includes(key)) continue
    serialized[key] = value
  }

  return serialized
}

export function hydrateGameState(savedJson) {
  return { ...(savedJson || {}) }
}

export async function saveOnFloorEnter(gameState = useGameStore.getState()) {
  const { playerId, currentSlot } = gameState
  if (!playerId || !currentSlot) return false
  if (!supabase) return false

  const serialized = serializeGameState(gameState)

  try {
    const { error } = await supabase
      .from('game_saves')
      .upsert({
        user_id: playerId,
        slot_number: currentSlot,
        game_state_json: serialized,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,slot_number',
      })

    return !error
  } catch {
    return false
  }
}

export async function loadSaveSlots(userId) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('slot_number, game_state_json, updated_at')
      .eq('user_id', userId)
      .order('slot_number')

    if (error) return []
    return data || []
  } catch {
    return []
  }
}

export async function loadSaveSlot(userId, slotNumber) {
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('game_state_json')
      .eq('user_id', userId)
      .eq('slot_number', slotNumber)
      .single()

    if (error || !data) return null
    return hydrateGameState(data.game_state_json)
  } catch {
    return null
  }
}

export async function deleteSaveSlot(userId, slotNumber) {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('game_saves')
      .delete()
      .eq('user_id', userId)
      .eq('slot_number', slotNumber)

    return !error
  } catch {
    return false
  }
}

export async function saveRecord(userId, recordData) {
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from('records')
      .insert({
        user_id: userId,
        result_type: recordData.result_type,
        clear_grade: recordData.clear_grade || null,
        advisor_id: recordData.advisor_id,
        final_capital: recordData.final_capital,
        clear_floor: recordData.clear_floor,
        playtime: recordData.playtime,
        profit_turns: recordData.profit_turns,
        loss_turns: recordData.loss_turns,
        max_share: recordData.max_share,
        bankruptcy_count: recordData.bankruptcy_count,
        external_events: recordData.external_events,
        event_success_rate: recordData.event_success_rate,
        rival_dominated: recordData.rival_dominated,
        monopol_clears: recordData.monopol_clears || [],
        created_at: new Date().toISOString(),
      })

    return !error
  } catch {
    return false
  }
}

export async function loadAllRecords(userId) {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return []
    return data || []
  } catch {
    return []
  }
}

export function saveGame() {}

export function loadGame() {
  return null
}
