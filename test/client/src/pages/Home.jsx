import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import './Home.css'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const createRoom = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await axios.post('/api/rooms/create', {
        settings: {
          timerEnabled: false,
          timerDuration: 300,
          votingEnabled: true,
          showDrawingsDuringTimer: false,
          maxParticipants: 10
        }
      })
      navigate(`/room/${response.data.room.code}`)
    } catch (error) {
      setError(error.response?.data?.error || 'حدث خطأ في إنشاء الغرفة')
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    if (!roomCode.trim()) {
      setError('يرجى إدخال كود الغرفة')
      return
    }

    setLoading(true)
    setError('')
    try {
      await axios.post('/api/rooms/join', {
        code: roomCode.toUpperCase().trim()
      })
      navigate(`/room/${roomCode.toUpperCase().trim()}`)
    } catch (error) {
      setError(error.response?.data?.error || 'الغرفة غير موجودة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home">
      <div className="hero fade-in">
        <h1>🎨 منصة الرسم الجماعي</h1>
        <p className="subtitle">ارسم، تحدى، وشارك إبداعك مع الآخرين</p>
      </div>

      <div className="actions">
        <div className="action-card slide-in">
          <div className="card-icon">✨</div>
          <h2>إنشاء غرفة جديدة</h2>
          <p>ابدأ تحدياً جديداً وادعُ أصدقاءك للانضمام</p>
          <button 
            className="btn-primary btn-large" 
            onClick={createRoom} 
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                جاري الإنشاء...
              </>
            ) : (
              'إنشاء غرفة'
            )}
          </button>
        </div>

        <div className="action-card slide-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-icon">🚪</div>
          <h2>الدخول إلى غرفة</h2>
          <p>أدخل كود الغرفة للانضمام إلى التحدي</p>
          <div className="join-form">
            <input
              type="text"
              placeholder="أدخل كود الغرفة (6 أحرف)"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                setError('')
              }}
              maxLength={6}
              className={error ? 'error' : ''}
            />
            <button 
              className="btn-primary btn-large" 
              onClick={joinRoom} 
              disabled={loading || !roomCode.trim()}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                  جاري الانضمام...
                </>
              ) : (
                'انضم الآن'
              )}
            </button>
          </div>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>

      {user && (
        <div className="user-info fade-in">
          <p>مرحباً، <strong>{user.name}</strong>! 👋</p>
          <div className="user-actions">
            <a href="/profile" className="link-button">حسابي الشخصي</a>
            <span>•</span>
            <a href="/profile" className="link-button">رسوماتي ({user.drawings || 0})</a>
          </div>
        </div>
      )}

      {!user && (
        <div className="cta-section fade-in">
          <p>سجل الدخول للبدء</p>
          <button className="btn-outline" onClick={() => navigate('/login')}>
            تسجيل الدخول
          </button>
        </div>
      )}
    </div>
  )
}
