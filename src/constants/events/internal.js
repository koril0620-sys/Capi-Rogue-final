export const INTERNAL_EVENTS = [
  {
    id: 'I01',
    title: '불량품 발생',
    category: 'PRODUCTION',
    description: '생산 라인에서 불량품이 대거 발생했다.',
    choices: [
      {
        id: 'A',
        label: '전량 폐기',
        type: 'SAFE',
        outcome: { capitalChange: '-SM', qualityChange: 0 },
      },
      {
        id: 'B',
        label: '품질 검수 강화',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-MD', qualityChange: 2 } },
          { prob: 0.30, result: { capitalChange: '-MD', qualityChange: -1 } },
        ],
      },
      {
        id: 'C',
        label: '그냥 출하',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.30, result: { capitalChange: 0, brandChange: -2 } },
          { prob: 0.70, result: { capitalChange: '-LG', brandChange: -4, creditChange: -3 } },
        ],
      },
    ],
  },
  {
    id: 'I02',
    title: '신기술 도입 기회',
    category: 'PRODUCTION',
    description: '생산 효율을 높이는 신기술을 도입할 기회가 생겼다.',
    choices: [
      {
        id: 'A',
        label: '도입 포기',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '부분 도입',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-MD', costReduction: 0.03 } },
          { prob: 0.30, result: { capitalChange: '-MD' } },
        ],
      },
      {
        id: 'C',
        label: '전면 도입',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.30, result: { capitalChange: '-LG', costReduction: 0.08 } },
          { prob: 0.70, result: { capitalChange: '-LG' } },
        ],
      },
    ],
  },
  {
    id: 'I03',
    title: '원자재 재고 확보 기회',
    category: 'PRODUCTION',
    description: '원자재를 저가에 대량 확보할 기회가 생겼다.',
    choices: [
      {
        id: 'A',
        label: '패스',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '소량 확보',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-SM', costReduction: 0.02, duration: 3 } },
          { prob: 0.30, result: { capitalChange: '-SM' } },
        ],
      },
      {
        id: 'C',
        label: '대량 확보',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.30, result: { capitalChange: '-MD', costReduction: 0.06, duration: 5 } },
          { prob: 0.70, result: { capitalChange: '-MD' } },
        ],
      },
    ],
  },
  {
    id: 'I04',
    title: '설비 노후화',
    category: 'PRODUCTION',
    description: '오래된 설비가 고장 직전이다.',
    choices: [
      {
        id: 'A',
        label: '즉시 교체',
        type: 'SAFE',
        outcome: { capitalChange: '-MD', qualityChange: 1 },
      },
      {
        id: 'B',
        label: '임시 수리',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-SM' } },
          { prob: 0.30, result: { capitalChange: '-LG', orderCapChange: -200 } },
        ],
      },
      {
        id: 'C',
        label: '그냥 사용',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.30, result: { capitalChange: 0 } },
          { prob: 0.70, result: { capitalChange: '-LG', healthChange: -1 } },
        ],
      },
    ],
  },
  {
    id: 'I05',
    title: '품질 인증 기회',
    category: 'PRODUCTION',
    description: '국제 품질 인증을 취득할 기회가 왔다.',
    choices: [
      {
        id: 'A',
        label: '포기',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '도전',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-MD', brandChange: 2, qualityChange: 3 } },
          { prob: 0.30, result: { capitalChange: '-MD' } },
        ],
      },
    ],
  },
  {
    id: 'I06',
    title: '핵심 직원 이직 요청',
    category: 'HR',
    description: '핵심 생산 직원이 연봉 인상을 요구하며 이직을 시사했다.',
    choices: [
      {
        id: 'A',
        label: '요구 수용',
        type: 'SAFE',
        outcome: { capitalChange: '-SM', healthChange: 0 },
      },
      {
        id: 'B',
        label: '협상',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-XS' } },
          { prob: 0.30, result: { qualityChange: -2, orderCapChange: -100 } },
        ],
      },
      {
        id: 'C',
        label: '거절',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.30, result: { capitalChange: 0 } },
          { prob: 0.70, result: { qualityChange: -3, orderCapChange: -200, healthChange: -1 } },
        ],
      },
    ],
  },
  {
    id: 'I07',
    title: '우수 인재 영입 기회',
    category: 'HR',
    description: '업계 전문가를 영입할 기회가 생겼다.',
    choices: [
      {
        id: 'A',
        label: '패스',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '영입',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-MD', qualityChange: 3, orderCapChange: 100 } },
          { prob: 0.30, result: { capitalChange: '-MD' } },
        ],
      },
    ],
  },
  {
    id: 'I08',
    title: '내부 비리 제보',
    category: 'HR',
    description: '직원 중 일부가 원자재 횡령을 하고 있다는 제보가 들어왔다.',
    choices: [
      {
        id: 'A',
        label: '즉시 해고',
        type: 'SAFE',
        outcome: { capitalChange: '-SM', healthChange: 0 },
      },
      {
        id: 'B',
        label: '내부 조사',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: 0 } },
          { prob: 0.30, result: { capitalChange: '-MD', healthChange: -1 } },
        ],
      },
      {
        id: 'C',
        label: '묵인',
        type: 'ABSURD',
        outcome: [
          { prob: 0.20, result: { capitalChange: '+SM' } },
          { prob: 0.40, result: { capitalChange: 0 } },
          { prob: 0.40, result: { capitalChange: '-LG', creditChange: -5, healthChange: -2 } },
        ],
      },
    ],
  },
  {
    id: 'I09',
    title: '직원 복지 요구',
    category: 'HR',
    description: '직원들이 복지 개선을 단체로 요구했다.',
    choices: [
      {
        id: 'A',
        label: '전면 수용',
        type: 'SAFE',
        outcome: { capitalChange: '-MD', healthChange: 1 },
      },
      {
        id: 'B',
        label: '일부 수용',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-SM' } },
          { prob: 0.30, result: { capitalChange: '-SM', orderCapChange: -100 } },
        ],
      },
      {
        id: 'C',
        label: '거절',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.30, result: { capitalChange: 0 } },
          { prob: 0.70, result: { healthChange: -2, qualityChange: -1 } },
        ],
      },
    ],
  },
  {
    id: 'I10',
    title: '팀 빌딩 기회',
    category: 'HR',
    description: '팀워크를 강화할 워크숍 기회가 생겼다.',
    choices: [
      {
        id: 'A',
        label: '패스',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '진행',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-SM', healthChange: 1, qualityChange: 1 } },
          { prob: 0.30, result: { capitalChange: '-SM' } },
        ],
      },
    ],
  },
  {
    id: 'I11',
    title: '악성 루머 확산',
    category: 'MARKETING',
    description: '근거 없는 제품 결함 루머가 퍼지고 있다.',
    choices: [
      {
        id: 'A',
        label: '공식 해명',
        type: 'SAFE',
        outcome: { capitalChange: '-SM', brandChange: 0 },
      },
      {
        id: 'B',
        label: '무시',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: 0 } },
          { prob: 0.30, result: { brandChange: -2, awarenessChange: -10 } },
        ],
      },
      {
        id: 'C',
        label: '역이용 마케팅',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.40, result: { capitalChange: '-SM', brandChange: 2, awarenessChange: 15 } },
          { prob: 0.60, result: { capitalChange: '-SM', brandChange: -3 } },
        ],
      },
    ],
  },
  {
    id: 'I12',
    title: '콜라보 제안',
    category: 'MARKETING',
    description: '유명 브랜드에서 콜라보 제안이 들어왔다.',
    choices: [
      {
        id: 'A',
        label: '거절',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '수락',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-MD', brandChange: 3, awarenessChange: 20 } },
          { prob: 0.30, result: { capitalChange: '-MD', brandChange: -1 } },
        ],
      },
    ],
  },
  {
    id: 'I13',
    title: '바이럴 마케팅 기회',
    category: 'MARKETING',
    description: 'SNS 바이럴 마케팅 기회가 생겼다.',
    choices: [
      {
        id: 'A',
        label: '패스',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '소규모 시도',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-SM', awarenessChange: 15 } },
          { prob: 0.30, result: { capitalChange: '-SM' } },
        ],
      },
      {
        id: 'C',
        label: '전면 투자',
        type: 'ABSURD',
        outcome: [
          { prob: 0.20, result: { capitalChange: '-LG', awarenessChange: 40, brandChange: 3 } },
          { prob: 0.40, result: { capitalChange: '-LG', awarenessChange: 15 } },
          { prob: 0.40, result: { capitalChange: '-LG', brandChange: -1 } },
        ],
      },
    ],
  },
  {
    id: 'I14',
    title: '제품 리뉴얼 기회',
    category: 'MARKETING',
    description: '제품을 리뉴얼해 브랜드를 새롭게 할 기회가 왔다.',
    choices: [
      {
        id: 'A',
        label: '현상 유지',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '부분 리뉴얼',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-SM', brandChange: 1, qualityChange: 2 } },
          { prob: 0.30, result: { capitalChange: '-SM', brandChange: -1 } },
        ],
      },
      {
        id: 'C',
        label: '전면 리뉴얼',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.30, result: { capitalChange: '-LG', brandChange: 4, qualityChange: 5 } },
          { prob: 0.70, result: { capitalChange: '-LG', brandChange: -2 } },
        ],
      },
    ],
  },
  {
    id: 'I15',
    title: '광고 모델 섭외 기회',
    category: 'MARKETING',
    description: '유명 인플루언서가 광고 모델 제안을 해왔다.',
    choices: [
      {
        id: 'A',
        label: '거절',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '단기 계약',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '-MD', awarenessChange: 25 } },
          { prob: 0.30, result: { capitalChange: '-MD' } },
        ],
      },
    ],
  },
  {
    id: 'I16',
    title: '투자자 미팅 기회',
    category: 'FINANCE',
    description: '벤처 투자자가 미팅을 요청했다.',
    choices: [
      {
        id: 'A',
        label: '거절',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '미팅 진행',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '+LG', creditChange: 5 } },
          { prob: 0.30, result: { capitalChange: 0 } },
        ],
      },
    ],
  },
  {
    id: 'I17',
    title: '세금 조사',
    category: 'FINANCE',
    description: '세무 당국에서 세금 조사를 나왔다.',
    choices: [
      {
        id: 'A',
        label: '성실 신고',
        type: 'SAFE',
        outcome: { capitalChange: '-SM', creditChange: 2 },
      },
      {
        id: 'B',
        label: '최소 신고',
        type: 'GAMBLE',
        outcome: [
          { prob: 0.30, result: { capitalChange: 0 } },
          { prob: 0.70, result: { capitalChange: '-LG', creditChange: -8 } },
        ],
      },
    ],
  },
  {
    id: 'I18',
    title: '부동산 매각 기회',
    category: 'FINANCE',
    description: '보유 창고를 시세보다 높게 매각할 기회가 생겼다.',
    choices: [
      {
        id: 'A',
        label: '유지',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '매각',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '+LG', orderCapChange: -200 } },
          { prob: 0.30, result: { capitalChange: '+SM' } },
        ],
      },
    ],
  },
  {
    id: 'I19',
    title: 'M&A 제안',
    category: 'FINANCE',
    description: '경쟁사가 합병 제안을 해왔다.',
    choices: [
      {
        id: 'A',
        label: '거절',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '부분 수용',
        type: 'ABSURD',
        outcome: [
          { prob: 0.20, result: { capitalChange: '+LG', brandChange: 2 } },
          { prob: 0.40, result: { capitalChange: '+SM' } },
          { prob: 0.40, result: { capitalChange: '-MD', healthChange: -1 } },
        ],
      },
    ],
  },
  {
    id: 'I20',
    title: '정부 보조금 신청',
    category: 'FINANCE',
    description: '중소기업 지원 보조금 신청 기간이 열렸다.',
    choices: [
      {
        id: 'A',
        label: '신청 안 함',
        type: 'SAFE',
        outcome: { capitalChange: 0 },
      },
      {
        id: 'B',
        label: '신청',
        type: 'NORMAL',
        outcome: [
          { prob: 0.70, result: { capitalChange: '+MD', creditChange: 2 } },
          { prob: 0.30, result: { capitalChange: 0 } },
        ],
      },
    ],
  },
]

export const CASH_CONSTANTS = {
  '+XS': (capital) => Math.floor(capital * 0.02),
  '+SM': (capital) => Math.floor(capital * 0.05),
  '+MD': (capital) => Math.floor(capital * 0.15),
  '+LG': (capital) => Math.floor(capital * 0.30),
  '-XS': (capital) => -Math.floor(capital * 0.02),
  '-SM': (capital) => -Math.floor(capital * 0.05),
  '-MD': (capital) => -Math.floor(capital * 0.15),
  '-LG': (capital) => -Math.floor(capital * 0.30),
}
