# Quick Start Guide - Testing New Architecture

## Prerequisites

- MongoDB running on localhost:27017
- Node.js 18+ installed
- Two browser windows/tabs (for testing collaboration)

## Setup

### 1. Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 2. Configure Environment

**Server: create `server/.env`**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/synkboard
NODE_ENV=development
```

**Client: create `client/.env.local`**
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Start Services

**Terminal 1 - Start MongoDB:**
```bash
mongod
```

**Terminal 2 - Start Server:**
```bash
cd server
npm run dev
```

**Terminal 3 - Start Client:**
```bash
cd client
npm run dev
```

## Testing Strategy-by-Strategy

### ✅ Strategy 1 & 2: State-Based Sync + Version Conflict Resolution

**Test:** Concurrent edits resolve correctly

1. Open `http://localhost:3000` in **Browser A**
2. Create account / login
3. Create a new room (note the room ID)
4. Draw a rectangle

5. Open `http://localhost:3000` in **Browser B** (incognito/different browser)
6. Login with different account
7. Join the same room (paste room ID)
8. Verify you see the rectangle from Browser A

9. **Browser A**: Move the rectangle to the left
10. **Browser B**: Simultaneously move the same rectangle to the right
11. **Expected**: One version wins based on version number (higher wins)
12. Both browsers converge to the same final position

**Verify in MongoDB:**
```bash
mongosh
use synkboard
db.canvases.findOne({ roomId: "YOUR_ROOM_ID" })
# Check elements array has version and nonce fields
```

### ✅ Strategy 3: Multi-Layered Late Joiner Support

**Test:** Late joiner gets state from database and peers

1. **Browser A & B**: Both in same room, draw several elements
2. Close both browsers
3. Wait 30 seconds (ensures checkpoint saved to DB)
4. Open **Browser C** (new browser, new user)
5. Join the same room
6. **Expected**: See all elements immediately (from database)

**Test peer broadcasting:**
1. **Browser A**: In room with elements
2. **Browser B**: Join while Browser A is still connected
3. **Expected**: 
   - Browser B gets state from database (Layer 1)
   - Browser B also receives peer-state from Browser A (Layer 2)
   - State reconciles using version numbers

**Verify in Console:**
- Browser B should log: "✓ Received full state: N elements"
- Browser B should log: "✓ Received peer state from: <socket-id>"

### ✅ Strategy 4: Smart Persistence (Lazy Checkpointing)

**Test:** Checkpoints save every 20 seconds

1. Open room in Browser A
2. Draw element #1
3. Wait 5 seconds
4. Draw element #2
5. Wait 5 seconds
6. Draw element #3

7. Watch server console for checkpoint logs:
```
✓ Checkpoint saved for room <room-id>
```

8. Verify in MongoDB that elements are saved:
```bash
mongosh
use synkboard
# Watch in real-time
watch("db.canvases.findOne({ roomId: 'YOUR_ROOM_ID' })")
```

**Test checkpoint on room exit:**
1. Draw elements in room
2. Close all browser tabs (all users leave)
3. Check server logs: "✓ Room <room-id> cleaned up"
4. Verify final checkpoint was saved in MongoDB

### ✅ Strategy 5: Minimal User Tracking

**Test:** Server only tracks sockets, client handles metadata

1. Open room in **Browser A**
2. Notice your user color and name appear in user list
3. Open room in **Browser B**
4. Notice both users appear with different colors

**Verify in Server Logs:**
```
✓ User <socket-id> joined room <room-id>
```

**Verify in MongoDB:**
```bash
db.rooms.findOne({ roomId: "YOUR_ROOM_ID" })
# Check activeUsers array has socketId, userName, userColor
```

### ✅ Strategy 6: E2E Encryption (Architecture Ready)

**Verify schema is ready:**
```bash
mongosh
db.rooms.findOne()
# Should have 'accessKey' field (currently null/undefined)

db.canvases.findOne()
# Should have 'encryptedData' field (currently null/undefined)
```

**Note:** Actual encryption implementation is prepared for future enhancement.

### ✅ Strategy 7: Incremental Broadcasting

**Test:** Only changed elements broadcast

1. Open browser DevTools → Network → WS (WebSocket)
2. **Browser A**: Draw 10 rectangles
3. Observe WebSocket messages:
   - Initial: `full-state` with all elements
   - After that: Only `state-update` with changed elements

4. **Browser A**: Modify one rectangle (move it)
5. **Browser B**: Should receive `state-update` with ONLY that 1 element

**Advanced Test - Shadow State:**
1. Draw 5 elements
2. Wait 2 minutes (triggers periodic full resync)
3. Server clears shadow state
4. Next modification broadcasts full state
5. After that, back to incremental updates

**Bandwidth Comparison:**
- Old system: Every stroke = full canvas serialization
- New system: Every stroke = only changed element
- Savings: ~90-95% for typical use

### ✅ Strategy 8: Cursor & Presence Optimization

**Test:** Cursor position updates are throttled

1. **Browser A**: Move mouse continuously over canvas
2. **Browser B**: See cursor position update smoothly
3. Open DevTools → Network → WS
4. Count `update-presence` messages
5. **Expected**: Max 20 per second (50ms throttle)

**Test active element indication:**
1. **Browser A**: Select a rectangle (click on it)
2. **Browser B**: Check user list - should show ✏️ indicator next to Browser A's name
3. **Browser A**: Deselect (click on empty space)
4. **Browser B**: ✏️ indicator disappears

## Full Scenario Test

**Real-World Collaboration Scenario:**

1. **User Alice** (Browser A):
   - Creates room
   - Draws 3 rectangles
   - Draws 2 circles

2. **User Bob** (Browser B):
   - Joins room
   - Sees all Alice's shapes instantly (late joiner support)
   - Draws 1 triangle
   - Moves one of Alice's rectangles

3. **User Charlie** (Browser C):
   - Joins room while Alice & Bob are active
   - Gets state from database + peer broadcasts
   - Sees all 6 shapes
   - His cursor is visible to Alice & Bob

4. **Conflict Test:**
   - Alice selects same rectangle as Bob is moving
   - Both try to modify simultaneously
   - Version conflict resolution kicks in
   - Higher version wins
   - Both converge to same final state

5. **Persistence Test:**
   - All users close browsers
   - Server saves final checkpoint
   - Room state cleaned from memory
   - 5 minutes later, Alice rejoins
   - Sees all 6 shapes (from database)

6. **Network Recovery:**
   - Bob's internet disconnects
   - Alice keeps drawing
   - Bob reconnects
   - Gets incremental updates (only new elements)
   - After 60 seconds, gets full resync to recover any missed updates

## Performance Benchmarks

Run these tests to verify performance:

### Memory Test
```bash
# Monitor server memory
while true; do
  ps aux | grep node | grep -v grep
  sleep 5
done
```

**Expected:** Memory stays stable even with many rooms

### Database Test
```bash
# Watch checkpoint frequency
mongosh
use synkboard
db.canvases.find().forEach(c => print(c.roomId, c.lastCheckpoint))
```

**Expected:** Checkpoints ~20 seconds apart

### Bandwidth Test

Use Chrome DevTools → Network → WS:

1. Draw 100 strokes continuously
2. Measure total WebSocket traffic
3. Compare with old system

**Expected Results:**
- Old system: ~5-10 MB for 100 strokes
- New system: ~500 KB - 1 MB for 100 strokes

## Common Issues & Solutions

### Cursors Not Showing

**Check:**
```javascript
// client/src/components/Canvas.tsx
// Ensure handleMouseMove is attached
// Ensure cursor rendering JSX is present
```

### Elements Not Syncing

**Check server logs:**
```
✓ User <id> joined room <room>
✓ Checkpoint saved for room <room>
```

**Check browser console:**
```
✓ Socket connected: <socket-id>
✓ Received full state: N elements
```

### Database Not Updating

**Check checkpoint timer:**
```typescript
// In socketHandler.ts, add logging:
console.log('Checkpoints scheduled:', checkpointTimers.size);
```

## Success Criteria

All tests passing means:
- ✅ Multi-user real-time collaboration works
- ✅ Conflict resolution is deterministic
- ✅ Late joiners get complete state
- ✅ Checkpoints save automatically
- ✅ Bandwidth is optimized
- ✅ Cursors and presence work smoothly
- ✅ Server memory stays stable
- ✅ System scales to multiple rooms

## Next Steps

After all tests pass:
1. Load testing (100+ concurrent users)
2. Add E2E encryption implementation
3. Add undo/redo functionality
4. Implement object locking
5. Add export functionality (PNG, SVG, PDF)
6. Deploy to production

## Monitoring in Production

Add these to your production setup:
- Socket.io admin UI for live monitoring
- MongoDB monitoring (Atlas/Ops Manager)
- Application Performance Monitoring (Datadog, New Relic)
- Error tracking (Sentry)
- Real user monitoring (LogRocket)

Happy testing! 🎨✨
