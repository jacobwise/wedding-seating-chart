import { useState, useEffect, useCallback, memo, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import type { Guest, Table } from './types'
import DroppableTable from './components/DroppableTable'
import DraggableGuest from './components/DraggableGuest'
import TableSeatView from './components/TableSeatView'
import { useFilteredGuests } from './hooks/useFilteredGuests'
import './App.css'


function App() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [newGuestName, setNewGuestName] = useState('')
  const [showAddGuestModal, setShowAddGuestModal] = useState(false)
  const [showDeleteTableConfirm, setShowDeleteTableConfirm] = useState(false)
  const [tableToDelete, setTableToDelete] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [defaultTableCapacity, setDefaultTableCapacity] = useState(12)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null)
  
  // History management for undo/redo
  const [history, setHistory] = useState<Array<{ guests: Guest[]; tables: Table[] }>>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  )

  // Track if data has been loaded from localStorage
  const [isLoaded, setIsLoaded] = useState(false)

  // Save current state to history (for undo/redo)
  const saveToHistory = useCallback(() => {
    const currentState = { guests: [...guests], tables: [...tables] }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(currentState)
    
    // Limit history to 50 entries
    if (newHistory.length > 50) {
      newHistory.shift()
    } else {
      setHistoryIndex(historyIndex + 1)
    }
    
    setHistory(newHistory)
  }, [guests, tables])

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1]
      setGuests(prevState.guests)
      setTables(prevState.tables)
      setHistoryIndex(historyIndex - 1)
    }
  }, [historyIndex, history])

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      setGuests(nextState.guests)
      setTables(nextState.tables)
      setHistoryIndex(historyIndex + 1)
    }
  }, [historyIndex, history])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      }
      
      // Undo/Redo shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setIsSpacePressed(false)
        setIsPanning(false)
        setDragStartPoint(null)
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId)
          setAnimationFrameId(null)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [undo, redo, animationFrameId])

  // Load data from localStorage on mount
  useEffect(() => {
    const savedGuests = localStorage.getItem('wedding-seating-guests')
    const savedTables = localStorage.getItem('wedding-seating-tables')
    
    if (savedGuests) {
      try {
        setGuests(JSON.parse(savedGuests))
      } catch (e) {
        console.error('Failed to parse saved guests:', e)
      }
    }
    
    if (savedTables) {
      try {
        setTables(JSON.parse(savedTables))
      } catch (e) {
        console.error('Failed to parse saved tables:', e)
      }
    }
    
    setIsLoaded(true)
  }, [])

  // Initialize history when data is loaded
  useEffect(() => {
    if (isLoaded && history.length === 0) {
      const initialState = { guests: [...guests], tables: [...tables] }
      setHistory([initialState])
      setHistoryIndex(0)
    }
  }, [isLoaded, guests, tables, history.length])


  // Save guests to localStorage whenever guests change (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('wedding-seating-guests', JSON.stringify(guests))
    }
  }, [guests, isLoaded])

  // Save tables to localStorage whenever tables change (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('wedding-seating-tables', JSON.stringify(tables))
    }
  }, [tables, isLoaded])

  const addGuest = useCallback(() => {
    console.log('addGuest function called, newGuestName:', newGuestName)
    if (newGuestName.trim()) {
      saveToHistory()
      console.log('Adding guest, selectedTableId:', selectedTableId)
      
      // If adding to a selected table, assign seat position
      let seatPosition: number | undefined = undefined
      if (selectedTableId) {
        const selectedTable = tables.find(t => t.id === selectedTableId)
        console.log('Found selected table:', selectedTable?.name)
        if (selectedTable && selectedTable.guestIds.length < selectedTable.capacity) {
          seatPosition = selectedTable.guestIds.length
        }
      }

      const newGuest: Guest = {
        id: uuidv4(),
        name: newGuestName.trim(),
        tableId: selectedTableId || undefined,
        seatPosition: seatPosition,
      }
      const tableName = selectedTableId ? tables.find(t => t.id === selectedTableId)?.name : 'unassigned'
      console.log('Created new guest:', newGuest.name, 'assigned to seat:', seatPosition, 'at table:', tableName)
      setGuests([...guests, newGuest])
      
      // If adding to a selected table, update the table's guest list
      if (selectedTableId) {
        const selectedTable = tables.find(t => t.id === selectedTableId)
        console.log('Updating table guest list for table:', selectedTable?.name, 'current guests:', selectedTable?.guestIds.length, 'capacity:', selectedTable?.capacity)
        if (selectedTable && selectedTable.guestIds.length < selectedTable.capacity) {
          console.log('Adding guest to table guestIds list')
          setTables(tables.map(table =>
            table.id === selectedTableId
              ? { ...table, guestIds: [...table.guestIds, newGuest.id] }
              : table
          ))
        } else {
          console.log('Table is full or not found, guest will be unassigned')
        }
      } else {
        console.log('No table selected, guest will be unassigned')
      }
      
      setNewGuestName('')
      setShowAddGuestModal(false)
    }
  }, [newGuestName, saveToHistory, selectedTableId, tables, guests])

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) return
      
      // Parse header to detect Zola format
      const headerLine = lines[0]
      const isZolaFormat = headerLine.includes('First Name') && headerLine.includes('Last Name')
      
      let newGuests: Guest[] = []
      
      if (isZolaFormat) {
        // Parse Zola CSV format
        const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''))
        const firstNameIndex = headers.indexOf('First Name')
        const lastNameIndex = headers.indexOf('Last Name')
        const partnerFirstNameIndex = headers.indexOf('Partner First Name')
        const partnerLastNameIndex = headers.indexOf('Partner Last Name')
        const child1FirstIndex = headers.indexOf('Child 1 First Name')
        const child1LastIndex = headers.indexOf('Child 1 Last Name')
        const child2FirstIndex = headers.indexOf('Child 2 First Name')
        const child2LastIndex = headers.indexOf('Child 2 Last Name')
        const child3FirstIndex = headers.indexOf('Child 3 First Name')
        const child3LastIndex = headers.indexOf('Child 3 Last Name')
        const child4FirstIndex = headers.indexOf('Child 4 First Name')
        const child4LastIndex = headers.indexOf('Child 4 Last Name')
        const child5FirstIndex = headers.indexOf('Child 5 First Name')
        const child5LastIndex = headers.indexOf('Child 5 Last Name')
        
        // Process data rows (skip header)
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''))
          
          // Primary guest
          const firstName = row[firstNameIndex] || ''
          const lastName = row[lastNameIndex] || ''
          if (firstName || lastName) {
            const primaryName = `${firstName} ${lastName}`.trim()
            if (primaryName) {
              newGuests.push({
                id: uuidv4(),
                name: primaryName,
              })
            }
          }
          
          // Partner
          const partnerFirst = row[partnerFirstNameIndex] || ''
          const partnerLast = row[partnerLastNameIndex] || ''
          if (partnerFirst || partnerLast) {
            const partnerName = `${partnerFirst} ${partnerLast}`.trim()
            if (partnerName) {
              newGuests.push({
                id: uuidv4(),
                name: partnerName,
              })
            }
          }
          
          // Children
          const children = [
            { first: row[child1FirstIndex], last: row[child1LastIndex] },
            { first: row[child2FirstIndex], last: row[child2LastIndex] },
            { first: row[child3FirstIndex], last: row[child3LastIndex] },
            { first: row[child4FirstIndex], last: row[child4LastIndex] },
            { first: row[child5FirstIndex], last: row[child5LastIndex] },
          ]
          
          for (const child of children) {
            const childFirst = child.first || ''
            const childLast = child.last || ''
            if (childFirst || childLast) {
              const childName = `${childFirst} ${childLast}`.trim()
              if (childName) {
                newGuests.push({
                  id: uuidv4(),
                  name: childName,
                })
              }
            }
          }
        }
      } else {
        // Fallback to simple CSV format (first column as name)
        newGuests = lines.map(line => {
          const name = line.split(',')[0].trim().replace(/"/g, '')
          return {
            id: uuidv4(),
            name: name,
          }
        }).filter(guest => guest.name)
      }

      if (newGuests.length > 0) {
        saveToHistory()
      }
      setGuests([...guests, ...newGuests])
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const removeGuest = useCallback((guestId: string) => {
    saveToHistory()
    setGuests(guests.filter(g => g.id !== guestId))
  }, [saveToHistory, guests])

  const removeGuestFromTable = useCallback((guestId: string) => {
    // Find the guest and their current table
    const guest = guests.find(g => g.id === guestId)
    if (!guest || !guest.tableId) return

    saveToHistory()
    const tableId = guest.tableId

    // Remove guest from table and reset their position (no seat shifting)
    setGuests(guests.map(g => 
      g.id === guestId 
        ? { ...g, tableId: undefined, seatPosition: undefined }
        : g
    ))

    // Remove guest from table's guest list
    setTables(tables.map(table =>
      table.id === tableId
        ? { ...table, guestIds: table.guestIds.filter(id => id !== guestId) }
        : table
    ))
  }, [guests, tables, saveToHistory]); 

  const assignGuestToSelectedTable = useCallback((guestId: string) => {
    if (!selectedTableId) {
      console.log('No table selected')
      return
    }

    saveToHistory()

    const selectedTable = tables.find(t => t.id === selectedTableId)
    if (!selectedTable) {
      console.log('Selected table not found')
      return
    }

    if (selectedTable.guestIds.length >= selectedTable.capacity) {
      console.log('Selected table is full')
      return
    }

    // Find the first available seat position
    const occupiedSeats = guests
      .filter(g => g.tableId === selectedTableId && g.seatPosition !== undefined)
      .map(g => g.seatPosition)
    
    let availableSeat = -1
    for (let i = 0; i < selectedTable.capacity; i++) {
      if (!occupiedSeats.includes(i)) {
        availableSeat = i
        break
      }
    }

    if (availableSeat === -1) {
      console.log('No available seats at selected table')
      return
    }

    const guestName = guests.find(g => g.id === guestId)?.name || 'Unknown'
    console.log('Click-assigning guest:', guestName, 'to seat:', availableSeat, 'at table:', selectedTable.name)

    // Update guest with table assignment
    setGuests(guests.map(guest =>
      guest.id === guestId
        ? { ...guest, tableId: selectedTableId, seatPosition: availableSeat }
        : guest
    ))

    // Add guest to table's guest list if not already there
    if (!selectedTable.guestIds.includes(guestId)) {
      setTables(tables.map(table =>
        table.id === selectedTableId
          ? { ...table, guestIds: [...table.guestIds, guestId] }
          : table
      ))
    }
  }, [selectedTableId, saveToHistory, tables, guests])

  const assignGuestToSpecificSeat = useCallback((guestId: string, tableId: string, seatNumber: number) => {
    const guest = guests.find(g => g.id === guestId)
    const table = tables.find(t => t.id === tableId)
    
    if (!guest || !table) return

    saveToHistory()

    // Check if seat is already occupied by a different guest
    const occupyingGuest = guests.find(g => g.tableId === tableId && g.seatPosition === seatNumber && g.id !== guestId)
    
    if (occupyingGuest) {
      // Implement seat swapping
      console.log('Seat', seatNumber + 1, 'is occupied by:', occupyingGuest.name, '- swapping guests')
      
      // Get the current guest's seat position (if any)
      const originalSeatPosition = guest.seatPosition
      const originalTableId = guest.tableId
      
      // Remove guest from previous table if moving to a different table
      if (guest.tableId && guest.tableId !== tableId) {
        setTables(tables.map(t =>
          t.id === guest.tableId
            ? { ...t, guestIds: t.guestIds.filter(id => id !== guestId) }
            : t
        ))
        
        // Add guest to new table's guest list
        setTables(tables.map(t =>
          t.id === tableId
            ? { ...t, guestIds: [...t.guestIds, guestId] }
            : t
        ))
      }
      
      // Swap the guests - update both guests' seat positions
      setGuests(guests.map(g => {
        if (g.id === guestId) {
          // Assign dragged guest to the target seat
          return { ...g, tableId: tableId, seatPosition: seatNumber }
        } else if (g.id === occupyingGuest.id) {
          // Move occupying guest to the dragged guest's original seat (or unassign if no original seat)
          if (originalSeatPosition !== undefined && originalTableId) {
            return { ...g, tableId: originalTableId, seatPosition: originalSeatPosition }
          } else {
            // If dragged guest had no seat, remove occupying guest from table
            setTables(tables.map(t =>
              t.id === tableId
                ? { ...t, guestIds: t.guestIds.filter(id => id !== occupyingGuest.id) }
                : t
            ))
            return { ...g, tableId: undefined, seatPosition: undefined }
          }
        }
        return g
      }))
      
      return
    }

    console.log('Assigning guest:', guest.name, 'to seat:', seatNumber + 1, 'at table:', table.name)

    // Remove guest from previous table if assigned
    if (guest.tableId && guest.tableId !== tableId) {
      setTables(tables.map(t =>
        t.id === guest.tableId
          ? { ...t, guestIds: t.guestIds.filter(id => id !== guestId) }
          : t
      ))
    }

    // Update guest with new table and seat assignment
    setGuests(guests.map(g =>
      g.id === guestId
        ? { ...g, tableId: tableId, seatPosition: seatNumber }
        : g
    ))

    // Add guest to new table's guest list if not already there
    if (!table.guestIds.includes(guestId)) {
      setTables(tables.map(t =>
        t.id === tableId
          ? { ...t, guestIds: [...t.guestIds, guestId] }
          : t
      ))
    }
  }, [guests, tables, saveToHistory])

  const addTable = () => {
    saveToHistory()
    const newTable: Table = {
      id: uuidv4(),
      name: `Table ${tables.length + 1}`,
      capacity: defaultTableCapacity,
      x: 200 + (tables.length * 50),
      y: 200 + (tables.length * 50),
      shape: 'round',
      guestIds: [],
    }
    setTables([...tables, newTable])
  }

  const removeTable = useCallback((tableId: string) => {
    saveToHistory()
    setGuests(guests.map(guest => 
      guest.tableId === tableId ? { ...guest, tableId: undefined, seatPosition: undefined } : guest
    ))
    setTables(tables.filter(t => t.id !== tableId))
    
    // If we're deleting the selected table, clear the selection
    if (selectedTableId === tableId) {
      setSelectedTableId(null)
    }
  }, [saveToHistory, guests, tables, selectedTableId])

  const handleDeleteTableClick = useCallback((tableId: string) => {
    setTableToDelete(tableId)
    setShowDeleteTableConfirm(true)
  }, [])

  const confirmDeleteTable = useCallback(() => {
    if (tableToDelete) {
      removeTable(tableToDelete)
      setTableToDelete(null)
      setShowDeleteTableConfirm(false)
    }
  }, [tableToDelete, removeTable])

  const cancelDeleteTable = useCallback(() => {
    setTableToDelete(null)
    setShowDeleteTableConfirm(false)
  }, [])

  const renameTable = useCallback((tableId: string, newName: string) => {
    setTables(tables.map(table =>
      table.id === tableId ? { ...table, name: newName } : table
    ))
  }, [tables])

  const clearTableGuests = useCallback((tableId: string) => {
    saveToHistory()
    // Remove all guests from this table and reset their positions
    setGuests(guests.map(guest => 
      guest.tableId === tableId 
        ? { ...guest, tableId: undefined, seatPosition: undefined }
        : guest
    ))

    // Clear the table's guest list
    setTables(tables.map(table =>
      table.id === tableId
        ? { ...table, guestIds: [] }
        : table
    ))
  }, [saveToHistory, guests, tables])


  const zoomToCenter = (deltaZoom: number) => {
    const newZoomLevel = Math.max(0.25, Math.min(2.0, zoomLevel + deltaZoom))
    
    if (newZoomLevel !== zoomLevel) {
      // Get the center of the viewport for button-triggered zoom
      const viewportCenterX = window.innerWidth / 2 - 320 // Account for sidebar width
      const viewportCenterY = window.innerHeight / 2
      
      // Calculate the point in the coordinate system before zoom
      const pointBeforeZoomX = (viewportCenterX - panOffset.x) / zoomLevel
      const pointBeforeZoomY = (viewportCenterY - panOffset.y) / zoomLevel
      
      // Calculate where that point will be after zoom
      const pointAfterZoomX = pointBeforeZoomX * newZoomLevel
      const pointAfterZoomY = pointBeforeZoomY * newZoomLevel
      
      // Adjust pan offset to keep the center point in the same position
      const newPanOffsetX = viewportCenterX - pointAfterZoomX
      const newPanOffsetY = viewportCenterY - pointAfterZoomY
      
      setZoomLevel(newZoomLevel)
      setPanOffset({ x: newPanOffsetX, y: newPanOffsetY })
    }
  }

  const handleZoomIn = () => {
    zoomToCenter(0.1)
  }

  const handleZoomOut = () => {
    zoomToCenter(-0.1)
  }

  const handleZoomReset = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handlePanReset = () => {
    setPanOffset({ x: 0, y: 0 })
  }

  const calculateTablesBoundingBox = useCallback(() => {
    if (tables.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
    }

    const tableRadius = 50 // Same as in DroppableTable
    const padding = 100 // Extra padding around tables

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    tables.forEach(table => {
      minX = Math.min(minX, table.x - tableRadius - padding)
      minY = Math.min(minY, table.y - tableRadius - padding)
      maxX = Math.max(maxX, table.x + tableRadius + padding)
      maxY = Math.max(maxY, table.y + tableRadius + padding)
    })

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    }
  }, [tables])

  const fitAllTables = useCallback(() => {
    if (tables.length === 0) return

    const boundingBox = calculateTablesBoundingBox()
    const sidebarWidth = selectedTableId ? 600 : 320
    const viewportWidth = window.innerWidth - sidebarWidth // Account for dynamic sidebar width
    const viewportHeight = window.innerHeight - 164 // Account for header height
    
    // Calculate zoom level to fit all tables with some padding
    const zoomX = viewportWidth / boundingBox.width
    const zoomY = viewportHeight / boundingBox.height
    const newZoomLevel = Math.max(0.25, Math.min(2.0, Math.min(zoomX, zoomY) * 0.9)) // 0.9 for extra padding
    
    // Calculate center point of tables
    const centerX = (boundingBox.minX + boundingBox.maxX) / 2
    const centerY = (boundingBox.minY + boundingBox.maxY) / 2
    
    // Calculate pan offset to center the tables in viewport
    const viewportCenterX = viewportWidth / 2
    const viewportCenterY = viewportHeight / 2
    
    const newPanOffsetX = viewportCenterX - (centerX * newZoomLevel)
    const newPanOffsetY = viewportCenterY - (centerY * newZoomLevel)
    
    setZoomLevel(newZoomLevel)
    setPanOffset({ x: newPanOffsetX, y: newPanOffsetY })
  }, [tables, calculateTablesBoundingBox, selectedTableId])

  const zoomToTable = useCallback((tableId: string) => {

    console.log({tableId})
    const table = tables.find(t => t.id === tableId)
    if (!table) return

    const sidebarWidth = selectedTableId ? 600 : 320
    const viewportWidth = window.innerWidth - sidebarWidth // Account for dynamic sidebar width
    const viewportHeight = window.innerHeight - 164 // Account for header height
    
    // Set zoom level for table focus (closer zoom)
    const targetZoomLevel = 1.5 // Zoom in to 150% for focused view
    const actualZoomLevel = Math.max(0.25, Math.min(2.0, targetZoomLevel))
    
    // Calculate center point of viewport
    const viewportCenterX = viewportWidth / 2
    const viewportCenterY = viewportHeight / 2
    
    // Calculate pan offset to center the table in viewport
    const newPanOffsetX = viewportCenterX - (table.x * actualZoomLevel)
    const newPanOffsetY = viewportCenterY - (table.y * actualZoomLevel)
    
    setZoomLevel(actualZoomLevel)
    setPanOffset({ x: newPanOffsetX, y: newPanOffsetY })
  }, [tables, selectedTableId])

  // Auto-fit view when tables are loaded
  useEffect(() => {
    if (isLoaded && tables.length > 0 && !selectedTableId) {
      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        fitAllTables()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [isLoaded, tables.length, fitAllTables, selectedTableId])

  // Zoom to table when one is selected
  useEffect(() => {
    console.log({selectedTableId})
    if (selectedTableId) {
      zoomToTable(selectedTableId)
    }
  }, [selectedTableId, zoomToTable])


  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      
      const rect = e.currentTarget.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1   
      const newZoomLevel = Math.max(0.25, Math.min(2.0, zoomLevel + delta))
      
      if (newZoomLevel !== zoomLevel) {
        // Calculate the point in the coordinate system before zoom
        const pointBeforeZoomX = (mouseX - panOffset.x) / zoomLevel
        const pointBeforeZoomY = (mouseY - panOffset.y) / zoomLevel
        
        // Calculate where that point will be after zoom
        const pointAfterZoomX = pointBeforeZoomX * newZoomLevel
        const pointAfterZoomY = pointBeforeZoomY * newZoomLevel
        
        // Adjust pan offset to keep the mouse point in the same position
        const newPanOffsetX = mouseX - pointAfterZoomX
        const newPanOffsetY = mouseY - pointAfterZoomY
        
        setZoomLevel(newZoomLevel)
        setPanOffset({ x: newPanOffsetX, y: newPanOffsetY })
      }
    }
  }, [zoomLevel, panOffset])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isSpacePressed && !isPanning) {
      e.preventDefault()
      setIsPanning(true)
      setDragStartPoint({ x: e.clientX, y: e.clientY })
    }
  }, [isSpacePressed, isPanning])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && isSpacePressed && dragStartPoint) {
      e.preventDefault()
      
      // Throttle updates using requestAnimationFrame
      if (!animationFrameId) {
        const deltaX = e.clientX - dragStartPoint.x
        const deltaY = e.clientY - dragStartPoint.y
        
        const frameId = requestAnimationFrame(() => {
          setPanOffset(prev => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY
          }))
          setDragStartPoint({ x: e.clientX, y: e.clientY })
          setAnimationFrameId(null)
        })
        
        setAnimationFrameId(frameId)
      }
    }
  }, [isPanning, isSpacePressed, dragStartPoint, animationFrameId])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault()
      setIsPanning(false)
      setDragStartPoint(null)
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
        setAnimationFrameId(null)
      }
    }
  }, [isPanning, animationFrameId])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event
    setActiveId(null)

    // Handle table dragging
    if (active.id.toString().startsWith('table-')) {
      const tableId = active.id.toString().replace('table-', '')
      const draggedTable = tables.find(t => t.id === tableId)
      
      if (draggedTable && delta) {
        saveToHistory()
        setTables(tables.map(table =>
          table.id === tableId
            ? { ...table, x: table.x + delta.x, y: table.y + delta.y }
            : table
        ))
      }
      return
    }

    if (!over) return

    // Handle both regular guest dragging and seated guest dragging
    let activeGuest = guests.find(g => g.id === active.id)
    
    // If dragging a seated guest, extract the guest ID from the seated-guest- prefix
    if (active.id.toString().startsWith('seated-guest-')) {
      const guestId = active.id.toString().replace('seated-guest-', '')
      activeGuest = guests.find(g => g.id === guestId)
    }
    
    // Handle dropping on a specific seat (both canvas and sidebar seats)
    if ((over.id.toString().startsWith('seat-') || over.id.toString().startsWith('sidebar-seat-')) && activeGuest) {
      const seatData = over.data.current as { type: string; tableId: string; seatNumber: number }
      if (seatData && seatData.type === 'seat') {
        // Note: assignGuestToSpecificSeat already calls saveToHistory
        assignGuestToSpecificSeat(activeGuest.id, seatData.tableId, seatData.seatNumber)
      }
      return
    }

    // Handle dropping on a table (general assignment)
    const overTable = tables.find(t => t.id === over.id)
    if (activeGuest && overTable) {
      if (overTable.guestIds.length < overTable.capacity) {
        saveToHistory()
        // Find the first available seat position
        const occupiedSeats = guests
          .filter(g => g.tableId === overTable.id && g.seatPosition !== undefined)
          .map(g => g.seatPosition)
        
        let availableSeat = -1
        for (let i = 0; i < overTable.capacity; i++) {
          if (!occupiedSeats.includes(i)) {
            availableSeat = i
            break
          }
        }

        if (availableSeat !== -1) {
          console.log('Dragging guest:', activeGuest.name, 'to seat:', availableSeat + 1, 'at table:', overTable.name)
          
          setGuests(guests.map(guest =>
            guest.id === activeGuest.id
              ? { ...guest, tableId: overTable.id, seatPosition: availableSeat }
              : guest
          ))
          setTables(tables.map(table =>
            table.id === overTable.id
              ? { ...table, guestIds: [...table.guestIds, activeGuest.id] }
              : table
          ))
        }
      }
    }
  }

  const unassignedGuests = useMemo(() => 
    guests.filter(guest => !guest.tableId), 
    [guests]
  )
  
  const filteredUnassignedGuests = useFilteredGuests(unassignedGuests, searchQuery)
  const activeGuest = activeId ? 
    activeId.toString().startsWith('seated-guest-') 
      ? guests.find(g => g.id === activeId.toString().replace('seated-guest-', ''))
      : guests.find(g => g.id === activeId)
    : null
  const MemoizedDroppableTable = memo(DroppableTable);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div>
        {/* Header */}
        <header className="bg-white px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Wedding Seating Chart</h1>
        </header>

        {/* Fixed sidebar */}
        <div className={`fixed inset-y-0 left-0 top-16 z-40 flex flex-col transition-all duration-300 ${selectedTableId ? 'w-[600px]' : 'w-80'}`}>
          <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Unassigned Guests</h2>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Upload CSV file">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <line x1="10" y1="9" x2="8" y2="9"/>
                  </svg>
                </label>
                <button
                  onClick={() => setShowAddGuestModal(true)}
                  className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Add Guest"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            {/* Search input */}
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guests..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>

            {/* Main content layout */}
            <div className={selectedTableId ? "grid grid-cols-2 gap-4" : ""}>
              {/* Unassigned Guests Section */}
              <div className="space-y-2 max-h-[75vh] overflow-y-auto border border-blue-200 rounded-lg bg-blue-50 p-2">
              {unassignedGuests.length === 0 ? (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm text-gray-600">No unassigned guests</span>
                </div>
              ) : filteredUnassignedGuests.length === 0 ? (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <span className="text-sm text-gray-600">No guests match "{searchQuery}"</span>
                </div>
              ) : (
                filteredUnassignedGuests.map(guest => (
                  <DraggableGuest key={guest.id} guest={guest} onRemove={removeGuest} onAssignToTable={assignGuestToSelectedTable} />
                ))
              )}
              </div>

              {/* Selected Table View */}
              {selectedTableId && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-blue-800">
                      {tables.find(t => t.id === selectedTableId)?.name}
                    </span>
                    <button
                      onClick={() => setSelectedTableId(null)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Close table view"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <TableSeatView
                    table={tables.find(t => t.id === selectedTableId)!}
                    guests={guests}
                    onGuestRemove={removeGuestFromTable}
                    onClearTable={clearTableGuests}
                    onRemoveTable={handleDeleteTableClick}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content with left padding for sidebar */}
        <main className={`bg-gray-100 pt-16 relative overflow-hidden transition-all duration-300 ${selectedTableId ? 'pl-[600px]' : 'pl-80'}`} onClick={() => setSelectedTableId(null)}>
          <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
            {/* Undo/Redo controls */}
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border px-3 py-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7v6h6"/>
                  <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
                </svg>
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Y)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 7v6h-6"/>
                  <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/>
                </svg>
              </button>
            </div>
            
            {/* Zoom controls */}
            <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border px-3 py-2">
              <button
                onClick={handleZoomOut}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Zoom Out (Cmd/Ctrl + Scroll Down)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M8 11h6"/>
                </svg>
              </button>
              <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                title="Zoom In (Cmd/Ctrl + Scroll Up)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M8 11h6"/>
                  <path d="M11 8v6"/>
                </svg>
              </button>
              <button
                onClick={handleZoomReset}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-xs"
                title="Reset Zoom"
              >
                1:1
              </button>
              <button
                onClick={handlePanReset}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-xs"
                title="Reset Pan Position"
              >
                ⌂
              </button>
              <button
                onClick={fitAllTables}
                className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded text-xs"
                title="Fit All Tables to View"
                disabled={tables.length === 0}
              >
                📦
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="table-capacity" className="text-sm font-medium text-gray-700">
                Table size:
              </label>
              <input
                id="table-capacity"
                type="number"
                value={defaultTableCapacity}
                onChange={(e) => setDefaultTableCapacity(parseInt(e.target.value) || 12)}
                min="1"
                max="20"
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            <button
              onClick={addTable}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center gap-2"
            >
              <Plus size={16} />
              Add Table
            </button>
          </div>

          <div 
            className="m-4 h-[calc(100vh-10rem)] bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300 overflow-hidden"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isPanning) {
                setIsPanning(false)
                setDragStartPoint(null)
                if (animationFrameId) {
                  cancelAnimationFrame(animationFrameId)
                  setAnimationFrameId(null)
                }
              }
            }}
            style={{
              cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : 'default'
            }}
          >
            {tables.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <span>Click "Add Table" to create your first table</span>
              </div>
            ) : (
              <div 
                className="relative w-full h-full origin-top-left transition-transform duration-150"
                style={{
                  transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  width: `${100 / zoomLevel}%`,
                  height: `${100 / zoomLevel}%`,
                }}
              >
                {tables.map(table => (
                  <MemoizedDroppableTable 
                    key={table.id} 
                    table={table} 
                    onRemove={removeTable} 
                    guests={guests}
                    selectedTableId={selectedTableId}
                    onTableSelect={setSelectedTableId}
                    onGuestRemove={removeGuestFromTable}
                    onTableRename={renameTable}
                    onClearTable={clearTableGuests}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      
      <DragOverlay>
          {activeGuest ? (
            <div className="p-3 bg-blue-500/40 rounded-lg border border-blue-300 flex items-center justify-between cursor-grabbing">
              <span className="text-sm font-medium text-gray-800">{activeGuest.name}</span>
            </div>
          ) : null}
        </DragOverlay>

        {/* Add Guest Modal */}
        {showAddGuestModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => {
              setShowAddGuestModal(false)
              setNewGuestName('')
            }}
          >
            <div 
              className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Add New Guest</h3>
                <button
                  onClick={() => {
                    setShowAddGuestModal(false)
                    setNewGuestName('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-4">
                <input
                  type="text"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="Enter guest name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') {
                      addGuest()
                    }
                  }}
                  autoFocus
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddGuestModal(false)
                    setNewGuestName('')
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addGuest}
                  disabled={!newGuestName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Guest
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Table Confirmation Dialog */}
        {showDeleteTableConfirm && tableToDelete && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={cancelDeleteTable}
          >
            <div 
              className="bg-white rounded-lg p-6 w-96 max-w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Delete Table</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete "{tables.find(t => t.id === tableToDelete)?.name}"? 
                  This will remove all guests from the table and move them back to the unassigned list.
                </p>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelDeleteTable}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTable}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Table
                </button>
              </div>
            </div>
          </div>
        )}
    </DndContext>
  )
}

export default App