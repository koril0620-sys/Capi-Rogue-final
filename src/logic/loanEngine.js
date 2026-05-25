import { LOAN_TYPES } from '../constants/creditScore'
import { getGrade, getLoanLimit, getInterestRate } from './creditEngine'

export function takeLoan(loanTypeId, gameState) {
  const grade = getGrade(gameState.creditScore)
  if (grade === 'D') return { success: false, error: '신용등급 D — 대출 불가합니다.' }

  const loanType = LOAN_TYPES.find(loan => loan.id === loanTypeId)
  if (!loanType) return { success: false, error: '대출 종류 오류' }

  const limit = getLoanLimit(gameState.creditScore, gameState.capital)
  if (limit <= 0) return { success: false, error: '대출 한도가 없습니다.' }

  const interestRate = getInterestRate(
    gameState.creditScore,
    gameState.activeEffects,
    gameState.selectedAdvisor,
  )

  return {
    success: true,
    capitalIncrease: limit,
    newCapital: gameState.capital + limit,
    newLoan: {
      id: `loan_${Date.now()}`,
      type: loanTypeId,
      principal: limit,
      interestRate,
      remainingTurns: loanType.duration,
    },
    newDebt: gameState.debt + limit,
  }
}

export function processInterest(gameState) {
  if (!gameState.loans || gameState.loans.length === 0) {
    return { interestAmount: 0, isLate: false, interestPaid: true }
  }

  const monthlyInterest = gameState.loans.reduce((sum, loan) => {
    const monthlyRate = loan.interestRate / 12
    return sum + Math.floor(loan.principal * monthlyRate)
  }, 0)

  const isLate = gameState.capital < monthlyInterest

  return {
    interestAmount: monthlyInterest,
    isLate,
    interestPaid: !isLate,
  }
}

export function tickLoanDurations(loans) {
  return loans.map(loan => ({
    ...loan,
    remainingTurns: loan.remainingTurns - 1,
  }))
}

export function getMaturedLoans(loans) {
  return loans.filter(loan => loan.remainingTurns <= 0)
}

export function getUpcomingMaturityLoans(loans) {
  return loans.filter(loan => loan.remainingTurns > 0 && loan.remainingTurns <= 3)
}

export function repayLoan(loanId, gameState) {
  const loan = gameState.loans.find(item => item.id === loanId)
  if (!loan) return { success: false, error: '대출을 찾을 수 없습니다.' }

  if (gameState.capital < loan.principal) {
    return { success: false, error: '자본이 부족합니다.' }
  }

  return {
    success: true,
    capitalDecrease: loan.principal,
    newCapital: gameState.capital - loan.principal,
    newLoans: gameState.loans.filter(item => item.id !== loanId),
    newDebt: gameState.debt - loan.principal,
    loanRepaid: true,
  }
}

export function extendLoan(loanId, gameState) {
  const loan = gameState.loans.find(item => item.id === loanId)
  if (!loan) return { success: false, error: '대출을 찾을 수 없습니다.' }

  const loanType = LOAN_TYPES.find(item => item.id === loan.type)
  if (!loanType) return { success: false, error: '대출 종류 오류' }

  const grade = getGrade(gameState.creditScore)
  const gradeOrder = ['D', 'C', 'B', 'A']
  const requiredIndex = gradeOrder.indexOf(loanType.extensionGrade)
  const currentIndex = gradeOrder.indexOf(grade)

  if (currentIndex < requiredIndex) {
    return {
      success: false,
      error: `연장 조건 미충족 — ${loanType.extensionGrade}등급 이상 필요`,
    }
  }

  return {
    success: true,
    newLoans: gameState.loans.map(item =>
      item.id === loanId ? { ...item, remainingTurns: loanType.duration } : item,
    ),
  }
}

export function calculateLoanState(state) {
  return state
}
