import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Profile.css'

export default function Profile() {
  const { user, logout, updateProfile, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/auth/me')
      setProfile(response.data)
      setName(response.data.name)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile(name, profile?.avatar)
      setProfile(prev => ({ ...prev, name }))
      setEditing(false)
    } catch (error) {
      alert('فشل تحديث الملف الشخصي')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    if (window.confirm('هل أنت متأكد من تسجيل الخروج؟')) {
      logout()
      navigate('/')
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    )
  }

  const averageRating = profile?.ratingCount > 0
    ? (profile.totalRating / profile.ratingCount).toFixed(1)
    : 0

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>حسابي الشخصي</h1>
        <button className="btn-outline" onClick={() => navigate('/')}>
          ← الصفحة الرئيسية
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-avatar">
            {profile?.avatar ? (
              <img src={profile.avatar} alt={profile.name} />
            ) : (
              <div className="avatar-placeholder">
                {profile?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          
          {editing ? (
            <div className="edit-form">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="الاسم"
              />
              <div className="edit-actions">
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button className="btn-outline" onClick={() => {
                  setName(profile.name)
                  setEditing(false)
                }}>
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2>{profile?.name}</h2>
              <p className="profile-email">{profile?.email}</p>
              <button className="btn-outline btn-small" onClick={() => setEditing(true)}>
                ✏️ تعديل الاسم
              </button>
            </>
          )}

          <div className="profile-stats">
            <div className="stat">
              <div className="stat-value">{profile?.drawings?.length || 0}</div>
              <div className="stat-label">الرسومات</div>
            </div>
            <div className="stat">
              <div className="stat-value">{averageRating}</div>
              <div className="stat-label">متوسط التقييم</div>
            </div>
            <div className="stat">
              <div className="stat-value">{profile?.ratingCount || 0}</div>
              <div className="stat-label">التقييمات</div>
            </div>
          </div>
        </div>

        <div className="profile-drawings">
          <h3>رسوماتي السابقة</h3>
          {profile?.drawings?.length > 0 ? (
            <div className="drawings-grid">
              {profile.drawings.slice().reverse().map((drawing, index) => (
                <div key={index} className="drawing-card">
                  <img src={drawing.imageData} alt={`رسم ${index + 1}`} />
                  <p>{new Date(drawing.timestamp).toLocaleDateString('ar')}</p>
                  {drawing.roomCode && (
                    <small className="room-code">غرفة: {drawing.roomCode}</small>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">لا توجد رسومات بعد. ابدأ الرسم الآن! 🎨</p>
          )}
        </div>

        <div className="profile-actions">
          <button className="btn-danger" onClick={handleLogout}>
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  )
}
