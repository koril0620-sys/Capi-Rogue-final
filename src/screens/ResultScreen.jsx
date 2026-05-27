import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { generateReport } from '../logic/reportEngine'
import { saveOnFloorEnter } from '../logic/saveEngine'
import { getClearGrade } from '../logic/rewardEngine'
import { getCurrentStage, isBossStage } from '../constants/monopol'
import { playSFX } from '../logic/audioEngine'
import { getMaturedLoans } from '../logic/loanEngine'
import AchievementToast from '../components/AchievementToast'
import LoanMaturityAlert from '../components/LoanMaturityAlert'
import '../styles/result.css'

export default function ResultScreen() {
  const gameState = useGameStore(state => state)
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const setFloor = useGameStore(state => state.setFloor)
  const [saving, setSaving] = useState(false)

  const settlementResult = gameState.lastSettlementResult || {}
  const report = generateReport(gameState, settlementResult, gameState.selectedAdvisor)
  const maturedLoans = getMaturedLoans(gameState.loans || [])
  const [showAlert, setShowAlert] = useState(maturedLoans.length > 0)
  const [alertLoan, setAlertLoan] = useState(maturedLoans[0] || null)

  const handleNextFloor = async () => {
    setSaving(true)
    playSFX('nextfloor')

    const nextFloor = gameState.floor + 1

    if (nextFloor > 120) {
      const grade = getClearGrade(gameState)
      useGameStore.setState({ clearGrade: grade, isClear: true })
      setCurrentScreen('ending')
      return
    }

    if (isBossStage(nextFloor)) {
      setFloor(nextFloor)
      await saveOnFloorEnter({ ...gameState, floor: nextFloor })
      setSaving(false)
      setCurrentScreen('boss')
      return
    }

    if (nextFloor % 20 === 0 || nextFloor % 10 === 0 || nextFloor % 5 === 0) {
      setFloor(nextFloor)
      await saveOnFloorEnter({ ...gameState, floor: nextFloor })
      setSaving(false)
      setCurrentScreen('reward')
      return
    }

    setFloor(nextFloor)
    await saveOnFloorEnter({ ...gameState, floor: nextFloor })
    setSaving(false)
    setCurrentScreen('main')
  }

  return (
    <div className="cr2-result-screen">
      <div className="cr2-result-header">
        <div className="cr2-result-floor">FLOOR {gameState.floor} REPORT</div>
        <div className="cr2-result-title">MONTHLY SETTLEMENT &nbsp; 월말 정산</div>
        <div className={`cr2-result-profit ${settlementResult.isProfit ? 'cr2-positive' : 'cr2-negative'}`}>
          이번 달 최종 순이익: {((settlementResult.netProfit || 0) / 10000).toFixed(0)}만원
        </div>
      </div>

      <div className="cr2-result-body">
        <div className="cr2-result-left">
          <div className="cr2-result-section">
            <div className="cr2-result-section-title">점유율</div>
            <div className="cr2-result-share">
              {Math.round((settlementResult.shareAfter || 0) * 100)}%
            </div>
          </div>

          <div className="cr2-result-section">
            <div className="cr2-result-section-title">매출 / 순이익</div>
            <RevenueChart gameState={gameState} />
          </div>

          <div className="cr2-result-grid">
            <div className="cr2-result-stat">
              <div className="cr2-stat-label">시장 점유율</div>
              <div className="cr2-stat-value">{Math.round((settlementResult.shareAfter || 0) * 100)}%</div>
            </div>
            <div className="cr2-result-stat">
              <div className="cr2-stat-label">총수요</div>
              <div className="cr2-stat-value">{(settlementResult.totalDemand || 0).toLocaleString()}</div>
            </div>
            <div className="cr2-result-stat">
              <div className="cr2-stat-label">생산량</div>
              <div className="cr2-stat-value">{(settlementResult.orderAmount || 0).toLocaleString()}</div>
            </div>
            <div className="cr2-result-stat">
              <div className="cr2-stat-label">실제 판매</div>
              <div className="cr2-stat-value">{(settlementResult.actualSales || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="cr2-result-income-stmt">
            <div className="cr2-income-row cr2-income-revenue">
              <span>매출액</span>
              <span className="cr2-positive">+{((settlementResult.revenue || 0) / 10000).toFixed(0)}만원</span>
            </div>
            <div className="cr2-income-row">
              <span>(-) 생산비</span>
              <span className="cr2-negative">-{((settlementResult.totalCost || 0) / 10000).toFixed(0)}만원</span>
            </div>
            <div className="cr2-income-row cr2-income-gross">
              <span>= 매출총이익</span>
              <span className={((settlementResult.revenue || 0) - (settlementResult.totalCost || 0)) >= 0 ? 'cr2-positive' : 'cr2-negative'}>
                {(((settlementResult.revenue || 0) - (settlementResult.totalCost || 0)) / 10000).toFixed(0)}만원
              </span>
            </div>
            <div className="cr2-income-sub">
              <div>임대료: -{(500000 / 10000).toFixed(0)}만원</div>
              <div>인건비: -{(800000 / 10000).toFixed(0)}만원</div>
              <div>기타: -{(200000 / 10000).toFixed(0)}만원</div>
            </div>
            <div className="cr2-income-row">
              <span>(-) 운영비</span>
              <span className="cr2-negative">-{((settlementResult.operatingCost || 0) / 10000).toFixed(0)}만원</span>
            </div>
            <div className="cr2-income-row">
              <span>(-) 마케팅비</span>
              <span className="cr2-negative">-{((settlementResult.marketingCost || 0) / 10000).toFixed(0)}만원</span>
            </div>
            {(settlementResult.interestAmount || 0) > 0 && (
              <div className="cr2-income-row">
                <span>(-) 이자비용</span>
                <span className="cr2-negative">-{((settlementResult.interestAmount || 0) / 10000).toFixed(0)}만원</span>
              </div>
            )}
            <div className="cr2-income-row cr2-income-net">
              <span>= 순이익</span>
              <span className={settlementResult.isProfit ? 'cr2-positive' : 'cr2-negative'}>
                {settlementResult.isProfit ? '+' : ''}{((settlementResult.netProfit || 0) / 10000).toFixed(0)}만원
              </span>
            </div>
            <div className="cr2-income-row cr2-income-capital">
              <span>자본 변화</span>
              <span className={gameState.capital >= 0 ? 'cr2-positive' : 'cr2-negative'}>
                {(gameState.capital / 10000).toFixed(0)}만원
              </span>
            </div>
          </div>

          {settlementResult.factoryResult && (
            <FactoryResultSection result={settlementResult.factoryResult} />
          )}

          <MonopolSection gameState={gameState} settlementResult={settlementResult} />
        </div>

        <div className="cr2-result-right">
          <div className="cr2-result-report-title">
            FLOOR {gameState.floor} REPORT &nbsp; 결과 리포트
          </div>

          <div className="cr2-result-stats-mini">
            <div>경영 체력 {gameState.health}</div>
            <div>모멘텀 {gameState.momentum}</div>
            <div>다음 보상 {getRewardLabel(gameState.floor + 1)}</div>
          </div>

          <div className="cr2-result-advisor-panel">
            <div className="cr2-result-advisor-name">
              {getAdvisorName(gameState.selectedAdvisor)} &nbsp; 이번 달 결정 분석
            </div>

            <div className="cr2-result-advisor-sections">
              {report.advisor?.sections?.map(section => (
                <div key={`${section.label}-${section.text}`} className={`cr2-advisor-section cr2-advisor-${section.type}`}>
                  <span className="cr2-advisor-section-badge">{section.type === 'positive' ? '상승' : section.type === 'negative' ? '하락' : '선택'}</span>
                  <div>
                    <div className="cr2-advisor-section-label">{section.label}</div>
                    <div className="cr2-advisor-section-text">{section.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {report.advisor?.suggestion && (
              <div className="cr2-advisor-suggestion">
                제안: {report.advisor.suggestion}
              </div>
            )}

            {report.advisor?.warning && (
              <div className="cr2-advisor-warning cr2-negative">
                {report.advisor.warning}
              </div>
            )}
          </div>

          {report.learningHint && (
            <div className="cr2-result-learning-hint">
              {report.learningHint}
            </div>
          )}

          <div className="cr2-result-footer-hint cr2-gray">
            가격과 품질이 맞아떨어질 때 매출보다 마진이 먼저 살아납니다.
          </div>

          <button
            className="cr2-btn cr2-next-floor-btn"
            onClick={handleNextFloor}
            disabled={saving}
          >
            {saving ? '저장 중...' : '다음 층으로'}
          </button>
        </div>
      </div>

      {showAlert && alertLoan && (
        <LoanMaturityAlert
          loan={alertLoan}
          onClose={() => {
            setShowAlert(false)
            setAlertLoan(null)
          }}
        />
      )}

      <AchievementToast />
    </div>
  )
}

function RevenueChart({ gameState }) {
  const history = gameState.playerShareHistory || []
  const maxVal = Math.max(...history.map(Math.abs), 1)

  return (
    <div className="cr2-revenue-chart">
      {history.slice(-10).map((value, index) => (
        <div key={`chart-${index}`} className="cr2-chart-bar-wrap">
          <div
            className={`cr2-chart-bar ${value >= 0 ? 'cr2-chart-profit' : 'cr2-chart-loss'}`}
            style={{ height: `${(Math.abs(value) / maxVal) * 100}%` }}
          />
          <div className="cr2-chart-label">{history.length - 9 + index}F</div>
        </div>
      ))}
    </div>
  )
}

function FactoryResultSection({ result }) {
  return (
    <div className={`cr2-factory-result ${result.success ? 'cr2-factory-success' : 'cr2-factory-fail'}`}>
      <div className="cr2-factory-result-title">🏭 공장 작업 결과</div>
      {result.type === 'quality' ? (
        result.success ? (
          <>
            <div>품질 강화 성공</div>
            <div className="cr2-positive">+{result.qualityGain} (→ {result.newQuality})</div>
          </>
        ) : (
          <>
            <div className="cr2-negative">품질 강화 실패</div>
            <div>다음 시도 성공 확률 +10%</div>
          </>
        )
      ) : (
        result.success ? (
          <>
            <div>원가 절감 성공</div>
            <div className="cr2-positive">-{(result.reductionGain * 100).toFixed(1)}%</div>
            <div>누적 절감: {(result.newCostReductionTotal * 100).toFixed(1)}% / 40%</div>
          </>
        ) : (
          <div className="cr2-negative">원가 절감 실패</div>
        )
      )}
      <div className="cr2-negative">비용: 500,000원 차감</div>
    </div>
  )
}

function MonopolSection({ gameState, settlementResult }) {
  const stage = getCurrentStage(gameState.floor)
  if (!stage) return null

  const ratio = gameState.rivalInitialCapital > 0
    ? Math.max(gameState.rivalCapital / gameState.rivalInitialCapital, 0)
    : 0

  return (
    <div className="cr2-monopol-section">
      <div className="cr2-monopol-title">🏢 MONOPOL 현황</div>
      <div className="cr2-monopol-rival">{stage.rivalName} ({stage.company})</div>
      <div className="cr2-monopol-bar-track">
        <div
          className="cr2-monopol-bar"
          style={{
            width: `${Math.min(ratio * 100, 100)}%`,
            background: ratio <= 0.3 ? 'var(--cr2-red)' : ratio <= 0.7 ? 'var(--cr2-gold)' : 'var(--cr2-green)',
          }}
        />
      </div>
      <div>자본: {(gameState.rivalCapital / 10000).toFixed(0)}만원</div>
      {settlementResult.rivalNetProfit !== undefined && (
        <div className={settlementResult.rivalNetProfit < 0 ? 'cr2-positive' : 'cr2-negative'}>
          이번 달 손익: {settlementResult.rivalNetProfit < 0 ? '▼' : '▲'}
          {Math.abs(settlementResult.rivalNetProfit / 10000).toFixed(0)}만원
        </div>
      )}
      {settlementResult.rivalBankrupt && (
        <div className="cr2-positive cr2-blink">⚡ 라이벌 파산!</div>
      )}
      {settlementResult.monopolIntervention && (
        <div className="cr2-negative">
          ⚠️ MONOPOL 시장 개입: {settlementResult.monopolIntervention.description}
        </div>
      )}
    </div>
  )
}

function getAdvisorName(id) {
  const names = { raider: 'The Raider', guardian: 'The Guardian', analyst: 'The Analyst', gambler: 'The Gambler' }
  return names[id] || 'The Analyst'
}

function getRewardLabel(floor) {
  if (floor % 20 === 0 || floor % 10 === 0 || floor % 5 === 0) return '이번 달'
  const next = Math.ceil(floor / 5) * 5
  return `${next - floor}개월 후`
}
