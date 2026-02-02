import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        if (!name.trim()) {
          setError('الاسم مطلوب')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
          setLoading(false)
          return
        }
        await register(email, password, name)
      }
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // In production, implement proper Google OAuth
    alert('تسجيل الدخول عبر Google قيد التطوير. سيتم إضافته قريباً!')
  }

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="login-header">
          <h1>{isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1>
          <p>{isLogin ? 'مرحباً بعودتك!' : 'انضم إلينا وابدأ الرسم'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label>الاسم الكامل</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={!isLogin}
                placeholder="أدخل اسمك"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@email.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={isLogin ? undefined : 6}
              disabled={loading}
            />
            {!isLogin && (
              <small className="form-hint">6 أحرف على الأقل</small>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-primary btn-large" 
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                جاري المعالجة...
              </>
            ) : (
              isLogin ? 'تسجيل الدخول' : 'إنشاء حساب'
            )}
          </button>
        </form>

        <div className="divider">
          <span>أو</span>
        </div>

        <button 
          className="btn-google" 
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span>🔵</span> تسجيل الدخول عبر Google
        </button>

        <p className="switch-mode">
          {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            disabled={loading}
          >
            {isLogin ? 'إنشاء حساب' : 'تسجيل الدخول'}
          </button>
        </p>

        <Link to="/" className="back-link">
          ← العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  )
}
