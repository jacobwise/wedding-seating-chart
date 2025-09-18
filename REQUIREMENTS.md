# Wedding Reception Seating Chart App - Requirements

## Overview
A web application for planning wedding reception seating arrangements with drag-and-drop functionality and local storage persistence.

## Core Features

### 1. Layout & UI Structure
- **Header**: Site name/title prominently displayed
- **Left Sidebar**: List of unassigned guests
- **Main Canvas**: Blank workspace for table placement and arrangement
- **Responsive Design**: Works on desktop and tablet devices

### 2. Guest Management
- Display list of unassigned guests in left sidebar
- Add new guests to the system
- Remove guests if needed
- Search/filter guests by name
- Visual indication of assignment status

### 3. Table Management
- Create new tables with default settings
- Default table capacity (e.g., 8 seats)
- Customizable table names/numbers
- Visual representation of tables on canvas
- Delete tables when no longer needed

### 4. Drag & Drop Functionality
- **Guests to Tables**: Drag guests from sidebar to assign them to tables
- **Table Movement**: Drag tables around the canvas to rearrange layout
- **Guest Reassignment**: Move guests between tables
- **Visual Feedback**: Clear indication during drag operations

### 5. Table Assignment
- Assign guests to specific tables
- View current occupancy vs. capacity
- Visual indication when table is full
- Easily remove guests from tables
- Display guest list for each table

### 6. Data Persistence
- Save all data to browser's local storage
- Auto-save changes as they're made
- Restore state when app is reopened
- Export/import functionality for backup

## Technical Requirements

### Frontend Framework
- React 19+ with TypeScript
- Tailwind CSS for styling
- Vite for build tooling

### Key Dependencies
- `@dnd-kit/core` - Drag and drop functionality
- `@dnd-kit/sortable` - Sortable drag and drop
- `lucide-react` - Icons
- `uuid` - Unique ID generation

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Local storage support required

## User Experience Requirements

### Intuitive Interface
- Clear visual hierarchy
- Obvious drag targets
- Immediate visual feedback
- Undo/redo capability

### Performance
- Smooth drag operations
- Responsive interactions
- Fast load times
- Efficient re-rendering

### Accessibility
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus indicators

## Data Structure

### Guest Object
```typescript
interface Guest {
  id: string;
  name: string;
  tableId?: string;
  dietaryRestrictions?: string;
  notes?: string;
}
```

### Table Object
```typescript
interface Table {
  id: string;
  name: string;
  capacity: number;
  x: number;
  y: number;
  shape: 'round' | 'rectangular';
  guestIds: string[];
}
```

### App State
```typescript
interface AppState {
  guests: Guest[];
  tables: Table[];
  selectedTable?: string;
  selectedGuest?: string;
}
```

## Future Enhancements (Phase 2)
- Multiple seating arrangements/scenarios
- Table shape variations (round, rectangular, etc.)
- Conflict detection (dietary restrictions, relationships)
- Print-friendly floor plan view
- Real-time collaboration
- Cloud storage integration
- Guest import from CSV/spreadsheet
- Seating optimization suggestions