import { useState, useEffect } from 'react'
import axios from 'axios'
import './RatingSystem.css'

export default function RatingSystem({ drawings, ratings, onRate, currentUserId, roomCode }) {
  const [userRatings, setUserRatings] = useState({})
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    // Load existing ratings
    if (roomCode) {
      // You can fetch existing ratings here if needed
    }
  }, [roomCode])

  const handleRate = (targetUserId, rating) => {
    if (targetUserId === currentUserId) return
    
    setUserRatings(prev => ({ ...prev, [targetUserId]: rating }))
    if (onRate) {
      onRate(targetUserId, rating)
      setSubmitted(true)
    }
  }

  const getAverageRating = (userId) => {
    const userRatingsList = ratings[userId] || []
    if (userRatingsList.length === 0) return 0
    const sum = userRatingsList.reduce((acc, r) => acc + r.rating, 0)
    return (sum / userRatingsList.length).toFixed(1)
  }

  return (
    <div className="rating-system">
      <h3>🎯 قيّم الرسومات</h3>
      <p className="rating-instruction">
        قيّم رسومات المشاركين الآخرين (من 1 إلى 5 نجوم)
      </p>
      
      <div className="rating-section">
        {Object.entries(drawings).map(([userId, drawing]) => {
          if (userId === currentUserId || !drawing) return null
          
          return (
            <div key={userId} className="rating-item">
              <div className="rating-drawing">
                <img src={drawing.imageData} alt="رسم" />
              </div>
              <div className="rating-controls">
                <div className="rating-label">التقييم:</div>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star-btn ${userRatings[userId] >= star ? 'active' : ''}`}
                      onClick={() => handleRate(userId, star)}
                      disabled={submitted}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                {userRatings[userId] && (
                  <span className="rated-badge">
                    تم: {userRatings[userId]}/5
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {Object.keys(drawings).filter(id => id !== currentUserId).length === 0 && (
        <p className="no-ratings">لا توجد رسومات أخرى للتقييم</p>
      )}
    </div>
  )
}
