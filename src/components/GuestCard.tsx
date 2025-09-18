import { memo } from 'react'
import { X } from 'lucide-react'
import type { Guest } from '../types'

interface GuestCardProps {
  guest: Guest
  tableRadius: number
  index: number
  tableCapacity: number
  totalGuests: number
  onRemove: (guestId: string) => void
}

function GuestCard({ guest, tableRadius, index, tableCapacity, totalGuests, onRemove }: GuestCardProps) {
  // Simple clockwise seating starting from 12 o'clock
  // Use seatPosition (0-based) for stable seat assignments
  const seatNumber = guest.seatPosition !== undefined ? guest.seatPosition : index
  
  // Start at 12 o'clock (top) and go clockwise
  // Distribute seats evenly around the actual number of guests, not full capacity
  Math.max(1, totalGuests) // Use actual guest count for even distribution
  const angle = (seatNumber / tableCapacity) * 2 * Math.PI - (Math.PI / 2)
//   const angleDegrees = (angle * 180 / Math.PI + 360) % 360 // Convert to degrees for easier debugging
  
  // Debug logging for positioning (only log once per guest)
//   if (guest.seatPosition !== undefined && !isDragging) {
//     console.log('Positioning guest:', guest.name, 'at seat:', seatNumber, 'of', totalSeats, 'total seats', 'angle:', angleDegrees.toFixed(1) + '°')
//   }
  
  // Position guest labels at the same radius as seats (centered on seats)
  const guestRadius = tableRadius + 85  // Same as seat radius
  
  const defaultX = Math.cos(angle) * guestRadius
  const defaultY = Math.sin(angle) * guestRadius

  // Use calculated position
  const guestX = tableRadius + defaultX
  const guestY = tableRadius + defaultY

  return (
    <div
      className="absolute text-xs text-gray-700 bg-white border border-gray-300 rounded px-2 py-1 shadow-sm group hover:pr-6"
      style={{
        left: guestX - 60, // Offset by half the maxWidth to center horizontally
        top: guestY - 24,  // Offset to center above the seat circle
        maxWidth: '120px',
        fontSize: '10px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        zIndex: 10,
      }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex-grow truncate">
          <span className="font-semibold text-blue-600 mr-1">
            {seatNumber + 1}.
          </span>
          {guest.name}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            onRemove(guest.id)
          }}
          className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 cursor-pointer"
          style={{ fontSize: '8px' }}
        >
          <X size={10} />
        </button>
      </div>
    </div>
  )
}

export default memo(GuestCard)