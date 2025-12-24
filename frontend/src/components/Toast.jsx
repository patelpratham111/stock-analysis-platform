import { useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import './Toast.css'

function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">
        {type === 'success' ? (
          <CheckCircle size={24} />
        ) : (
          <AlertCircle size={24} />
        )}
      </div>
      <div className="toast-message">{message}</div>
      <button onClick={onClose} className="toast-close">
        <X size={18} />
      </button>
    </div>
  )
}

export default Toast
