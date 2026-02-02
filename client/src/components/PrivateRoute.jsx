import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '50px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div className="spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}
