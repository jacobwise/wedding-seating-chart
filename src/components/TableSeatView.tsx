import { memo } from 'react'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { X } from 'lucide-react'
import type { Guest, Table } from '../types'

interface DraggableGuestInSeatProps {
  guest: Guest
  onGuestRemove: (guestId: string) => void
}

const DraggableGuestInSeat = memo(({ guest, onGuestRemove }: DraggableGuestInSeatProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `seated-guest-${guest.id}`,
    data: { type: 'guest', guest },
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between w-full ${isDragging ? 'opacity-50' : ''}`}
    >
      <span 
        className="text-sm font-medium text-gray-800 cursor-grab hover:cursor-grabbing flex-1"
        {...listeners}
        {...attributes}
      >
        {guest.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onGuestRemove(guest.id)
        }}
        className="text-gray-400 hover:text-red-500 focus:outline-none ml-2"
        title="Remove guest from seat"
      >
        <X size={14} />
      </button>
    </div>
  )
})

interface SeatDropZoneProps {
  tableId: string
  seatNumber: number
  guest?: Guest
  onGuestRemove: (guestId: string) => void
}

const SeatDropZone = memo(({ tableId, seatNumber, guest, onGuestRemove }: SeatDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `sidebar-seat-${tableId}-${seatNumber}`,
    data: { type: 'seat', tableId, seatNumber },
  })

  return (
    <div
      ref={setNodeRef}
      className={`p-3 border-2 border-dashed rounded-lg min-h-[50px] flex items-center justify-between transition-colors ${
        isOver
          ? 'border-blue-500 bg-blue-50'
          : guest
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-semibold text-gray-600 min-w-[60px]">
          Seat {seatNumber + 1}:
        </span>
        {guest ? (
          <DraggableGuestInSeat guest={guest} onGuestRemove={onGuestRemove} />
        ) : (
          <span className="text-sm text-gray-400 italic">Empty</span>
        )}
      </div>
    </div>
  )
})

interface TableSeatViewProps {
  table: Table
  guests: Guest[]
  onGuestRemove: (guestId: string) => void
  onClearTable: (tableId: string) => void
  onRemoveTable: (tableId: string) => void
}

function TableSeatView({ table, guests, onGuestRemove, onClearTable, onRemoveTable }: TableSeatViewProps) {
  const tableGuests = guests.filter(guest => guest.tableId === table.id)
  
  // Create array of seats with their assigned guests
  const seats = Array.from({ length: table.capacity }, (_, index) => {
    const guest = tableGuests.find(g => g.seatPosition === index)
    return { seatNumber: index, guest }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{table.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {table.guestIds.length}/{table.capacity}
          </span>
          <button
            onClick={() => onClearTable(table.id)}
            className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
            title="Clear all guests from table"
          >
            Clear
          </button>
          <button
            onClick={() => onRemoveTable(table.id)}
            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
            title="Delete table"
          >
            Delete
          </button>
        </div>
      </div>
      
      {/* <div className="text-sm text-gray-600 mb-3">
        Drag guests from the list below to assign them to specific seats:
      </div> */}

      {/* Visual table representation */}
      <div className="mb-4 flex justify-center">
        <div className="relative">
          {/* Table circle */}
          <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {table.name}
          </div>
          
          {/* Seat indicators around the table */}
          {seats.map(({ seatNumber, guest }) => {
            const angle = (seatNumber / table.capacity) * 2 * Math.PI - (Math.PI / 2)
            const radius = 45
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            
            return (
              <div
                key={seatNumber}
                className={`absolute w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                  guest 
                    ? 'bg-green-100 border-green-500 text-green-700' 
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
                style={{
                  left: `calc(50% + ${x}px - 12px)`,
                  top: `calc(50% + ${y}px - 12px)`,
                }}
                title={guest ? `Seat ${seatNumber + 1}: ${guest.name}` : `Seat ${seatNumber + 1}: Empty`}
              >
                {seatNumber + 1}
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto">
        {seats.map(({ seatNumber, guest }) => (
          <SeatDropZone
            key={seatNumber}
            tableId={table.id}
            seatNumber={seatNumber}
            guest={guest}
            onGuestRemove={onGuestRemove}
          />
        ))}
      </div>
    </div>
  )
}

export default memo(TableSeatView)