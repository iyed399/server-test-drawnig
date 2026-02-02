import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import io from 'socket.io-client'
import RatingSystem from '../components/RatingSystem'
import './Results.css'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

export default function Results() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [results, setResults] = useState(null)
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    fetchResults()

    const token = localStorage.getItem('token')
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    newSocket.emit('join-room', { roomCode: code, userId: user.id })

    newSocket.on('rankings-updated', (data) => {
      setRankings(data)
      fetchResults()
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [code, user?.id])

  const fetchResults = async () => {
    try {
      const response = await axios.get(`/api/rooms/${code}/results`)
      setResults(response.data)
      setRankings(response.data.rankings || [])
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRate = (targetUserId, rating) => {
    if (socket) {
      socket.emit('submit-rating', { targetUserId, rating })
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري تحميل النتائج...</p>
      </div>
    )
  }

  if (!results || rankings.length === 0) {
    return (
      <div className="error-container">
        <p>لا توجد نتائج متاحة</p>
        <button className="btn-primary" onClick={() => navigate(`/room/${code}`)}>
          العودة للغرفة
        </button>
      </div>
    )
  }

  const winner = results.winner
  const topThree = results.topThree || []

  return (
    <div className="results-page">
      <div className="results-header">
        <button className="btn-outline" onClick={() => navigate(`/room/${code}`)}>
          ← العودة للغرفة
        </button>
        <h1>🏆 نتائج التحدي</h1>
        <div className="room-code-small">كود الغرفة: {code}</div>
      </div>

      {winner && (
        <div className="winner-section">
          <div className="winner-card">
            <div className="winner-badge">🥇</div>
            <h2>الفائز</h2>
            <div className="winner-name">{winner.userName}</div>
            <div className="winner-rating">
              ⭐ {winner.averageRating} ({winner.totalRatings} تقييم)
            </div>
            {winner.drawing && (
              <img src={winner.drawing.imageData} alt="رسم الفائز" className="winner-drawing" />
            )}
          </div>
        </div>
      )}

      {topThree.length > 1 && (
        <div className="top-three-section">
          <h3>أفضل 3 رسومات</h3>
          <div className="top-three">
            {topThree.map((rank, index) => (
              <div key={rank.userId} className={`podium-item ${index === 0 ? 'first' : index === 1 ? 'second' : 'third'}`}>
                <div className="podium-badge">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </div>
                <div className="podium-name">{rank.userName}</div>
                <div className="podium-rating">⭐ {rank.averageRating}</div>
                {rank.drawing && (
                  <img src={rank.drawing.imageData} alt={`رسم ${index + 1}`} className="podium-drawing" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rankings-section">
        <h3>الترتيب الكامل</h3>
        <div className="rankings-list">
          {rankings.map((rank, index) => (
            <div key={rank.userId} className={`ranking-item ${index < 3 ? 'top' : ''}`}>
              <div className="rank-position">#{index + 1}</div>
              <div className="rank-info">
                <div className="rank-name">{rank.userName}</div>
                <div className="rank-stats">
                  ⭐ {rank.averageRating} • {rank.totalRatings} تقييم
                </div>
              </div>
              {rank.drawing && (
                <img src={rank.drawing.imageData} alt="رسم" className="rank-drawing" />
              )}
            </div>
          ))}
        </div>
      </div>

      {results && (
        <RatingSystem
          drawings={Object.fromEntries(
            rankings.map(r => [r.userId, r.drawing])
          )}
          ratings={{}}
          onRate={handleRate}
          currentUserId={user.id}
          roomCode={code}
        />
      )}
    </div>
  )
}
