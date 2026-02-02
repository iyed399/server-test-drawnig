import './DrawingTools.css'

const colors = [
  '#000000', '#ffffff', '#ef4444', '#f59e0b',
  '#eab308', '#10b981', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'
]

export default function DrawingTools({
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  tool,
  onToolChange,
  onClear
}) {
  return (
    <div className="drawing-tools">
      <div className="tool-section">
        <h4>🛠️ الأدوات</h4>
        <div className="tools">
          <button
            className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
            onClick={() => onToolChange('pen')}
            title="قلم"
          >
            ✏️ قلم
          </button>
          <button
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => onToolChange('eraser')}
            title="ممحاة"
          >
            🧹 ممحاة
          </button>
        </div>
      </div>

      <div className="tool-section">
        <h4>🎨 الألوان</h4>
        <div className="colors">
          {colors.map((c) => (
            <button
              key={c}
              className={`color-btn ${color === c ? 'active' : ''}`}
              style={{ 
                background: c, 
                border: c === '#ffffff' ? '2px solid #ccc' : 'none' 
              }}
              onClick={() => onColorChange(c)}
              title={c}
            />
          ))}
        </div>
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="color-picker"
          title="اختر لون مخصص"
        />
      </div>

      <div className="tool-section">
        <h4>📏 حجم الفرشاة: {brushSize}px</h4>
        <input
          type="range"
          min="1"
          max="50"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
          className="brush-slider"
        />
        <div className="brush-size-preview">
          <div 
            className="brush-preview-circle"
            style={{ 
              width: `${Math.min(brushSize * 2, 50)}px`,
              height: `${Math.min(brushSize * 2, 50)}px`
            }}
          ></div>
        </div>
      </div>

      <div className="tool-section">
        <button className="btn-danger btn-full" onClick={onClear}>
          🗑️ مسح اللوحة
        </button>
      </div>
    </div>
  )
}
