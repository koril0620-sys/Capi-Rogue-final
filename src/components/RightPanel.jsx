import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getMaxOrderAmount } from '../logic/settlementEngine'
import { getMarketingLimit, updateAwareness } from '../logic/brandQualityEngine'
import { getSuccessRate, QUALITY_UPGRADE, COST_REDUCTION } from '../logic/factoryEngine'
import { getGrade, getLoanLimit } from '../logic/creditEngine'
import { takeLoan, repayLoan, extendLoan } from '../logic/loanEngine'
import { getCurrentStage } from '../constants/monopol'
import { LOAN_TYPES } from '../constants/creditScore'
import { playSFX } from '../logic/audioEngine'

export default function RightPanel({ activeTab, setActiveTab, onSettle }) {
  const gameState = useGameStore(state => state)
  const setCurrentStrategy = useGameStore(state => state.setCurrentStrategy)
  const setFactoryAction = useGameStore(state => state.setFactoryAction)

  const stage = getCurrentStage(gameState.floor)
  const rivalPrice = stage ? gameState.rivalPrice || 10000 : null

  const handleTabChange = (tab) => {
    playSFX('click')
    setActiveTab(tab)
  }

  return (
    <div className="cr2-right-panel">
      <div className="cr2-right-panel-tabs">
        {['sale', 'quality', 'operation', 'next'].map(tab => (
          <button
            key={tab}
            className={`cr2-subtab ${activeTab === tab ? 'cr2-subtab-active' : ''}`}
            onClick={() => handleTabChange(tab)}
          >
            {tab === 'sale' ? '판매' : tab === 'quality' ? '품질' : tab === 'operation' ? '운영' : '정산'}
          </button>
        ))}
      </div>

      {activeTab === 'sale' && (
        <SaleTab
          gameState={gameState}
          rivalPrice={rivalPrice}
          setCurrentStrategy={setCurrentStrategy}
        />
      )}
      {activeTab === 'quality' && (
        <QualityTab
          gameState={gameState}
          rivalPrice={rivalPrice}
          setCurrentStrategy={setCurrentStrategy}
        />
      )}
      {activeTab === 'operation' && (
        <OperationTab
          gameState={gameState}
          setCurrentStrategy={setCurrentStrategy}
          setFactoryAction={setFactoryAction}
        />
      )}
      {activeTab === 'next' && (
        <NextTab
          gameState={gameState}
          onSettle={onSettle}
        />
      )}
    </div>
  )
}

function SaleTab({ gameState, rivalPrice, setCurrentStrategy }) {
  const [selectedPrice, setSelectedPrice] = useState(null)
  const [customPrice, setCustomPrice] = useState('')
  const cost = gameState.cost || 3000

  const priceOptions = [
    { label: '원가 × 1.3', price: Math.floor(cost * 1.3) },
    { label: '원가 × 2', price: Math.floor(cost * 2) },
    { label: '원가 × 3', price: Math.floor(cost * 3) },
  ]

  const calcSimulation = (price) => {
    if (!price || price <= 0) return null

    const fixedCost = 1500000 + (gameState.loans || []).reduce((sum, loan) =>
      sum + Math.floor((loan.principal * loan.interestRate) / 12), 0)
    const margin = price - cost
    if (margin <= 0) return null

    const breakeven = Math.ceil(fixedCost / margin)
    const rivalDiff = rivalPrice
      ? (((price - rivalPrice) / rivalPrice) * 100).toFixed(1)
      : null
    return { breakeven, rivalDiff }
  }

  const handlePriceSelect = (price) => {
    playSFX('click')
    setSelectedPrice(price)
    setCurrentStrategy({ price })
  }

  const sim = calcSimulation(selectedPrice)

  return (
    <div className="cr2-panel-content">
      <div className="cr2-panel-title">판매</div>
      <div className="cr2-panel-desc">가격과 판매 계획을 정합니다. 실제 결과는 정산에서 공개됩니다.</div>

      {rivalPrice && (
        <div className="cr2-rival-price-info">
          {`${getCurrentStage(gameState.floor)?.rivalName || '라이벌'} 가격: ${rivalPrice.toLocaleString()}원`}
        </div>
      )}

      <div className="cr2-price-tabs">
        <button
          className={`cr2-subtab ${selectedPrice === null ? 'cr2-subtab-active' : ''}`}
          onClick={() => setSelectedPrice(null)}
        >
          가격
        </button>
        <button className="cr2-subtab">판매 개수</button>
      </div>

      {priceOptions.map(option => (
        <div key={option.label} className="cr2-panel-section">
          <button
            className={`cr2-option-btn ${selectedPrice === option.price ? 'cr2-selected' : ''}`}
            onClick={() => handlePriceSelect(option.price)}
          >
            {option.label}
          </button>

          {selectedPrice === option.price && sim && (
            <div className="cr2-simulation">
              <div>선택 판매가: {option.price.toLocaleString()}원</div>
              {rivalPrice && (
                <div className={parseFloat(sim.rivalDiff) < 0 ? 'cr2-positive' : 'cr2-negative'}>
                  라이벌 대비 {sim.rivalDiff}%
                </div>
              )}
              <div>손익분기점: {sim.breakeven.toLocaleString()}개</div>
            </div>
          )}
        </div>
      ))}

      <div className="cr2-panel-section">
        <button
          className={`cr2-option-btn ${customPrice && selectedPrice === parseInt(customPrice, 10) ? 'cr2-selected' : ''}`}
          onClick={() => {
            const price = parseInt(customPrice, 10)
            if (price > 0) handlePriceSelect(price)
          }}
        >
          직접 입력
        </button>
        <input
          className="cr2-custom-input"
          type="number"
          value={customPrice}
          onChange={event => setCustomPrice(event.target.value)}
          placeholder="판매가 직접 입력"
        />
      </div>

      <OrderSection gameState={gameState} setCurrentStrategy={setCurrentStrategy} />
    </div>
  )
}

function OrderSection({ gameState, setCurrentStrategy }) {
  const maxOrder = getMaxOrderAmount(gameState.capital, gameState.cost, gameState.orderCap)
  const [orderMode, setOrderMode] = useState('표준')

  const orderOptions = [
    { label: '보수적', amount: Math.floor(maxOrder * 0.5) },
    { label: '표준', amount: Math.floor(maxOrder * 0.7) },
    { label: '공격적', amount: Math.floor(maxOrder * 0.9) },
    { label: `최대 (${maxOrder.toLocaleString()}개)`, amount: maxOrder },
  ]

  return (
    <div className="cr2-order-section">
      <div className="cr2-order-label">
        최대 발주 가능: <span className="cr2-lime">{maxOrder.toLocaleString()}개</span>
        <span className="cr2-gray"> (보유 자본 기준)</span>
      </div>
      {orderOptions.map(option => (
        <button
          key={option.label}
          className={`cr2-option-btn ${orderMode === option.label ? 'cr2-selected' : ''}`}
          onClick={() => {
            setOrderMode(option.label)
            setCurrentStrategy({ orderAmount: option.amount })
            playSFX('click')
          }}
        >
          {option.label}
        </button>
      ))}
      <input
        className="cr2-custom-input"
        type="number"
        placeholder="직접 입력"
        onChange={event => setCurrentStrategy({ orderAmount: parseInt(event.target.value, 10) || 0 })}
      />
    </div>
  )
}

function QualityTab({ gameState, rivalPrice, setCurrentStrategy }) {
  const stage = getCurrentStage(gameState.floor)
  const [selectedQuality, setSelectedQuality] = useState('maintain')

  const qualityOptions = [
    { id: 'maintain', label: '품질 유지', cost: gameState.cost, change: 0, desc: '변화 없음' },
    { id: 'upgrade', label: '품질 업그레이드', cost: Math.floor(gameState.cost * 1.25), change: Math.floor(gameState.cost * 0.25), desc: '+25% 원가' },
    { id: 'reduce', label: '품질 절감', cost: Math.floor(gameState.cost * 0.8), change: -Math.floor(gameState.cost * 0.2), desc: '-20% 원가' },
  ]

  return (
    <div className="cr2-panel-content">
      <div className="cr2-panel-title">품질</div>
      <div className="cr2-panel-desc">품질은 매력도와 원가에 함께 영향을 줍니다.</div>

      {stage && (
        <div className="cr2-rival-quality-info">
          {stage.rivalName} — 가격 {rivalPrice?.toLocaleString() || '?'}원 / 품질 {gameState.rivals?.find(rival => rival.id === stage.rival)?.stats?.quality || '?'}
        </div>
      )}

      <div className="cr2-quality-current">
        예상 품질 {gameState.quality} &nbsp; 예상 원가 {gameState.cost?.toLocaleString()}원
      </div>

      {qualityOptions.map(option => (
        <div
          key={option.id}
          className={`cr2-quality-option ${selectedQuality === option.id ? 'cr2-selected' : ''}`}
          onClick={() => {
            setSelectedQuality(option.id)
            setCurrentStrategy({ qualityMode: option.id })
            playSFX('click')
          }}
        >
          <div className="cr2-quality-option-label">{option.label}</div>
          <div className="cr2-quality-option-cost">
            예상 원가: {option.cost.toLocaleString()}원
            {option.change !== 0 && (
              <span className={option.change > 0 ? 'cr2-negative' : 'cr2-positive'}>
                &nbsp;{option.change > 0 ? '+' : ''}{option.change.toLocaleString()}원
              </span>
            )}
          </div>
          {option.id !== 'maintain' && (
            <div className="cr2-quality-option-desc">{option.desc}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function OperationTab({ gameState, setCurrentStrategy, setFactoryAction }) {
  const [subTab, setSubTab] = useState('factory')

  return (
    <div className="cr2-panel-content">
      <div className="cr2-panel-title">운영</div>
      <div className="cr2-panel-desc">이번 달의 설비 투자, 은행 거래, 마케팅을 정합니다.</div>

      <div className="cr2-operation-info">
        <div>예상 품질 {gameState.quality} &nbsp; 예상 원가 {gameState.cost?.toLocaleString()}원</div>
        <div>예상 부채 {(gameState.debt || 0).toLocaleString()}원</div>
      </div>

      <div className="cr2-subtab-bar">
        {['factory', 'bank', 'marketing'].map(tab => (
          <button
            key={tab}
            className={`cr2-subtab ${subTab === tab ? 'cr2-subtab-active' : ''}`}
            onClick={() => {
              setSubTab(tab)
              playSFX('click')
            }}
          >
            {tab === 'factory' ? '공장 관리' : tab === 'bank' ? '은행 업무' : '마케팅'}
          </button>
        ))}
      </div>

      {subTab === 'factory' && (
        <FactorySection
          gameState={gameState}
          setFactoryAction={setFactoryAction}
        />
      )}
      {subTab === 'bank' && (
        <BankSection gameState={gameState} />
      )}
      {subTab === 'marketing' && (
        <MarketingSection gameState={gameState} setCurrentStrategy={setCurrentStrategy} />
      )}
    </div>
  )
}

function FactorySection({ gameState, setFactoryAction }) {
  const factoryAction = gameState.factoryActionThisTurn

  const qualityRate = getSuccessRate(
    QUALITY_UPGRADE.baseSuccessRate,
    gameState.qualityUpgradeCount || 0,
    gameState.factoryFailStreak || 0,
  )
  const costRate = getSuccessRate(
    COST_REDUCTION.baseSuccessRate,
    gameState.costReductionCount || 0,
    gameState.costReductionFailStreak || 0,
  )

  const getRateColor = (rate) => {
    if (rate >= 0.7) return 'var(--cr2-lime)'
    if (rate >= 0.4) return 'var(--cr2-gold)'
    return 'var(--cr2-red)'
  }

  if (factoryAction) {
    return (
      <div className="cr2-factory-reserved">
        <div className="cr2-factory-reserved-label">
          ✅ 이번 달 공장 작업 예약됨
        </div>
        <div className="cr2-factory-reserved-type">
          {factoryAction.type === 'quality' ? '품질 강화' : '원가 절감'} · 50만원
        </div>
        <button
          className="cr2-btn cr2-btn-ghost"
          onClick={() => {
            useGameStore.getState().setFactoryAction(null)
            playSFX('click')
          }}
        >
          취소
        </button>
      </div>
    )
  }

  return (
    <div className="cr2-factory-section">
      <div className="cr2-factory-current">
        현재 품질: {gameState.quality} &nbsp; 현재 원가: {gameState.cost?.toLocaleString()}원/개
        <br />
        누적 원가 절감: {((gameState.costReductionTotal || 0) * 100).toFixed(1)}% / 40%
      </div>

      <div
        className="cr2-factory-option"
        onClick={() => {
          if (gameState.capital < 500000) return
          setFactoryAction({ type: 'quality' })
          playSFX('click')
        }}
        style={{ opacity: gameState.capital < 500000 ? 0.4 : 1 }}
      >
        <div className="cr2-factory-option-title">품질 강화</div>
        <div>비용: 500,000원</div>
        <div>예상: +{QUALITY_UPGRADE.minGain} ~ +{QUALITY_UPGRADE.maxGain}</div>
        <div style={{ color: getRateColor(qualityRate) }}>
          성공 확률: {Math.round(qualityRate * 100)}%
          {gameState.factoryFailStreak > 0 && (
            <span className="cr2-negative">
              &nbsp;(연속 실패 {gameState.factoryFailStreak}회 +{gameState.factoryFailStreak * 10}%)
            </span>
          )}
        </div>
        {gameState.capital < 500000 && <div className="cr2-negative">자본 부족</div>}
      </div>

      <div
        className="cr2-factory-option"
        onClick={() => {
          if (gameState.capital < 500000) return
          if ((gameState.costReductionTotal || 0) >= 0.40) return
          setFactoryAction({ type: 'cost' })
          playSFX('click')
        }}
        style={{
          opacity: gameState.capital < 500000 || (gameState.costReductionTotal || 0) >= 0.40 ? 0.4 : 1,
        }}
      >
        <div className="cr2-factory-option-title">원가 절감</div>
        <div>비용: 500,000원</div>
        <div>예상: -{(COST_REDUCTION.minGain * 100).toFixed(0)}% ~ -{(COST_REDUCTION.maxGain * 100).toFixed(0)}%</div>
        <div style={{ color: getRateColor(costRate) }}>
          성공 확률: {Math.round(costRate * 100)}%
          {gameState.costReductionFailStreak > 0 && (
            <span className="cr2-negative">
              &nbsp;(연속 실패 {gameState.costReductionFailStreak}회)
            </span>
          )}
        </div>
        {(gameState.costReductionTotal || 0) >= 0.40 && (
          <div className="cr2-lime">최대 원가 절감 달성</div>
        )}
        {gameState.capital < 500000 && <div className="cr2-negative">자본 부족</div>}
      </div>

      <button
        className="cr2-btn cr2-btn-ghost"
        onClick={() => playSFX('click')}
      >
        건너뛰기
      </button>
    </div>
  )
}

function BankSection({ gameState }) {
  const grade = getGrade(gameState.creditScore)
  const loanLimit = getLoanLimit(gameState.creditScore, gameState.capital)

  const handleTakeLoan = (loanTypeId) => {
    const result = takeLoan(loanTypeId, gameState)
    if (result.success) {
      useGameStore.setState({
        capital: result.newCapital,
        debt: result.newDebt,
        loans: [...(gameState.loans || []), result.newLoan],
      })
      playSFX('click')
    }
  }

  const handleRepayLoan = (loanId) => {
    const result = repayLoan(loanId, gameState)
    if (result.success) {
      useGameStore.setState(state => ({
        capital: result.newCapital,
        debt: result.newDebt,
        loans: result.newLoans,
        stats: result.statsUpdate
          ? { ...(state.stats || {}), ...result.statsUpdate }
          : state.stats,
      }))
      playSFX('click')
    }
  }

  const handleExtendLoan = (loanId) => {
    const result = extendLoan(loanId, gameState)
    if (result.success) {
      useGameStore.setState({ loans: result.newLoans })
      playSFX('click')
    }
  }

  return (
    <div className="cr2-bank-section">
      <div className="cr2-bank-grade">
        신용등급 <span style={{ color: getGradeColor(grade) }}>{grade}</span>
        ({gameState.creditScore}점)
      </div>

      {(gameState.loans || []).length > 0 && (
        <div className="cr2-loan-list">
          <div className="cr2-loan-list-title">현재 대출</div>
          {gameState.loans.map(loan => (
            <div key={loan.id} className="cr2-loan-item">
              <div className="cr2-loan-type">{LOAN_TYPES.find(type => type.id === loan.type)?.label}</div>
              <div>원금 {(loan.principal / 10000).toFixed(0)}만원</div>
              <div className={loan.remainingTurns <= 1 ? 'cr2-negative cr2-blink' : loan.remainingTurns <= 3 ? 'cr2-gold' : ''}>
                ⏳ 만기 {loan.remainingTurns}턴 후
              </div>
              <div className="cr2-loan-btns">
                <button
                  className="cr2-btn cr2-btn-small"
                  onClick={() => handleRepayLoan(loan.id)}
                >
                  상환
                </button>
                <button
                  className="cr2-btn cr2-btn-small"
                  onClick={() => handleExtendLoan(loan.id)}
                >
                  연장
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {grade !== 'D' && (
        <div className="cr2-loan-new">
          <div className="cr2-loan-limit">대출 한도: {(loanLimit / 10000).toFixed(0)}만원</div>
          <div className="cr2-loan-new-btns">
            <button className="cr2-btn cr2-btn-small" onClick={() => handleTakeLoan('short')}>단기</button>
            <button className="cr2-btn cr2-btn-small" onClick={() => handleTakeLoan('normal')}>일반</button>
            <button className="cr2-btn cr2-btn-small" onClick={() => handleTakeLoan('long')}>장기</button>
          </div>
        </div>
      )}
      {grade === 'D' && (
        <div className="cr2-negative">신용등급 D — 대출 불가</div>
      )}
    </div>
  )
}

function MarketingSection({ gameState, setCurrentStrategy }) {
  const [budget, setBudget] = useState(0)
  const limit = getMarketingLimit(gameState.capital, gameState.settings?.marketingLimitMode || 'ratio')
  const expectedAwareness = updateAwareness(gameState.awareness, budget, gameState.brand)

  return (
    <div className="cr2-marketing-section">
      <div className="cr2-marketing-limit">
        마케팅 투자 한도: <span className="cr2-lime">{(limit / 10000).toFixed(0)}만원</span>
        <span className="cr2-gray"> (자본 × 0.3)</span>
      </div>

      <div className="cr2-marketing-input-label">마케팅 투자금</div>
      <input
        className="cr2-custom-input"
        type="number"
        value={budget}
        onChange={event => {
          const value = Math.min(parseInt(event.target.value, 10) || 0, limit)
          setBudget(value)
          setCurrentStrategy({ marketingBudget: value })
        }}
        placeholder="투자 금액 입력"
      />

      <div className="cr2-marketing-preview">
        예상 인지도: <span className="cr2-lime">{expectedAwareness.toFixed(1)}%</span>
        <span className="cr2-gray"> (현재 {gameState.awareness.toFixed(1)}%)</span>
        <br />
        인지도 최대치: {Math.min(100, gameState.brand * 2).toFixed(0)}%
      </div>
    </div>
  )
}

function NextTab({ gameState, onSettle }) {
  const strategy = gameState.currentStrategy || {}
  const cost = gameState.cost || 3000
  const price = strategy.price || cost * 2
  const orderAmount = strategy.orderAmount || 0
  const marketingBudget = strategy.marketingBudget || 0
  const loans = gameState.loans || []

  const productionCost = orderAmount * cost * (1 - (gameState.costReductionTotal || 0))
  const operatingCost = 1500000
  const interest = loans.reduce((sum, loan) => sum + Math.floor((loan.principal * loan.interestRate) / 12), 0)
  const totalExpense = productionCost + marketingBudget + operatingCost + interest

  const margin = price - cost
  const breakeven = margin > 0 ? Math.ceil((operatingCost + interest) / margin) : null
  const expectedRevenue = orderAmount * price * 0.7
  const expectedProfit = expectedRevenue - totalExpense

  return (
    <div className="cr2-panel-content">
      <div className="cr2-panel-title">정산 확인</div>
      <div className="cr2-panel-desc">이번 턴의 가격, 생산, 지출을 확인한 뒤 정산을 진행합니다.</div>

      <div className="cr2-next-summary">
        <div>예상 가격: {price.toLocaleString()}원</div>
        <div>예상 품질: {gameState.quality}</div>
        <div className="cr2-next-divider" />
        <div>생산: {orderAmount.toLocaleString()}개</div>
        <div>생산비: {(productionCost / 10000).toFixed(0)}만원</div>
        <div>운영비: {(operatingCost / 10000).toFixed(0)}만원</div>
        {interest > 0 && <div>이자: {(interest / 10000).toFixed(0)}만원</div>}
        <div className="cr2-negative cr2-next-total">
          예정 지출: {(totalExpense / 10000).toFixed(0)}만원
        </div>
        <div className="cr2-next-divider" />
        {breakeven && (
          <div>손익분기점: <span className="cr2-gold">{breakeven.toLocaleString()}개</span> 팔면 본전</div>
        )}
        <div className={expectedProfit >= 0 ? 'cr2-positive' : 'cr2-negative'}>
          예상 순이익: {expectedProfit >= 0 ? '+' : ''}{(expectedProfit / 10000).toFixed(0)}만원
        </div>
      </div>

      <div className="cr2-next-desc cr2-gray">
        점유율과 손익은 정산에서 공개됩니다.
      </div>

      <button
        className="cr2-btn cr2-settle-btn"
        onClick={onSettle}
      >
        정산하기
      </button>
    </div>
  )
}

function getGradeColor(grade) {
  const colors = { A: '#00FF41', B: '#FFD700', C: '#FF8800', D: '#DC143C' }
  return colors[grade] || '#888'
}
