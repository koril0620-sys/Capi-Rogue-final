import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { signIn, signUp } from '../logic/authEngine'
import '../styles/login.css'

export default function LoginScreen() {
  const setCurrentScreen = useGameStore(state => state.setCurrentScreen)
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [userType, setUserType] = useState('general')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGuestWarning, setShowGuestWarning] = useState(false)

  const handleLogin = async () => {
    if (!username || !password) {
      setError('아이디와 비밀번호를 입력하세요.')
      return
    }

    setLoading(true)
    setError('')
    const result = await signIn(username, password, rememberMe)
    setLoading(false)

    if (result.success) {
      setCurrentScreen('title')
    } else {
      setError(result.error)
    }
  }

  const handleSignup = async () => {
    if (!username || !password) {
      setError('모든 항목을 입력하세요.')
      return
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (username.length < 3) {
      setError('아이디는 3자 이상이어야 합니다.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    setLoading(true)
    setError('')
    const result = await signUp(username, password, userType)
    setLoading(false)

    if (result.success) {
      setMode('login')
      setError('회원가입 완료! 로그인하세요.')
    } else {
      setError(result.error)
    }
  }

  const handleGuest = () => {
    setShowGuestWarning(true)
  }

  const handleGuestConfirm = () => {
    setShowGuestWarning(false)
    setCurrentScreen('title')
  }

  return (
    <div className="cr2-login-screen">
      <div className="cr2-login-logo">CapiRogue</div>

      <div className="cr2-login-card">
        <div className="cr2-login-title">
          {mode === 'login' ? '접 속' : '회 원 가 입'}
        </div>

        <div className="cr2-login-label">아이디</div>
        <input
          className="cr2-login-input"
          type="text"
          value={username}
          onChange={event => setUsername(event.target.value)}
          placeholder="아이디 3자 이상"
          onKeyDown={event => event.key === 'Enter' && mode === 'login' && handleLogin()}
        />

        <div className="cr2-login-label">비밀번호</div>
        <input
          className="cr2-login-input"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="비밀번호 6자 이상"
          onKeyDown={event => event.key === 'Enter' && mode === 'login' && handleLogin()}
        />

        {mode === 'signup' && (
          <>
            <div className="cr2-login-label">비밀번호 확인</div>
            <input
              className="cr2-login-input"
              type="password"
              value={passwordConfirm}
              onChange={event => setPasswordConfirm(event.target.value)}
              placeholder="비밀번호 재입력"
            />

            <div className="cr2-login-label">계정 유형</div>
            <div className="cr2-login-usertype">
              {['student', 'teacher', 'general'].map(type => (
                <button
                  key={type}
                  className={`cr2-login-type-btn ${userType === type ? 'cr2-selected' : ''}`}
                  onClick={() => setUserType(type)}
                >
                  {type === 'student' ? '학생' : type === 'teacher' ? '교사' : '일반'}
                </button>
              ))}
            </div>
            {userType === 'student' && (
              <div className="cr2-login-type-hint">
                학생 계정은 성취기준 달성 현황이 저장됩니다.
              </div>
            )}
          </>
        )}

        {mode === 'login' && (
          <label className="cr2-login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={event => setRememberMe(event.target.checked)}
            />
            자동 로그인
          </label>
        )}

        {error && <div className="cr2-login-error">{error}</div>}

        <div className="cr2-login-btns">
          {mode === 'login' ? (
            <>
              <button
                className="cr2-btn cr2-login-main-btn"
                onClick={handleLogin}
                disabled={loading}
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
              <button className="cr2-btn" onClick={handleGuest}>게스트</button>
              <button className="cr2-btn" onClick={() => setMode('signup')}>회원가입</button>
            </>
          ) : (
            <>
              <button
                className="cr2-btn cr2-login-main-btn"
                onClick={handleSignup}
                disabled={loading}
              >
                {loading ? '처리 중...' : '회원가입'}
              </button>
              <button className="cr2-btn" onClick={() => setMode('login')}>뒤로</button>
            </>
          )}
        </div>
      </div>

      {showGuestWarning && (
        <div className="cr2-popup-overlay">
          <div className="cr2-guest-warning">
            <div className="cr2-guest-warning-title">⚠️ 게스트 모드</div>
            <div className="cr2-guest-warning-text">
              게스트 모드에서는 진행 상황이<br />
              저장되지 않습니다.<br />
              브라우저를 닫으면 데이터가 사라집니다.
            </div>
            <div className="cr2-guest-warning-btns">
              <button
                className="cr2-btn cr2-btn-ghost"
                onClick={handleGuestConfirm}
              >
                그래도 게스트로
              </button>
              <button
                className="cr2-btn"
                onClick={() => setShowGuestWarning(false)}
              >
                돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {import.meta.env.VITE_DEV_MODE === 'true' && (
        <button
          onClick={() => {
            useGameStore.setState({
              floor: 120,
              capital: 50000000,
              health: 5,
              marketShare: 0.45,
            })
            useGameStore.getState().setCurrentScreen('ending')
          }}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            fontSize: '9px',
            color: 'var(--cr2-gray)',
            background: 'transparent',
            border: '1px solid var(--cr2-gray)',
            padding: '2px 6px',
            cursor: 'pointer',
            zIndex: 999,
          }}
        >
          DEV: 엔딩
        </button>
      )}
    </div>
  )
}
