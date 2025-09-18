import { memo } from 'react'
import { X } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import type { Guest } from '../types'

interface DraggableGuestProps {
  guest: Guest
  onRemove: (id: string) => void
  onAssignToTable?: (guestId: string) => void
}

function DraggableGuest({ guest, onRemove, onAssignToTable }: DraggableGuestProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
    data: { type: 'guest', guest },
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 bg-blue-500/40 rounded-lg border border-blue-300 flex items-center justify-between cursor-pointer hover:bg-blue-600/40 ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={() => onAssignToTable?.(guest.id)}
    >
      <span className="text-sm font-medium text-gray-800">{guest.name}</span>
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab hover:cursor-grabbing p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-400">
            <circle cx="3" cy="3" r="1" fill="currentColor"/>
            <circle cx="9" cy="3" r="1" fill="currentColor"/>
            <circle cx="3" cy="9" r="1" fill="currentColor"/>
            <circle cx="9" cy="9" r="1" fill="currentColor"/>
          </svg>
        </div>
        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(guest.id)
          }}
          className="text-gray-400 hover:text-red-500 focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default memo(DraggableGuest)