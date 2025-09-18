import { useState, memo } from 'react'
import GuestCard from './GuestCard'
import {
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import type { Guest, Table } from '../types'
import { X } from 'lucide-react';


const DroppableSeat = memo(({ tableId, seatNumber, tableRadius, angle, currentGuest }: { tableId: string; seatNumber: number; tableRadius: number; angle: number; currentGuest?: Guest }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `seat-${tableId}-${seatNumber}`,
    data: { type: 'seat', tableId, seatNumber },
  })

  // Position the seat around the table (same as guest names)
  const seatRadius = tableRadius + 85
  const seatX = Math.cos(angle) * seatRadius
  const seatY = Math.sin(angle) * seatRadius

  return (
    <div
      ref={setNodeRef}
      className={`absolute w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center text-xs font-bold ${
        isOver 
          ? 'border-blue-500 bg-blue-100' 
          : currentGuest 
            ? 'border-green-500 bg-green-100' 
            : 'border-gray-300 bg-gray-50'
      }`}
      style={{
        left: tableRadius + seatX - 16, // Center the 32px seat area
        top: tableRadius + seatY - 16,
        zIndex: 5,
      }}
      title={currentGuest ? `Seat ${seatNumber + 1}: ${currentGuest.name}` : `Seat ${seatNumber + 1}: Empty`}
    >
      {seatNumber + 1}
    </div>
  )
})

function DroppableTable({ table, onRemove, guests, selectedTableId, onTableSelect, onGuestRemove, onTableRename, onClearTable }: { table: Table; onRemove: (id: string) => void; guests: Guest[]; selectedTableId: string | null; onTableSelect: (tableId: string | null) => void; onGuestRemove: (guestId: string) => void; onTableRename: (tableId: string, newName: string) => void; onClearTable: (tableId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: table.id,
    data: { type: 'table', table },
  })

  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, isDragging } = useDraggable({
    id: `table-${table.id}`,
    data: { type: 'table', table },
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  const combineRefs = (node: HTMLDivElement | null) => {
    setNodeRef(node)
    setDragNodeRef(node)
  }

  const tableGuests = guests.filter(guest => guest.tableId === table.id)
  const tableRadius = 50
  const isSelected = selectedTableId === table.id
  const [isEditing, setIsEditing] = useState(false)
  const [editingName, setEditingName] = useState(table.name)

  const handleTableClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Always select table when clicked (unless dragging)
    if (!isDragging) {
      console.log('Table clicked:', table.name, 'selecting table')
      onTableSelect(table.id)
    }
  }

  const handleTableDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setEditingName(table.name)
  }

  const handleNameSubmit = () => {
    if (editingName.trim() && editingName.trim() !== table.name) {
      onTableRename(table.id, editingName.trim())
    }
    setIsEditing(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditingName(table.name)
    }
  }
  const MemoizedGuestCard = memo(GuestCard);

  return (
    <div
      className="absolute"
      style={{
        left: table.x - tableRadius,
        top: table.y - tableRadius,
        width: tableRadius * 2,
        height: tableRadius * 2,
        ...style,
      }}
    >
      {/* Seat drop zones around the table */}
      {Array.from({ length: table.capacity }, (_, seatIndex) => {
        const angle = (seatIndex / table.capacity) * 2 * Math.PI - (Math.PI / 2)
        const guestInSeat = tableGuests.find(g => g.seatPosition === seatIndex)
        
        return (
          <DroppableSeat
            key={`seat-${seatIndex}`}
            tableId={table.id}
            seatNumber={seatIndex}
            tableRadius={tableRadius}
            angle={angle}
            currentGuest={guestInSeat}
          />
        )
      })}

      {/* Guest names positioned around the table */}
      {tableGuests.map((guest, index) => (
        <MemoizedGuestCard
          key={guest.id}
          guest={guest}
          tableRadius={tableRadius}
          index={index}
          tableCapacity={table.capacity}
          totalGuests={tableGuests?.length}
          onRemove={onGuestRemove}
        />
      ))}
      
      {/* The actual table */}
      <div
        ref={combineRefs}
        className={`absolute bg-blue-500 text-white rounded-full flex items-center justify-center cursor-move ${
          isOver ? 'bg-blue-600 ring-4 ring-blue-300' : ''
        } ${isDragging ? 'opacity-50' : ''} ${
          isSelected ? 'ring-4 ring-yellow-400 bg-blue-600' : ''
        }`}
        style={{
          left: tableRadius - 40,
          top: tableRadius - 40,
          width: 80,
          height: 80,
        }}
        onClick={handleTableClick}
        onDoubleClick={handleTableDoubleClick}
      >
        <div 
          className={`text-center w-full h-full flex flex-col items-center justify-center relative ${
            isSelected ? 'cursor-move' : ''
          }`}
          {...(isSelected ? { ...listeners, ...attributes } : {})}
        >
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={handleNameKeyDown}
              className="text-xs font-semibold bg-white text-gray-800 border rounded px-1 py-0.5 w-16 text-center"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="text-xs font-semibold">
              {table.name}
            </div>
          )}
          <div className="text-xs">{table.guestIds.length}/{table.capacity}</div>
          
          {/* Show drag hint for selected table */}
          {/* {isSelected && (
            <div className="absolute bottom-1 text-xs text-white/70">
              drag to move
            </div>
          )} */}
        </div>
        
        {/* <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(table.id)
          }}
          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 pointer-events-auto"
          title="Delete table"
        >
          <X size={12} />
        </button> */}
        
        {/* <button
          onClick={(e) => {
            e.stopPropagation()
            onClearTable(table.id)
          }}
          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white rounded px-1 py-0.5 text-xs font-medium hover:bg-orange-600 pointer-events-auto"
          title="Clear all guests from table"
        >
          clear
        </button> */}
      </div>
    </div>
  )
}

export default DroppableTable