import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getMaxOrderAmount } from '../logic/settlementEngine'
import { getMarketingLimit, updateAwareness } from '../logic/brandQualityEngine'
import { getSuccessRate, QUALITY_UPGRADE, COST_REDUCTION } from '../logic/factoryEngine'
import { getGrade, getLoanLimit } from '../logic/creditEngine'
import { takeLoan, repayLoan, extendLoan } from '../logic/loanEngine'
import { getCurrentStage } from '../constants/monopol'
import { RIVALS } from '../constants/rivals'
import { LOAN_TYPES } from '../constants/creditScore'
import { playSFX } from '../logic/audioEngine'

export default function RightPanel({ activeTab, onSettle }) {
  const gameState = useGameStore(state => state)
  const setCurrentStrategy = useGameStore(state => state.setCurrentStrategy)
  const setFactoryAction = useGameStore(state => state.setFactoryAction)

  return (
    <div className="cr2-right-panel">
      {activeTab === 'rival' && (
        <RivalTab gameState={gameState} />
      )}
      {activeTab === 'sale' && (
        <SaleTab
          gameState={gameState}
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

function SaleTab({ gameState, setCurrentStrategy }) {
  const [selectedPrice, setSelectedPrice] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(0)
  const [selectedOrderKey, setSelectedOrderKey] = useState(null)
  const [selectedQuality, setSelectedQuality] = useState('maintain')
  const [customPrice, setCustomPrice] = useState('')
  const [customOrder, setCustomOrder] = useState('')
  const [qualCustomVal, setQualCustomVal] = useState('')

  const [priceError, setPriceError] = useState('')
  const [orderError, setOrderError] = useState('')
  const [qualError, setQualError] = useState('')

  const cost = gameState.cost || 3000
  const getEffectiveCost = () => {
    const base = gameState.cost || 3000
    if (selectedQuality === 'reduce') return Math.floor(base * 0.8)
    if (selectedQuality === 'upgrade') return Math.floor(base * 1.25)
    if (selectedQuality === 'custom' && qualCustomVal) {
      const multiplier = parseFloat(qualCustomVal)
      if (!Number.isNaN(multiplier)) return Math.floor(base * multiplier)
    }
    return base
  }
  const getEffectiveQuality = () => {
    const quality = gameState.quality || 8
    if (selectedQuality === 'reduce') return Math.floor(quality * 0.8)
    if (selectedQuality === 'upgrade') return Math.floor(quality * 1.2)
    if (selectedQuality === 'custom' && qualCustomVal) {
      const multiplier = parseFloat(qualCustomVal)
      if (!Number.isNaN(multiplier)) return Math.floor(quality * multiplier)
    }
    return quality
  }
  const effectiveCost = getEffectiveCost()
  const maxOrder = getMaxOrderAmount(gameState.capital, effectiveCost, gameState.orderCap)
  const rivalPrice = gameState.rivalPrice || null
  const stage = getCurrentStage(gameState.floor)
  const rivalInfos = (() => {
    if (Array.isArray(gameState.rivals) && gameState.rivals.length > 0) {
      return gameState.rivals.map((rival, index) => {
        const rivalRecord = typeof rival === 'string' ? { id: rival } : rival || {}
        const rivalId = rivalRecord.id || rivalRecord.rival || rivalRecord.rivalId
        const rivalData = RIVALS.find(entry => entry.id === rivalId)
        return {
          key: rivalId || `rival-${index}`,
          name: rivalRecord.rivalName || rivalRecord.name || rivalData?.name || `라이벌 ${index + 1}`,
          company: rivalRecord.company || rivalData?.company || '',
          price: rivalRecord.price || rivalRecord.rivalPrice || rivalPrice || 10000,
          quality: rivalRecord.quality ?? rivalRecord.stats?.quality ?? rivalData?.stats?.quality ?? '?',
          tier: rivalRecord.tier || rivalData?.tier || '',
        }
      })
    }
    if (!stage) return []
    const rivalData = RIVALS.find(rival => rival.id === stage.rival)
    return [{
      key: stage.rival,
      name: stage.rivalName,
      company: stage.company,
      price: rivalPrice || 10000,
      quality: gameState.rivalQuality || rivalData?.stats?.quality || '?',
      tier: stage.tier,
    }]
  })()

  const fixedCost = 1500000 + (gameState.loans || []).reduce(
    (sum, loan) => sum + Math.floor(loan.principal * (loan.interestRate || 0.065) / 12),
    0,
  )

  const getBreakeven = (price) => {
    const margin = price - effectiveCost
    return margin > 0 ? Math.ceil(fixedCost / margin) : null
  }

  const getRivalDiff = (price) => {
    if (!rivalPrice) return null
    return (((price - rivalPrice) / rivalPrice) * 100).toFixed(1)
  }

  const validatePrice = (raw) => {
    if (raw === '') return ''
    const val = parseInt(raw, 10)
    if (isNaN(val)) return '숫자만 입력하세요.'
    if (val <= 0) return '0원보다 커야 합니다.'
    if (val < effectiveCost) return `원가(${effectiveCost.toLocaleString()}원)보다 낮으면 적자입니다.`
    if (val > effectiveCost * 10) return `원가의 10배(${(effectiveCost * 10).toLocaleString()}원) 이하로 입력하세요.`
    return ''
  }

  const validateOrder = (raw) => {
    if (raw === '') return ''
    const val = parseInt(raw, 10)
    if (isNaN(val)) return '숫자만 입력하세요.'
    if (val <= 0) return '1개 이상 입력하세요.'
    if (val > maxOrder) return `최대 발주 가능 수량은 ${maxOrder.toLocaleString()}개입니다.`
    return ''
  }

  const validateQual = (raw) => {
    if (raw === '') return ''
    const val = parseFloat(raw)
    if (isNaN(val)) return '숫자만 입력하세요.'
    if (val < 0.5) return '최소 0.5 이상 입력하세요.'
    if (val > 1.5) return '최대 1.5 이하 입력하세요.'
    return ''
  }

  const priceOpts = [
    { key: 'x13', label: '×1.3', price: Math.floor(effectiveCost * 1.3) },
    { key: 'x2',  label: '×2',   price: Math.floor(effectiveCost * 2)   },
    { key: 'x3',  label: '×3',   price: Math.floor(effectiveCost * 3)   },
    { key: 'x4',  label: '×4',   price: Math.floor(effectiveCost * 4)   },
  ]

  const lastShare = (gameState.playerShareHistory || []).slice(-1)[0] ?? 0.5
  const myDemand = Math.floor((gameState.lastTotalDemand || 1000) * lastShare)

  const orderOpts = [
    { key: 'con', label: '보수적', amount: Math.floor(myDemand * 0.7) },
    { key: 'std', label: '표준',   amount: myDemand                    },
    { key: 'agg', label: '공격적', amount: Math.floor(myDemand * 1.3) },
    { key: 'max', label: '자본MAX', amount: maxOrder                   },
  ]

  const currentQuality = gameState.quality || 8
  const qualOpts = [
    {
      key: 'reduce',
      label: '절감',
      cost: Math.floor(cost * 0.8),
      color: 'var(--cr2-lime)',
      qualityDisplay: `품질: ${Math.floor(currentQuality * 0.8)}`,
    },
    {
      key: 'maintain',
      label: '유지',
      cost,
      color: 'var(--cr2-white)',
      qualityDisplay: `품질: ${currentQuality}`,
    },
    {
      key: 'upgrade',
      label: '고급',
      cost: Math.floor(cost * 1.25),
      color: 'var(--cr2-red)',
      qualityDisplay: `품질: ${Math.floor(currentQuality * 1.2)}`,
    },
  ]

  const handlePrice = (price, key) => {
    setSelectedPrice(key)
    setCustomPrice('')
    setPriceError('')
    setCurrentStrategy({ price })
    playSFX('click')
  }

  const handleOrder = (amount, key) => {
    setSelectedOrder(amount)
    setSelectedOrderKey(key)
    setCustomOrder('')
    setOrderError('')
    setCurrentStrategy({ orderAmount: amount })
    playSFX('click')
  }

  const handleQuality = (key) => {
    setSelectedQuality(key)
    setQualCustomVal('')
    setQualError('')
    setCurrentStrategy({ qualityMode: key })
    playSFX('click')
  }

  const currentPrice = selectedPrice
    ? priceOpts.find(option => option.key === selectedPrice)?.price
      || parseInt(customPrice, 10)
    : null

  return (
    <div style={{
      padding: '10px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      height: '100%',
      overflowY: 'auto',
    }}>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontSize: '9px',
        padding: '6px 8px',
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(0,170,0,0.3)',
        marginBottom: '6px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ color: 'var(--cr2-gray)' }}>원가</span>
          <span style={{ color: 'var(--cr2-white)' }}>
            {effectiveCost.toLocaleString()}원
          </span>
          <span style={{ color: 'var(--cr2-gray)', fontSize: '8px' }}>
            (품질 {getEffectiveQuality()} 기준)
          </span>
        </div>

        {rivalInfos.length > 0 && (
          <div style={{
            borderTop: '1px solid rgba(220,20,60,0.3)',
            paddingTop: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            {rivalInfos.map(rival => (
              <div key={rival.key} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ color: 'var(--cr2-red)', fontSize: '9px' }}>
                  {rival.name} {rival.company && `(${rival.company})`}
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '8px', flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--cr2-gray)' }}>
                    가격 <span style={{ color: 'var(--cr2-red)' }}>
                      {rival.price.toLocaleString()}원
                    </span>
                  </span>
                  <span style={{ color: 'var(--cr2-gray)' }}>
                    품질 <span style={{ color: 'var(--cr2-red)' }}>
                      {rival.quality}
                    </span>
                  </span>
                  {rival.tier && (
                    <span style={{ color: 'var(--cr2-gray)' }}>
                      [{rival.tier}]
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ order: 2 }}>
        <div style={{ fontSize: '9px', color: 'var(--cr2-lime)', marginBottom: '5px' }}>
          가격 선택
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          marginBottom: '4px',
        }}>
          {priceOpts.map(opt => (
            <button
              key={opt.key}
              onClick={() => handlePrice(opt.price, opt.key)}
              style={{
                background: selectedPrice === opt.key
                  ? 'rgba(0,255,65,0.15)' : 'var(--cr2-bg2)',
                border: `1px solid ${selectedPrice === opt.key
                  ? 'var(--cr2-lime)' : 'var(--cr2-green)'}`,
                color: 'var(--cr2-white)',
                fontFamily: "'Press Start 2P', 'Noto Sans KR', monospace",
                padding: '8px 4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                boxShadow: selectedPrice === opt.key
                  ? '0 0 6px rgba(0,255,65,0.25)' : 'none',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--cr2-lime)' }}>
                {opt.label}
              </span>
              <span style={{ fontSize: '8px', color: 'var(--cr2-gray)' }}>
                {opt.price.toLocaleString()}원
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '4px' }}>
          <input
            type="number"
            value={customPrice}
            placeholder="판매가 직접 입력 (원)"
            onChange={event => {
              const raw = event.target.value
              setCustomPrice(raw)
              const err = validatePrice(raw)
              setPriceError(err)
              if (!err && raw !== '') {
                setSelectedPrice('custom')
                setCurrentStrategy({ price: parseInt(raw, 10) })
                playSFX('click')
              }
            }}
            style={{
              width: '100%',
              background: selectedPrice === 'custom'
                ? 'rgba(0,255,65,0.08)'
                : priceError ? 'rgba(220,20,60,0.08)'
                  : 'rgba(0,0,0,0.5)',
              border: `1px solid ${
                priceError ? 'var(--cr2-red)'
                  : selectedPrice === 'custom' ? 'var(--cr2-lime)'
                    : 'rgba(0,170,0,0.4)'
              }`,
              color: 'var(--cr2-white)',
              padding: '6px 10px',
              fontFamily: "'Press Start 2P', 'Noto Sans KR', monospace",
              fontSize: '9px',
              boxSizing: 'border-box',
            }}
          />
          {priceError && (
            <div style={{
              fontSize: '8px',
              color: 'var(--cr2-red)',
              marginTop: '3px',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>
              ⚠️ {priceError}
            </div>
          )}
          {!priceError && selectedPrice === 'custom' && customPrice && (
            <div style={{
              fontSize: '8px',
              color: 'var(--cr2-gold)',
              marginTop: '3px',
            }}>
              손익분기: {getBreakeven(parseInt(customPrice, 10))?.toLocaleString()}개
              {rivalPrice && ` · 라이벌 대비 ${getRivalDiff(parseInt(customPrice, 10))}%`}
            </div>
          )}
        </div>

        {selectedPrice !== 'custom' && currentPrice && currentPrice > effectiveCost && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            fontSize: '9px',
            padding: '4px 6px',
            background: 'rgba(0,0,0,0.4)',
            borderLeft: '2px solid var(--cr2-lime)',
            marginTop: '4px',
          }}>
            {rivalPrice && (
              <span style={{
                color: parseFloat(getRivalDiff(currentPrice)) < 0
                  ? 'var(--cr2-lime)' : 'var(--cr2-red)',
              }}>
                라이벌 대비 {getRivalDiff(currentPrice)}%
              </span>
            )}
            <span style={{ color: 'var(--cr2-gold)' }}>
              손익분기 {getBreakeven(currentPrice)?.toLocaleString()}개
            </span>
          </div>
        )}
      </div>

      <div style={{ order: 3 }}>
        <div style={{
          fontSize: '9px',
          color: 'var(--cr2-lime)',
          marginBottom: '5px',
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
        }}>
          <span>발주량</span>
          <span style={{ color: 'var(--cr2-gray)' }}>
            최대 {maxOrder.toLocaleString()}개 (자본 기준)
          </span>
          {myDemand > 0 && (
            <span style={{ color: 'var(--cr2-gold)' }}>
              예상 수요 {myDemand.toLocaleString()}개
            </span>
          )}
        </div>

        {selectedOrder > 0 && (
          <div style={{
            fontSize: '10px',
            color: 'var(--cr2-lime)',
            marginBottom: '6px',
            letterSpacing: '0.5px',
          }}>
            생산비용: {selectedOrder.toLocaleString()}개 × {gameState.cost.toLocaleString()}원
            {' = '}
            <span style={{ color: 'var(--cr2-white)', fontWeight: 'bold' }}>
              {(selectedOrder * gameState.cost).toLocaleString()}원
            </span>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          marginBottom: '4px',
        }}>
          {orderOpts.map(opt => (
            <button
              key={opt.key}
              onClick={() => handleOrder(opt.amount, opt.key)}
              style={{
                background: selectedOrderKey === opt.key
                  ? 'rgba(0,255,65,0.15)' : 'var(--cr2-bg2)',
                border: `1px solid ${selectedOrderKey === opt.key
                  ? 'var(--cr2-lime)' : 'var(--cr2-green)'}`,
                color: 'var(--cr2-white)',
                fontFamily: "'Press Start 2P', 'Noto Sans KR', monospace",
                padding: '8px 4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                boxShadow: selectedOrderKey === opt.key
                  ? '0 0 6px rgba(0,255,65,0.25)' : 'none',
              }}
            >
              <span style={{ fontSize: '10px', color: 'var(--cr2-lime)' }}>
                {opt.label}
              </span>
              <span style={{ fontSize: '8px', color: 'var(--cr2-gray)' }}>
                {opt.amount.toLocaleString()}개
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '4px' }}>
          <input
            type="number"
            value={customOrder}
            placeholder={`직접 입력 (최대 ${maxOrder.toLocaleString()})`}
            onChange={event => {
              const raw = event.target.value
              setCustomOrder(raw)
              const err = validateOrder(raw)
              setOrderError(err)
              if (!err && raw !== '') {
                const num = parseInt(raw, 10)
                if (!isNaN(num) && num > 0) {
                  setSelectedOrder(num)
                  setSelectedOrderKey('custom')
                  setCurrentStrategy({ orderAmount: num })
                }
                playSFX('click')
              }
            }}
            style={{
              width: '100%',
              background: selectedOrderKey === 'custom'
                ? 'rgba(0,255,65,0.08)'
                : orderError ? 'rgba(220,20,60,0.08)'
                  : 'rgba(0,0,0,0.5)',
              border: `1px solid ${
                orderError ? 'var(--cr2-red)'
                  : selectedOrderKey === 'custom' ? 'var(--cr2-lime)'
                    : 'rgba(0,170,0,0.4)'
              }`,
              color: 'var(--cr2-white)',
              padding: '6px 10px',
              fontFamily: "'Press Start 2P', 'Noto Sans KR', monospace",
              fontSize: '9px',
              boxSizing: 'border-box',
            }}
          />
          {orderError && (
            <div style={{
              fontSize: '8px',
              color: 'var(--cr2-red)',
              marginTop: '3px',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>
              ⚠️ {orderError}
            </div>
          )}
          {!orderError && selectedOrderKey === 'custom' && customOrder && (
            <div style={{
              fontSize: '8px',
              color: 'var(--cr2-gold)',
              marginTop: '3px',
            }}>
              생산비: {(parseInt(customOrder, 10) * effectiveCost * (1 - (gameState.costReductionTotal || 0)) / 10000).toFixed(0)}만원
            </div>
          )}
        </div>
      </div>

      <div style={{ order: 1 }}>
        <div style={{
          fontSize: '9px',
          color: 'var(--cr2-lime)',
          marginBottom: '5px',
          display: 'flex',
          gap: '6px',
        }}>
          <span>품질 수준</span>
          <span style={{ color: 'var(--cr2-gray)' }}>현재 {gameState.quality}</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4px',
        }}>
          {qualOpts.map(opt => (
            <button
              key={opt.key}
              onClick={() => handleQuality(opt.key)}
              style={{
                background: selectedQuality === opt.key
                  ? 'rgba(0,255,65,0.15)' : '#0A0A0F',
                border: `2px solid ${selectedQuality === opt.key
                  ? opt.color : 'var(--cr2-green)'}`,
                color: 'var(--cr2-white)',
                fontFamily: "'Press Start 2P', 'Noto Sans KR', monospace",
                padding: '8px 4px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span style={{ fontSize: '10px', color: opt.color }}>
                {opt.label}
              </span>
              <span style={{ fontSize: '7px', color: 'var(--cr2-gray)' }}>
                {opt.cost.toLocaleString()}원
              </span>
              <span style={{
                fontSize: '7px',
                color: opt.key === 'reduce' ? 'var(--cr2-lime)'
                  : opt.key === 'upgrade' ? 'var(--cr2-red)'
                    : 'var(--cr2-gray)',
                marginTop: '1px',
              }}>
                ({opt.qualityDisplay})
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: '4px' }}>
          <input
            type="number"
            value={qualCustomVal}
            placeholder="배율 직접 입력 (0.5 ~ 1.5)"
            step="0.1"
            onChange={event => {
              const raw = event.target.value
              setQualCustomVal(raw)
              const err = validateQual(raw)
              setQualError(err)
              if (!err && raw !== '') {
                setSelectedQuality('custom')
                setCurrentStrategy({
                  qualityMode: 'custom',
                  qualityMultiplier: parseFloat(raw),
                })
                playSFX('click')
              }
            }}
            style={{
              width: '100%',
              background: selectedQuality === 'custom'
                ? 'rgba(0,255,65,0.08)'
                : qualError
                  ? 'rgba(220,20,60,0.08)'
                  : 'rgba(0,0,0,0.5)',
              border: `1px solid ${
                qualError
                  ? 'var(--cr2-red)'
                  : selectedQuality === 'custom'
                    ? 'var(--cr2-lime)'
                    : 'rgba(0,170,0,0.4)'
              }`,
              color: 'var(--cr2-white)',
              padding: '6px 10px',
              fontFamily: "'Press Start 2P', 'Noto Sans KR', monospace",
              fontSize: '9px',
              boxSizing: 'border-box',
            }}
          />

          {qualError && (
            <div style={{
              fontSize: '8px',
              color: 'var(--cr2-red)',
              marginTop: '3px',
              fontFamily: "'Noto Sans KR', sans-serif",
            }}>
              ⚠️ {qualError}
            </div>
          )}

          {!qualError && selectedQuality === 'custom' && qualCustomVal && (
            <div style={{
              fontSize: '8px',
              color: 'var(--cr2-gold)',
              marginTop: '3px',
            }}>
              예상 원가: {Math.floor(cost * parseFloat(qualCustomVal)).toLocaleString()}원
              &nbsp;·&nbsp;
              품질: {Math.floor((gameState.quality || 8) * parseFloat(qualCustomVal))}
            </div>
          )}
        </div>
      </div>

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

function RivalTab({ gameState }) {
  const stage = getCurrentStage(gameState.floor)

  if (!stage) {
    return (
      <div className="cr2-panel-content">
        <div className="cr2-panel-title">라이벌</div>
        <div className="cr2-rival-tab-empty cr2-gray">
          현재 구간에 라이벌이 없습니다.
        </div>
      </div>
    )
  }

  const capitalRatio = gameState.rivalInitialCapital > 0
    ? Math.max(gameState.rivalCapital / gameState.rivalInitialCapital, 0)
    : 0

  const getCapitalBarColor = () => {
    if (capitalRatio <= 0.3) return 'var(--cr2-red)'
    if (capitalRatio <= 0.7) return 'var(--cr2-gold)'
    return 'var(--cr2-green)'
  }

  return (
    <div className="cr2-panel-content">
      <div className="cr2-panel-title">라이벌 정보</div>

      <div className="cr2-rival-tab-profile">
        <img
          src={getRivalProfileImage(stage.rival)}
          alt={stage.rivalName}
          className="cr2-rival-tab-img"
        />
        <div className="cr2-rival-tab-info">
          <div className="cr2-rival-tab-name cr2-negative">{stage.rivalName}</div>
          <div className="cr2-rival-tab-company cr2-gray">{stage.company}</div>
          <div className="cr2-rival-tab-tier" style={{ color: getTierColor(stage.tier) }}>
            [{stage.tier}] MONOPOL
          </div>
        </div>
      </div>

      <div className="cr2-rival-tab-section">
        <div className="cr2-rival-tab-section-title">자본 현황</div>
        <div className="cr2-rival-cap-bar-track">
          <div
            className={`cr2-rival-cap-bar ${capitalRatio <= 0.1 ? 'cr2-blink' : ''}`}
            style={{
              width: `${Math.min(capitalRatio * 100, 100)}%`,
              background: getCapitalBarColor(),
            }}
          />
        </div>
        <div className="cr2-rival-tab-cap-info">
          <span style={{ color: gameState.rivalCapital < 0 ? 'var(--cr2-red)' : 'var(--cr2-white)' }}>
            {(gameState.rivalCapital / 10000).toFixed(0)}만원
          </span>
          {gameState.rivalNetProfit !== 0 && (
            <span className={gameState.rivalNetProfit < 0 ? 'cr2-positive' : 'cr2-negative'}>
              이번달 {gameState.rivalNetProfit < 0 ? '▼' : '▲'}
              {Math.abs(gameState.rivalNetProfit / 10000).toFixed(0)}만원
            </span>
          )}
        </div>
        {capitalRatio <= 0.1 && (
          <div className="cr2-positive cr2-blink" style={{ fontSize: 9 }}>
            파산 임박! 압박을 유지하라.
          </div>
        )}
      </div>

      <div className="cr2-rival-tab-section">
        <div className="cr2-rival-tab-section-title">특수 능력</div>
        {stage.specialAbility ? (
          <div className="cr2-rival-tab-ability cr2-negative">
            {stage.specialAbility.description || getAbilityDesc(stage.specialAbility.type)}
          </div>
        ) : (
          <div className="cr2-gray" style={{ fontSize: 9 }}>없음</div>
        )}
      </div>

      <div className="cr2-rival-tab-section">
        <div className="cr2-rival-tab-section-title">시장 개입</div>
        {stage.marketIntervention ? (
          <div className="cr2-rival-tab-intervention cr2-negative">
            {stage.marketIntervention.description || getInterventionDesc(stage.marketIntervention.type)}
          </div>
        ) : (
          <div className="cr2-gray" style={{ fontSize: 9 }}>없음</div>
        )}
      </div>

      <div className="cr2-rival-tab-section">
        <div className="cr2-rival-tab-section-title cr2-gold">이번 구간 힌트</div>
        <div className="cr2-rival-tab-hint">{stage.hint}</div>
      </div>

      {gameState.rivalNetProfit < 0 && gameState.rivalCapital > 0 && (
        <div className="cr2-rival-tab-section">
          <div className="cr2-rival-tab-section-title">예상 파산</div>
          <div className="cr2-positive" style={{ fontSize: 10 }}>
            약 {Math.ceil(gameState.rivalCapital / Math.abs(gameState.rivalNetProfit))}턴 후
          </div>
        </div>
      )}
    </div>
  )
}

function MarketingSection({ gameState, setCurrentStrategy }) {
  const [budget, setBudget] = useState(0)
  const [marketingError, setMarketingError] = useState('')
  const limit = getMarketingLimit(gameState.capital, gameState.settings?.marketingLimitMode || 'ratio')

  const validateMarketing = (raw) => {
    const val = parseInt(raw, 10)
    if (isNaN(val)) return '숫자만 입력하세요.'
    if (val < 0) return '0원 이상 입력하세요.'
    if (val > limit) return `한도(${(limit / 10000).toFixed(0)}만원) 초과입니다.`
    if (val > gameState.capital) return '보유 자본보다 많습니다.'
    return ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '9px', color: 'var(--cr2-gray)' }}>
        한도: <span style={{ color: 'var(--cr2-lime)' }}>{(limit / 10000).toFixed(0)}만원</span>
        <span style={{ color: 'var(--cr2-gray)' }}> (자본 × 0.3)</span>
      </div>

      <input
        type="number"
        value={budget || ''}
        placeholder="마케팅 투자금 입력"
        onChange={event => {
          const raw = event.target.value
          const err = validateMarketing(raw)
          setMarketingError(err)
          if (!err) {
            const val = Math.min(parseInt(raw, 10) || 0, limit)
            setBudget(val)
            setCurrentStrategy({ marketingBudget: val })
          }
        }}
        style={{
          width: '100%',
          background: marketingError ? 'rgba(220,20,60,0.08)' : 'rgba(0,0,0,0.5)',
          border: `1px solid ${marketingError ? 'var(--cr2-red)' : 'rgba(0,170,0,0.4)'}`,
          color: 'var(--cr2-white)',
          padding: '6px 10px',
          fontFamily: "'Press Start 2P', 'Noto Sans KR', monospace",
          fontSize: '9px',
          boxSizing: 'border-box',
        }}
      />

      {marketingError && (
        <div style={{
          fontSize: '8px',
          color: 'var(--cr2-red)',
          fontFamily: "'Noto Sans KR', sans-serif",
        }}>
          ⚠️ {marketingError}
        </div>
      )}

      {!marketingError && budget > 0 && (
        <div style={{ fontSize: '8px', color: 'var(--cr2-gold)' }}>
          예상 인지도: {updateAwareness(gameState.awareness, budget, gameState.brand).toFixed(1)}%
          <span style={{ color: 'var(--cr2-gray)' }}>
            &nbsp;(현재 {gameState.awareness?.toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  )
}

function ShareDonutChart({ share, rivalName }) {
  const size = 80
  const cx = size / 2
  const cy = size / 2
  const r = 28
  const strokeWidth = 12
  const circumference = 2 * Math.PI * r

  const playerShare = Math.min(Math.max(share || 0, 0), 1)
  const rivalShare = 1 - playerShare
  const playerDash = playerShare * circumference
  const rivalDash = rivalShare * circumference

  return (
    <div className="cr2-donut-wrap">
      <svg width={size} height={size}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--cr2-lime)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${playerDash} ${circumference - playerDash}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
        />
        {rivalShare > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--cr2-red)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${rivalDash} ${circumference - rivalDash}`}
            strokeDashoffset={circumference * 0.25 - playerDash}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        )}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="var(--cr2-lime)"
          fontSize="12"
          fontFamily="'Press Start 2P', monospace"
        >
          {Math.round(playerShare * 100)}%
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fill="var(--cr2-gray)"
          fontSize="6"
          fontFamily="'Press Start 2P', monospace"
        >
          점유율
        </text>
      </svg>

      <div className="cr2-donut-legend">
        <div className="cr2-donut-legend-item">
          <span className="cr2-donut-dot cr2-lime-bg" />
          <span>내 회사 {Math.round(playerShare * 100)}%</span>
        </div>
        <div className="cr2-donut-legend-item">
          <span className="cr2-donut-dot cr2-red-bg" />
          <span>{rivalName || '라이벌'} {Math.round(rivalShare * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

function RevenueBarChart({ revenueHistory, profitHistory }) {
  const data = revenueHistory?.slice(-8) || []
  const profits = profitHistory?.slice(-8) || []

  if (data.length === 0) {
    return (
      <div className="cr2-bar-chart-empty cr2-gray">
        데이터 쌓이는 중...
      </div>
    )
  }

  const maxVal = Math.max(...data.map(Math.abs), ...profits.map(Math.abs), 1)
  const chartH = 60

  return (
    <div className="cr2-bar-chart-wrap">
      <div className="cr2-bar-chart-label">매출 / 순이익 추이</div>
      <svg
        width="100%"
        height={chartH + 20}
        viewBox={`0 0 280 ${chartH + 20}`}
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          y1={chartH / 2}
          x2="280"
          y2={chartH / 2}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />

        {data.map((rev, index) => {
          const profit = profits[index] || 0
          const slotW = 280 / data.length
          const cx = index * slotW + slotW / 2
          const revH = Math.abs(rev / maxVal) * (chartH / 2)
          const revY = chartH / 2 - revH
          const profH = Math.abs(profit / maxVal) * (chartH / 2)
          const profY = profit >= 0
            ? chartH / 2 - profH
            : chartH / 2
          const bw = slotW * 0.35

          return (
            <g key={index}>
              <rect
                x={cx - bw}
                y={revY}
                width={bw * 0.9}
                height={revH}
                fill="rgba(0,255,65,0.4)"
              />
              <rect
                x={cx + 1}
                y={profY}
                width={bw * 0.9}
                height={profH}
                fill={profit >= 0 ? 'var(--cr2-lime)' : 'var(--cr2-red)'}
              />
              <text
                x={cx}
                y={chartH + 14}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize="5"
                fontFamily="monospace"
              >
                {index + 1}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="cr2-bar-chart-legend">
        <span className="cr2-bar-legend-item cr2-gray-fill">매출</span>
        <span className="cr2-bar-legend-item cr2-lime">순이익</span>
        <span className="cr2-bar-legend-item cr2-red">적자</span>
      </div>
    </div>
  )
}

function CapitalLineChart({ capitalHistory }) {
  const data = capitalHistory?.slice(-10) || []

  if (data.length < 2) {
    return (
      <div className="cr2-line-chart-empty cr2-gray">
        데이터 쌓이는 중...
      </div>
    )
  }

  const width = 280
  const height = 50
  const minVal = Math.min(...data)
  const maxVal = Math.max(...data)
  const range = maxVal - minVal || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - minVal) / range) * height
    return `${x},${y}`
  }).join(' ')

  const isUp = data[data.length - 1] >= data[0]
  const lineColor = isUp ? 'var(--cr2-lime)' : 'var(--cr2-red)'
  const areaPath = [
    `M 0,${height}`,
    ...data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - minVal) / range) * height
      return `L ${x},${y}`
    }),
    `L ${width},${height}`,
    'Z',
  ].join(' ')

  const formatK = (value) => {
    if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(1)}억`
    if (Math.abs(value) >= 10000) return `${Math.floor(value / 10000)}만`
    return value.toLocaleString()
  }

  const lastY = height - ((data[data.length - 1] - minVal) / range) * height

  return (
    <div className="cr2-line-chart-wrap">
      <div className="cr2-line-chart-label">자본 변화</div>
      <svg
        width="100%"
        height={height + 16}
        viewBox={`0 0 ${width} ${height + 16}`}
        preserveAspectRatio="none"
      >
        <path
          d={areaPath}
          fill={isUp ? 'rgba(0,255,65,0.08)' : 'rgba(220,20,60,0.08)'}
        />
        <polyline
          points={points}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle
          cx={width}
          cy={lastY}
          r="3"
          fill={lineColor}
        />
        <text x="2" y="8" fill="var(--cr2-gray)" fontSize="5" fontFamily="monospace">
          {formatK(maxVal)}
        </text>
        <text x="2" y={height - 2} fill="var(--cr2-gray)" fontSize="5" fontFamily="monospace">
          {formatK(minVal)}
        </text>
      </svg>
    </div>
  )
}

function NextTab({ gameState, onSettle }) {
  const stage = getCurrentStage(gameState.floor)
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
  const currentShare = (gameState.playerShareHistory || []).slice(-1)[0] || 0

  return (
    <div className="cr2-panel-content cr2-next-tab">
      <div className="cr2-next-charts">
        <ShareDonutChart
          share={currentShare}
          rivalName={stage?.rivalName}
        />

        <RevenueBarChart
          revenueHistory={gameState.revenueHistory}
          profitHistory={gameState.profitHistory}
        />

        <CapitalLineChart
          capitalHistory={gameState.capitalHistory}
        />
      </div>

      <div className="cr2-next-divider" />

      <div className="cr2-next-summary">
        <div className="cr2-next-summary-title">이번 달 예상</div>
        <div className="cr2-next-row">
          <span>가격</span>
          <span>{price.toLocaleString()}원</span>
        </div>
        <div className="cr2-next-row">
          <span>발주</span>
          <span>{orderAmount.toLocaleString()}개</span>
        </div>
        <div className="cr2-next-row cr2-negative">
          <span>예정 지출</span>
          <span>{(totalExpense / 10000).toFixed(0)}만원</span>
        </div>
        {breakeven && (
          <div className="cr2-next-row cr2-gold">
            <span>손익분기점</span>
            <span>{breakeven.toLocaleString()}개</span>
          </div>
        )}
        <div className={`cr2-next-row cr2-next-profit ${expectedProfit >= 0 ? 'cr2-positive' : 'cr2-negative'}`}>
          <span>예상 순이익</span>
          <span>{expectedProfit >= 0 ? '+' : ''}{(expectedProfit / 10000).toFixed(0)}만원</span>
        </div>
      </div>

      <div className="cr2-next-desc cr2-gray">
        점유율과 손익은 정산에서 확정됩니다.
      </div>

      <button className="cr2-btn cr2-settle-btn" onClick={onSettle}>
        정산하기
      </button>
    </div>
  )
}

function getRivalProfileImage(rivalId) {
  return RIVALS.find(rival => rival.id === rivalId)?.profileImage || '/assets/logo_image-f7z3e97D.png'
}

function getTierColor(tier) {
  const map = {
    ENTRY: 'var(--cr2-gray)',
    MID: '#88FF88',
    SENIOR: 'var(--cr2-gold)',
    CHAMPION: 'var(--cr2-red)',
    BOSS: '#FF00FF',
  }
  return map[tier] || 'var(--cr2-gray)'
}

function getAbilityDesc(type) {
  const map = {
    MARKETING_BLITZ: '매 3턴 마케팅 집중 (인지도 +20%)',
    PRICE_DUMP: '매 5턴 가격 덤핑 (판매가 -30%)',
    COST_REDUCTION_STACK: '매 턴 원가 -0.5% 누적',
    QUALITY_RUSH: '매 3턴 품질 +5',
    BRAND_INVEST: '매 턴 브랜드 +0.2',
    PHASE_OPTIMIZER: '경기 국면 최적 전략 자동 적용',
    EVENT_AMPLIFY: '매 턴 외부 이벤트 강도 x1.5',
    AI_COUNTER: '플레이어 전략 패턴 분석 후 카운터',
  }
  return map[type] || type
}

function getInterventionDesc(type) {
  const map = {
    DEMAND_SUPPRESS: '매 5턴 전체 수요 -10%',
    SUPPLY_GLUT: '매 5턴 공급 과잉 압박',
    RAW_MATERIAL_MONOPOLY: '매 5턴 원자재 매점, 원가 +10%',
    ECONOMY_SUPPRESS: '매 3턴 경기 국면 강제 하향',
    CONSUMER_MANIPULATION: '매 3턴 브랜드 중시 소비자 +20%',
    PHASE_CHAOS: '매 3턴 경기 국면 무작위 변동',
    FORCE_EXTERNAL_EVENT: '매 턴 외부 이벤트 강제 발동',
    FULL_CONTROL: '매 턴 최악 경기 조건 강제',
  }
  return map[type] || type
}

function getGradeColor(grade) {
  const colors = { A: '#00FF41', B: '#FFD700', C: '#FF8800', D: '#DC143C' }
  return colors[grade] || '#888'
}
