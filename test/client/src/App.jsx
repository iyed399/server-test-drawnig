import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Room from './pages/Room'
import DrawingRoom from './pages/DrawingRoom'
import Profile from './pages/Profile'
import Results from './pages/Results'
import PrivateRoute from './components/PrivateRoute'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/room/:code" element={<PrivateRoute><Room /></PrivateRoute>} />
          <Route path="/draw/:code" element={<PrivateRoute><DrawingRoom /></PrivateRoute>} />
          <Route path="/results/:code" element={<PrivateRoute><Results /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
