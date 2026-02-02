import { forwardRef, useEffect, useRef } from 'react'
import './DrawingCanvas.css'

const DrawingCanvas = forwardRef(({ color, brushSize, tool, onDraw, onDrawMove, onDrawEnd }, ref) => {
  const canvasRef = useRef(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (ref) {
      ref.current = canvasRef.current
    }
  }, [ref])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    ctx.lineWidth = brushSize
  }, [color, brushSize])

  const getMousePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  const getTouchPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0] || e.changedTouches[0]
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e) => {
    isDrawingRef.current = true
    const pos = e.touches ? getTouchPos(e) : getMousePos(e)
    lastPosRef.current = pos

    const ctx = canvasRef.current.getContext('2d')
    
    if (tool === 'pen') {
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
      if (onDraw) onDraw(pos.x, pos.y, true)
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
  }

  const draw = (e) => {
    if (!isDrawingRef.current) return

    const pos = e.touches ? getTouchPos(e) : getMousePos(e)
    const ctx = canvasRef.current.getContext('2d')

    if (tool === 'pen') {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      if (onDrawMove) onDrawMove(pos.x, pos.y)
    } else if (tool === 'eraser') {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }

    lastPosRef.current = pos
  }

  const stopDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false
      const ctx = canvasRef.current.getContext('2d')
      ctx.globalCompositeOperation = 'source-over'
      if (onDrawEnd) onDrawEnd()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    const resizeCanvas = () => {
      const container = canvas.parentElement
      const maxWidth = container.clientWidth - 40
      const maxHeight = Math.min(window.innerHeight - 400, 800)
      canvas.width = maxWidth
      canvas.height = Math.min(maxWidth * 0.75, maxHeight)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseleave', stopDrawing)

    // Touch events
    const handleTouchStart = (e) => {
      e.preventDefault()
      startDrawing(e)
    }

    const handleTouchMove = (e) => {
      e.preventDefault()
      draw(e)
    }

    const handleTouchEnd = (e) => {
      e.preventDefault()
      stopDrawing()
    }

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('mouseleave', stopDrawing)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('touchend', handleTouchEnd)
    }
  }, [tool])

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        style={{
          cursor: tool === 'eraser' ? 'grab' : 'crosshair',
        }}
      />
    </div>
  )
})

DrawingCanvas.displayName = 'DrawingCanvas'

export default DrawingCanvas
