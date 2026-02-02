import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import io from 'socket.io-client'
import DrawingCanvas from '../components/DrawingCanvas'
import DrawingTools from '../components/DrawingTools'
import './DrawingRoom.css'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

export default function DrawingRoom() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [socket, setSocket] = useState(null)
  const [roomState, setRoomState] = useState(null)
  const [drawingColor, setDrawingColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(5)
  const [tool, setTool] = useState('pen')
  const [timer, setTimer] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [drawings, setDrawings] = useState({})
  const [showDrawings, setShowDrawings] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef(null)
  const autoSaveInterval = useRef(null)

  useEffect(() => {
    if (!user) return

    const token = localStorage.getItem('token')
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    newSocket.emit('join-room', { roomCode: code, userId: user.id })

    newSocket.on('room-state', (data) => {
      setRoomState(data)
      if (data.settings?.showDrawingsDuringTimer || data.status === 'completed') {
        setShowDrawings(true)
        setDrawings(data.drawings || {})
      }
    })

    newSocket.on('timer-started', (data) => {
      setTimeLeft(data.duration)
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      setTimer(interval)
    })

    newSocket.on('timer-ended', (data) => {
      if (timer) clearInterval(timer)
      setTimeLeft(0)
      setShowDrawings(true)
      setDrawings(data.drawings || {})
      setRoomState((prev) => ({ ...prev, status: 'completed' }))
    })

    newSocket.on('drawing-updated', ({ userId, imageData, userName }) => {
      if (userId !== user.id) {
        setDrawings((prev) => ({ ...prev, [userId]: { imageData, userName } }))
      }
    })

    newSocket.on('drawing-copied', ({ imageData }) => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
          ctx.drawImage(img, 0, 0)
          saveDrawing()
        }
        img.src = imageData
      }
    })

    newSocket.on('error', (data) => {
      alert(data.message || 'حدث خطأ')
    })

    setSocket(newSocket)

    // Auto-save every 5 seconds
    autoSaveInterval.current = setInterval(() => {
      if (canvasRef.current && isDrawing) {
        saveDrawing()
      }
    }, 5000)

    return () => {
      if (timer) clearInterval(timer)
      if (autoSaveInterval.current) clearInterval(autoSaveInterval.current)
      newSocket.close()
    }
  }, [code, user?.id])

  const handleDraw = (x, y, drawing) => {
    if (!socket || !drawing) return
    setIsDrawing(true)

    if (tool === 'pen') {
      socket.emit('draw-start', { x, y, color: drawingColor, brushSize })
    }
  }

  const handleDrawMove = (x, y) => {
    if (!socket || tool !== 'pen') return
    socket.emit('draw-move', { x, y })
  }

  const handleDrawEnd = () => {
    if (!socket) return
    setIsDrawing(false)
    socket.emit('draw-end')
    saveDrawing()
  }

  const saveDrawing = () => {
    if (!canvasRef.current || !socket) return
    const imageData = canvasRef.current.toDataURL('image/png', 0.9)
    socket.emit('save-drawing', { imageData })
  }

  const startTimer = () => {
    if (socket && roomState?.settings?.timerEnabled && roomState?.hostId === user.id) {
      socket.emit('start-timer')
    }
  }

  const copyDrawing = (userId) => {
    if (socket && userId !== user.id) {
      socket.emit('copy-drawing', { sourceUserId: userId })
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (roomState?.status === 'completed') {
    navigate(`/results/${code}`)
    return null
  }

  return (
    <div className="drawing-room">
      <div className="drawing-header">
        <button className="btn-outline" onClick={() => navigate(`/room/${code}`)}>
          ← العودة للغرفة
        </button>
        <h2>غرفة الرسم - {code}</h2>
        {timeLeft > 0 && (
          <div className="timer">
            ⏱️ {formatTime(timeLeft)}
          </div>
        )}
        {roomState?.hostId === user.id && !timeLeft && roomState?.settings?.timerEnabled && roomState?.status === 'waiting' && (
          <button className="btn-primary" onClick={startTimer}>
            بدء المؤقت
          </button>
        )}
      </div>

      <div className="drawing-container">
        <div className="drawing-main">
          <div className="canvas-wrapper">
            <DrawingCanvas
              ref={canvasRef}
              color={drawingColor}
              brushSize={brushSize}
              tool={tool}
              onDraw={handleDraw}
              onDrawMove={handleDrawMove}
              onDrawEnd={handleDrawEnd}
            />
            <div className="canvas-info">
              <span>💾 الحفظ التلقائي مفعّل</span>
            </div>
          </div>
          <DrawingTools
            color={drawingColor}
            onColorChange={setDrawingColor}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            tool={tool}
            onToolChange={setTool}
            onClear={() => {
              if (canvasRef.current && window.confirm('هل أنت متأكد من مسح اللوحة؟')) {
                const ctx = canvasRef.current.getContext('2d')
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
                saveDrawing()
              }
            }}
          />
        </div>

        {showDrawings && Object.keys(drawings).length > 0 && (
          <div className="drawings-gallery">
            <h3>رسومات المشاركين</h3>
            <div className="drawings-grid">
              {Object.entries(drawings).map(([userId, drawing]) => (
                <div key={userId} className="drawing-item">
                  <div className="drawing-header-item">
                    <span>{drawing.userName || 'مجهول'}</span>
                    {userId === user.id && <span className="your-drawing">رسمتك</span>}
                  </div>
                  <img src={drawing.imageData} alt="رسم" />
                  {userId !== user.id && (
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => copyDrawing(userId)}
                    >
                      📋 نسخ الرسمة
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
