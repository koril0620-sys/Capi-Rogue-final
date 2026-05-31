import { useGameStore } from '../../store/useGameStore'
import { updateSetting, resetSettings } from '../../logic/settingsEngine'
import { applyAudioSettings, playSFX } from '../../logic/audioEngine'

export default function GameSettings() {
  const settings = useGameStore(s => s.settings)
  const devMode = useGameStore(s => s.devMode)
  const updateSettingStore = useGameStore(s => s.updateSetting)
  const setCurrentScreen = useGameStore(s => s.setCurrentScreen)

  const handleChange = (key, value) => {
    updateSettingStore(key, value)
    updateSetting(key, value)
    applyAudioSettings({ ...settings, [key]: value })
    playSFX('click')
  }

  const handleReset = () => {
    const defaults = resetSettings()
    useGameStore.getState().setSettings(defaults)
    applyAudioSettings(defaults)
  }

  return (
    <div className="cr2-settings-screen cr2-scrollable">
      <div className="cr2-settings-header">
        <div className="cr2-settings-title">설정</div>
        <button
          className="cr2-btn cr2-back-btn"
          onClick={() => {
            const prev = useGameStore.getState().previousScreen
            console.log('[settings-debug] GameSettings back previousScreen:', prev)
            setCurrentScreen(prev || 'main')
          }}
        >
          ←
        </button>
      </div>

      <div className="cr2-settings-section">
        <div className="cr2-settings-section-title">오디오</div>

        <ToggleSetting
          label="BGM"
          value={settings.bgmOn}
          onChange={v => handleChange('bgmOn', v)}
        />
        <ToggleSetting
          label="효과음"
          value={settings.sfxOn}
          onChange={v => handleChange('sfxOn', v)}
        />
        <SliderSetting
          label="마스터 볼륨"
          value={settings.masterVolume}
          onChange={v => handleChange('masterVolume', v)}
        />
        <SliderSetting
          label="BGM 볼륨"
          value={settings.bgmVolume}
          onChange={v => handleChange('bgmVolume', v)}
        />
        <SliderSetting
          label="효과음 볼륨"
          value={settings.sfxVolume}
          onChange={v => handleChange('sfxVolume', v)}
        />
      </div>

      <div className="cr2-settings-section">
        <div className="cr2-settings-section-title">게임플레이</div>

        <ToggleSetting
          label="튜토리얼"
          value={settings.tutorial}
          onChange={v => handleChange('tutorial', v)}
        />
        <ToggleSetting
          label="경제 힌트"
          value={settings.economyHint}
          onChange={v => handleChange('economyHint', v)}
        />
        <ToggleSetting
          label="전략 경고"
          value={settings.strategyWarning}
          onChange={v => handleChange('strategyWarning', v)}
        />
        <ToggleSetting
          label="배경 이미지"
          value={settings.background}
          onChange={v => handleChange('background', v)}
        />
      </div>

      <div className="cr2-settings-section">
        <div className="cr2-settings-section-title">마케팅 한도 방식</div>
        <div className="cr2-settings-marketing-mode">
          <button
            className={`cr2-btn cr2-mode-btn ${settings.marketingLimitMode === 'ratio' ? 'cr2-selected' : ''}`}
            onClick={() => handleChange('marketingLimitMode', 'ratio')}
          >
            자본 비율형
            <span className="cr2-mode-desc">자본 × 0.3</span>
          </button>
          <button
            className={`cr2-btn cr2-mode-btn ${settings.marketingLimitMode === 'fixed' ? 'cr2-selected' : ''}`}
            onClick={() => handleChange('marketingLimitMode', 'fixed')}
          >
            고정 상한형
            <span className="cr2-mode-desc">MIN(자본×0.2, 500만원)</span>
          </button>
        </div>
      </div>

      <button className="cr2-btn cr2-settings-reset-btn" onClick={handleReset}>
        설정 초기화
      </button>
      <div style={{
        marginTop: '16px',
        borderTop: '1px solid rgba(0,255,65,0.15)',
        paddingTop: '12px',
      }}>
        <ToggleSetting
          label="DEV 모드"
          value={devMode}
          onChange={v => useGameStore.getState().setDevMode(v)}
        />
      </div>
    </div>
  )
}

function ToggleSetting({ label, value, onChange }) {
  return (
    <div className="cr2-setting-row">
      <span className="cr2-setting-label">{label}</span>
      <button
        className={`cr2-toggle ${value ? 'cr2-toggle-on' : 'cr2-toggle-off'}`}
        onClick={() => onChange(!value)}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}

function SliderSetting({ label, value, onChange }) {
  return (
    <div className="cr2-setting-row cr2-setting-slider">
      <span className="cr2-setting-label">{label}</span>
      <div className="cr2-slider-wrap">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="cr2-slider"
        />
        <span className="cr2-slider-value">{value}</span>
      </div>
    </div>
  )
}
