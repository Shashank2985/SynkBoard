# SynkBoard Client

> Real-time collaborative whiteboard built with Next.js 15 and Fabric.js

## ✨ Features

### Implemented
- ✅ **Real-time Collaboration** - State-based sync with version control
- ✅ **Live Cursors** - See other users' cursors with names and colors
- ✅ **User Presence** - Know who's online and what they're editing
- ✅ **Drawing Tools** - Pen, eraser, shapes (rect, circle, triangle), text
- ✅ **Conflict Resolution** - Deterministic merging (no race conditions)
- ✅ **Instant Sync** - Late joiners receive state instantly (< 1s)
- ✅ **Auto-save** - Background checkpointing every 20 seconds
- ✅ **Incremental Updates** - 90% bandwidth reduction

### Coming Soon (Person 2 & 3)
- 🔄 Undo/Redo (Ctrl+Z / Ctrl+Y)
- 🔄 Enhanced Toolbar (color palettes, line width presets)
- 🔄 Share Modal with copy-to-clipboard
- 🔄 Offline detection and warning banner
- 🔄 Loading skeletons and error boundaries
- 🔄 Recent rooms dashboard

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Server running on http://localhost:5000

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the client root:

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Run Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build for Production

```bash
npm run build
npm start
```

## 🎨 Usage

### Create a Room

1. Register/Login at `/login` or `/register`
2. Go to `/dashboard`
3. Click "Create New Room"
4. Start drawing!

### Join a Room

1. Get room ID from URL: `/room/[roomId]`
2. Share the URL with collaborators
3. Everyone sees changes in real-time

### Drawing Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| Pen | - | Freehand drawing |
| Eraser | - | Erase strokes |
| Rectangle | - | Click to place |
| Circle | - | Click to place |
| Triangle | - | Click to place |
| Text | - | Click to add text |
| Clear | - | Clear entire canvas |

### Keyboard Shortcuts (Coming Soon)

- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Del` - Delete selected

## 🏗️ Architecture

### State Management

```typescript
canvasState = {
  elements: Map<id, {
    properties: any,
    version: number,
    nonce: number
  }>,
  sceneVersion: number
}
```

### Sync Flow

1. User draws → Create versioned element
2. Broadcast to server (throttled 100ms)
3. Server reconciles with room state
4. Server broadcasts to other clients
5. Clients merge using version rules

### Conflict Resolution

```typescript
// User A: version 5, nonce 1234
// User B: version 5, nonce 5678
// Winner: nonce 1234 (lower wins deterministically)
```

## 📁 Project Structure

```
client/src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Login page
│   ├── register/page.tsx     # Register page
│   ├── dashboard/page.tsx    # User dashboard
│   ├── room/[roomId]/page.tsx # Collaboration room
│   └── globals.css           # Global styles
├── components/
│   ├── Canvas.tsx            # Main canvas (Fabric.js + sync)
│   ├── Toolbar.tsx           # Drawing tools
│   ├── UserList.tsx          # Active users display
│   └── AuthForm.tsx          # Auth form component
├── services/
│   ├── socket.ts             # Socket.io client
│   └── api.ts                # HTTP API client
├── types/
│   └── sync.types.ts         # TypeScript interfaces
├── utils/
│   └── stateReconciliation.ts # Conflict resolution
└── store/
    └── userStore.ts          # Zustand user state
```

## 🔧 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Canvas:** Fabric.js 6
- **Real-time:** Socket.io Client
- **Styling:** Tailwind CSS
- **State:** Zustand
- **HTTP Client:** Axios
- **Language:** TypeScript

## 🎯 Component Responsibilities

### Canvas.tsx
- Fabric.js canvas management
- State-based sync logic
- Version-based conflict resolution
- User presence tracking
- Cursor rendering
- Broadcast throttling

### Toolbar.tsx
- Tool selection (pen, shapes, etc.)
- Color picker
- Line width slider
- Clear button
- Save button

### UserList.tsx
- Active users display
- Color-coded avatars
- Editing indicators (✏️)
- User count

## 🧪 Testing

### Manual Testing

1. Open 2 browser windows (or incognito)
2. Login with different accounts
3. Join the same room
4. Draw in one window
5. Verify it appears in the other window

### Test Scenarios

- ✅ Drawing syncs across clients
- ✅ Shapes sync (rect, circle, triangle, text)
- ✅ Moving/resizing objects syncs
- ✅ Deleting objects syncs
- ✅ Clear canvas syncs
- ✅ Late joiners see full state
- ✅ Cursors show for all users
- ✅ Concurrent edits resolve correctly

## 🐛 Troubleshooting

### Canvas not loading

```bash
# Check server is running
curl http://localhost:5000

# Check socket connection
# Open browser console, look for:
✓ Socket connected: <socket-id>
```

### Changes not syncing

1. Check browser console for socket events:
   - `full-state`
   - `state-update`
   - `presence-update`

2. Verify server logs show:
   ```
   ✓ User <id> joined room <room>
   ```

### Cursors not showing

Check:
- Other user is actually in the room
- Mouse is moving over canvas
- Look for `presence-update` events in console

## 📚 Documentation

For detailed documentation, see project root:

- **ARCHITECTURE.md** - Complete system design
- **QUICK_START.md** - Testing guide for all features
- **COMPARISON.md** - Performance metrics

## 🚧 Development Roadmap

### Person 2 Tasks
- [ ] Undo/Redo system
- [ ] Enhanced toolbar (presets, palettes)
- [ ] Extract `useCanvas` hook
- [ ] Create `fabricHelpers.ts` utilities
- [ ] Performance optimizations

### Person 3 Tasks
- [ ] Share modal + clipboard
- [ ] Offline detection & banner
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Recent rooms dashboard
- [ ] Extract `CursorPresence` component

## 📄 License

MIT

## 🤝 Contributing

Pull requests are welcome! For major changes:

1. Fork the repo
2. Create a feature branch
3. Commit with conventional commits format
4. Push and create a PR

## 📞 Support

For issues or questions:
- Open a GitHub issue
- Check ARCHITECTURE.md for implementation details
- Review QUICK_START.md for testing guides
