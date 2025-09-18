# Recommended Dependencies for Wedding Seating Chart App

Since this is a React/TypeScript application, you don't need a requirements.txt file. Instead, consider adding these JavaScript dependencies to your package.json:

## For Drag & Drop Functionality
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## For State Management (optional, if app gets complex)
```bash
npm install zustand
```

## For Icons
```bash
npm install lucide-react
```

## For Better Drag & Drop (alternative)
```bash
npm install react-beautiful-dnd
```

## For UUID Generation (for guest/table IDs)
```bash
npm install uuid
npm install @types/uuid
```

## To add these dependencies, run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities lucide-react uuid
npm install -D @types/uuid
```

## Current Dependencies
Your app already has:
- React 19.1.1
- TypeScript
- Tailwind CSS
- Vite (build tool)