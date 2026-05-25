import { useEffect } from 'react'
import { useGameStore } from './store/useGameStore'
import { loadSettings } from './logic/settingsEngine'
import { tryAutoLogin } from './logic/authEngine'

import LoginScreen from './screens/LoginScreen'
import TitleScreen from './screens/TitleScreen'
import CharacterCreateScreen from './screens/CharacterCreateScreen'
import AdvisorSelectScreen from './screens/AdvisorSelectScreen'
import SlotSelectScreen from './screens/SlotSelectScreen'
import MainScreen from './screens/MainScreen'
import EventScreen from './screens/EventScreen'
import ResultScreen from './screens/ResultScreen'
import RewardScreen from './screens/RewardScreen'
import GameOverScreen from './screens/GameOverScreen'
import EndingScreen from './screens/EndingScreen'
import BossScreen from './screens/BossScreen'
import AchievementScreen from './screens/AchievementScreen'

export default function App() {
  const currentScreen = useGameStore(s => s.currentScreen)
  const setCurrentScreen = useGameStore(s => s.setCurrentScreen)
  const setSettings = useGameStore(s => s.setSettings)

  useEffect(() => {
    const settings = loadSettings()
    setSettings(settings)

    tryAutoLogin().then(success => {
      setCurrentScreen(success ? 'title' : 'login')
    })
  }, [setCurrentScreen, setSettings])

  const screens = {
    login: <LoginScreen />,
    title: <TitleScreen />,
    characterCreate: <CharacterCreateScreen />,
    advisorSelect: <AdvisorSelectScreen />,
    slotSelect: <SlotSelectScreen />,
    main: <MainScreen />,
    event: <EventScreen />,
    result: <ResultScreen />,
    reward: <RewardScreen />,
    gameOver: <GameOverScreen />,
    ending: <EndingScreen />,
    boss: <BossScreen />,
    achievement: <AchievementScreen />,
  }

  return screens[currentScreen] || <LoginScreen />
}
