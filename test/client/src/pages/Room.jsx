import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import io from 'socket.io-client'
import './Room.css'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

export default function Room() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [room, setRoom] = useState(null)
  const [settings, setSettings] = useState(null)
  const [socket, setSocket] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRoom()
    return () => {
      if (socket) {
        socket.close()
      }
    }
  }, [code])

  useEffect(() => {
    if (room && user) {
      const token = localStorage.getItem('token')
      const newSocket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling']
      })

      newSocket.emit('join-room', { roomCode: code, userId: user.id })

      newSocket.on('room-state', (data) => {
        setSettings(data.settings)
        setParticipants(data.participants || [])
      })

      newSocket.on('user-joined', (data) => {
        setParticipants(data.participants || [])
      })

      newSocket.on('user-left', (data) => {
        setParticipants(data.participants || [])
      })

      newSocket.on('error', (data) => {
        setError(data.message)
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    }
  }, [room, user, code])

  const fetchRoom = async () => {
    try {
      const response = await axios.get(`/api/rooms/${code}`)
      setRoom(response.data.room)
      setSettings(response.data.room.settings)
      setParticipants(response.data.room.participants || [])
    } catch (error) {
      setError(error.response?.data?.error || 'الغرفة غير موجودة')
      setTimeout(() => navigate('/'), 2000)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (newSettings) => {
    try {
      await axios.put(`/api/rooms/${code}/settings`, {
        settings: newSettings
      })
      setSettings(newSettings)
    } catch (error) {
      setError(error.response?.data?.error || 'فشل تحديث الإعدادات')
    }
  }

  const startDrawing = () => {
    navigate(`/draw/${code}`)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري تحميل الغرفة...</p>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>
          العودة للصفحة الرئيسية
        </button>
      </div>
    )
  }

  if (!room) return null

  const isHost = room.hostId === user?.id

  return (
    <div className="room-page">
      <div className="room-header">
        <button className="btn-outline" onClick={() => navigate('/')}>
          ← الصفحة الرئيسية
        </button>
        <div className="room-info">
          <h1>غرفة الرسم</h1>
          <div className="room-code-display">
            <span className="code-label">كود الغرفة:</span>
            <strong className="code-value">{code}</strong>
            <button 
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(code)
                alert('تم نسخ الكود!')
              }}
            >
              📋
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="room-content">
        <div className="room-sidebar">
          <div className="card">
            <h3>المشاركون ({participants.length})</h3>
            <div className="participants-list">
              {participants.map((pId) => {
                const participant = participants.find(p => p === pId)
                return (
                  <div key={pId} className={`participant ${pId === user?.id ? 'current-user' : ''}`}>
                    <span className="participant-icon">👤</span>
                    {pId === user?.id ? 'أنت' : `مشارك ${pId.slice(-4)}`}
                  </div>
                )
              })}
            </div>
          </div>

          {isHost && (
            <div className="card">
              <h3>⚙️ إعدادات الغرفة</h3>
              <div className="settings">
                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={settings?.timerEnabled || false}
                    onChange={(e) =>
                      updateSettings({ ...settings, timerEnabled: e.target.checked })
                    }
                  />
                  <span>تفعيل المؤقت</span>
                </label>

                {settings?.timerEnabled && (
                  <div className="setting-item">
                    <label>مدة المؤقت (بالثواني)</label>
                    <input
                      type="number"
                      value={settings.timerDuration || 300}
                      onChange={(e) =>
                        updateSettings({
                          ...settings,
                          timerDuration: Math.max(60, parseInt(e.target.value) || 300)
                        })
                      }
                      min="60"
                      step="60"
                    />
                  </div>
                )}

                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={settings?.votingEnabled !== false}
                    onChange={(e) =>
                      updateSettings({ ...settings, votingEnabled: e.target.checked })
                    }
                  />
                  <span>تفعيل التقييم</span>
                </label>

                <label className="setting-item">
                  <input
                    type="checkbox"
                    checked={settings?.showDrawingsDuringTimer || false}
                    onChange={(e) =>
                      updateSettings({
                        ...settings,
                        showDrawingsDuringTimer: e.target.checked
                      })
                    }
                  />
                  <span>عرض الرسومات أثناء المؤقت</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="room-main">
          <div className="card welcome-card">
            <div className="welcome-icon">🎨</div>
            <h2>جاهز للرسم؟</h2>
            <p>انقر على الزر أدناه للبدء في التحدي</p>
            <button className="btn-primary btn-large" onClick={startDrawing}>
              ابدأ الرسم الآن
            </button>
            {room.status === 'completed' && (
              <button 
                className="btn-secondary btn-large mt-2" 
                onClick={() => navigate(`/results/${code}`)}
              >
                عرض النتائج
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
