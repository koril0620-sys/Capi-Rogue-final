import { supabase } from '../lib/supabaseClient'
import { useGameStore } from '../store/useGameStore'

export async function saveOnFloorEnter(gameState = useGameStore.getState()) {
  const { playerId, currentSlot } = gameState
  if (!playerId || !currentSlot) return false

  try {
    const { error } = await supabase
      .from('game_saves')
      .upsert({
        user_id: playerId,
        slot_number: currentSlot,
        game_state_json: gameState,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,slot_number',
      })

    if (error) {
      console.error('저장 실패:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('저장 오류:', err)
    return false
  }
}

export async function loadSaveSlots(userId) {
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
  try {
    const { data, error } = await supabase
      .from('game_saves')
      .select('game_state_json')
      .eq('user_id', userId)
      .eq('slot_number', slotNumber)
      .single()

    if (error || !data) return null
    return data.game_state_json
  } catch {
    return null
  }
}

export async function deleteSaveSlot(userId, slotNumber) {
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
