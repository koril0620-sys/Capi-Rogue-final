export const RIVAL_EVENTS = [
  {
    id: 'RE01',
    type: 'PRICE_CUT',
    title: '라이벌 가격 인하',
    description: '{rivalName}이 판매가를 대폭 낮췄다.',
    minRivalTier: 'ENTRY',
    effect: {
      rivalPriceMultiplier: 0.75,
      duration: 2,
    },
  },
  {
    id: 'RE02',
    type: 'AGGRESSIVE_MARKETING',
    title: '라이벌 마케팅 공세',
    description: '{rivalName}이 대규모 마케팅에 투자했다.',
    minRivalTier: 'ENTRY',
    effect: {
      rivalAwarenessBoost: 25,
      duration: 2,
    },
  },
  {
    id: 'RE03',
    type: 'QUALITY_UPGRADE',
    title: '라이벌 품질 업그레이드',
    description: '{rivalName}이 제품 품질을 높였다.',
    minRivalTier: 'MID',
    effect: {
      rivalQualityBoost: 5,
    },
  },
  {
    id: 'RE04',
    type: 'NEW_PRODUCT',
    title: '라이벌 신제품 출시',
    description: '{rivalName}이 신제품을 출시했다.',
    minRivalTier: 'MID',
    effect: {
      rivalAttractionBoost: 1.15,
      duration: 3,
    },
  },
  {
    id: 'RE05',
    type: 'DUMPING',
    title: '라이벌 덤핑 전략',
    description: '{rivalName}이 원가 이하로 제품을 팔기 시작했다.',
    minRivalTier: 'MID',
    effect: {
      rivalPriceMultiplier: 0.60,
      rivalCapitalDrain: 0.03,
      duration: 3,
    },
  },
  {
    id: 'RE06',
    type: 'BRAND_COLLAB',
    title: '라이벌 브랜드 협업',
    description: '{rivalName}이 유명 브랜드와 협업했다.',
    minRivalTier: 'SENIOR',
    effect: {
      rivalBrandBoost: 3,
      rivalAwarenessBoost: 20,
    },
  },
  {
    id: 'RE07',
    type: 'FACTORY_EXPANSION',
    title: '라이벌 공장 증설',
    description: '{rivalName}이 생산 시설을 확장했다.',
    minRivalTier: 'SENIOR',
    effect: {
      rivalOrderCapBoost: 300,
      rivalCostReduction: 0.05,
    },
  },
  {
    id: 'RE08',
    type: 'PATENT',
    title: '라이벌 특허 공세',
    description: '{rivalName}이 핵심 기술 특허를 취득했다.',
    minRivalTier: 'SENIOR',
    effect: {
      playerCostIncrease: 0.10,
      duration: 4,
    },
  },
  {
    id: 'RE09',
    type: 'TALENT_SCOUT',
    title: '라이벌 인재 스카우트',
    description: '{rivalName}이 우리 핵심 직원을 빼갔다.',
    minRivalTier: 'CHAMPION',
    effect: {
      playerQualityDecrease: 3,
      playerOrderCapDecrease: 100,
    },
  },
  {
    id: 'RE10',
    type: 'MONOPOLY_ATTEMPT',
    title: '라이벌 시장 독점 시도',
    description: '{rivalName}이 공급망을 장악해 우리 원가를 올렸다.',
    minRivalTier: 'CHAMPION',
    effect: {
      playerCostIncrease: 0.20,
      rivalAttractionBoost: 1.20,
      duration: 3,
    },
  },
]
