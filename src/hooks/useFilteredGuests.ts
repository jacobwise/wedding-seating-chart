import { useMemo } from 'react'
import type { Guest } from '../types'

export function useFilteredGuests(guests: Guest[], searchQuery: string) {
  return useMemo(() => {
    const unassignedGuests = guests.filter(guest => !guest.tableId)
    
    if (!searchQuery) {
      return unassignedGuests
    }
    
    return unassignedGuests.filter(guest => 
      guest.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [guests, searchQuery])
}