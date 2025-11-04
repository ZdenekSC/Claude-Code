# Gamebook Creator

A full-fledged interactive gamebook creator built with React Flow. Create branching narratives with an intuitive visual editor and export them as standalone HTML files with anchor navigation.

## Features

### Visual Node-Based Editor
- **React Flow** powered interface for creating game flows
- Drag-and-drop node placement and connection
- Real-time visual feedback of your game structure
- Mini-map for easy navigation of large projects

### Node Types

1. **Start Node** 🚀 - Define game title and initial player stats
2. **Story Node** 📖 - Write narrative text with inventory and stat modifications
3. **Choice Node** 🔀 - Create branching decisions
4. **Condition Node** ❓ - Branch based on inventory or stats
5. **Inventory Node** 🎒 - Dedicated item management
6. **Battle Node** ⚔️ - Simple turn-based combat
7. **End Node** 🏁 - Multiple ending types

### Game Systems

- **Inventory System**: Create reusable items and track player inventory
- **Stats/Attributes System**: Health, Gold, and custom attributes
- **Condition System**: Branch based on items or stat comparisons
- **Combat System**: Turn-based battles with configurable stats

### Export & Playback

- **Playback Mode**: Test your gamebook directly in the editor
- **Export to HTML**: Generate standalone HTML files with anchor navigation
- **Save/Load**: Export and import projects as JSON

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Build for production:
\`\`\`bash
npm run build
\`\`\`

## Technology Stack

- React + TypeScript
- Vite
- React Flow (@xyflow/react)
- Zustand
- Tailwind CSS

## Usage

1. Start with the default Start node
2. Add Story, Choice, and other nodes from the toolbar
3. Connect nodes by dragging from output to input handles
4. Select nodes to edit their properties in the right panel
5. Manage items in the Item Library
6. Test with the Play button
7. Export to HTML when ready

## License

MIT
