# Migration Guide: Operation-Based → State-Based Synchronization

## Breaking Changes

### Database Schema Changes

The Canvas model has been completely restructured:

**Old Schema:**
```typescript
{
  roomId: string;
  dataJSON: string;  // Serialized full canvas
}
```

**New Schema:**
```typescript
{
  roomId: string;
  elements: Array<{
    id: string;
    type: string;
    properties: any;
    version: number;
    nonce: number;
    lastModified: Date;
  }>;
  sceneVersion: number;
  lastCheckpoint: Date;
}
```

### Socket Event Changes

**Removed Events:**
- ❌ `draw` - No longer used (replaced by state-update)

**New Events:**
- ✅ `join-room` - Now accepts `{ roomId, userName, userColor }`
- ✅ `state-update` - Broadcasts element changes
- ✅ `delete-elements` - Broadcasts element deletions
- ✅ `full-state` - Sends complete state to new joiner
- ✅ `peer-state` - Peer-to-peer state sharing
- ✅ `update-presence` - Cursor and active element tracking
- ✅ `presence-update` - Broadcast presence changes
- ✅ `request-state-broadcast` - Request state from peers
- ✅ `broadcast-my-state` - Respond to broadcast request
- ✅ `user-joined` - User joined notification
- ✅ `user-left` - User left notification

### API Changes

**Canvas Endpoints:**

**Old:**
```typescript
GET  /api/rooms/:roomId/canvas → { dataJSON: string }
POST /api/rooms/save → { roomId, dataJSON }
```

**New:**
```typescript
GET  /api/rooms/:roomId/canvas → { elements: CanvasElement[], sceneVersion: number }
POST /api/rooms/save → { roomId, elements: CanvasElement[], sceneVersion: number }
```

## Migration Steps

### Step 1: Backup Database

```bash
# Backup your MongoDB database
mongodump --db synkboard --out ./backup
```

### Step 2: Clear Old Canvas Data

Since the schema is incompatible, you have two options:

**Option A: Start Fresh (Recommended for Development)**
```bash
# Connect to MongoDB
mongosh

use synkboard

# Drop canvas collection
db.canvases.drop()

# Canvas collection will be recreated automatically with new schema
```

**Option B: Migrate Existing Data (Production)**

If you need to preserve existing canvases, create a migration script:

```javascript
// migrate-canvas-data.js
const mongoose = require('mongoose');

// Old schema
const OldCanvasSchema = new mongoose.Schema({
  roomId: String,
  dataJSON: String
});
const OldCanvas = mongoose.model('OldCanvas', OldCanvasSchema, 'canvases');

// New schema
const NewCanvasSchema = new mongoose.Schema({
  roomId: String,
  elements: Array,
  sceneVersion: Number,
  lastCheckpoint: Date
});
const NewCanvas = mongoose.model('NewCanvas', NewCanvasSchema, 'canvases_new');

async function migrate() {
  await mongoose.connect('mongodb://localhost:27017/synkboard');
  
  const oldCanvases = await OldCanvas.find();
  
  for (const oldCanvas of oldCanvases) {
    try {
      const data = JSON.parse(oldCanvas.dataJSON);
      const elements = (data.objects || []).map((obj, index) => ({
        id: `migrated_${Date.now()}_${index}`,
        type: obj.type,
        properties: obj,
        version: 0,
        nonce: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
        lastModified: new Date()
      }));
      
      await NewCanvas.create({
        roomId: oldCanvas.roomId,
        elements,
        sceneVersion: 0,
        lastCheckpoint: new Date()
      });
      
      console.log(`Migrated room: ${oldCanvas.roomId}`);
    } catch (error) {
      console.error(`Failed to migrate room: ${oldCanvas.roomId}`, error);
    }
  }
  
  console.log('Migration complete. Rename canvases_new to canvases');
  await mongoose.disconnect();
}

migrate();
```

### Step 3: Update Dependencies

No new dependencies required, but verify versions:

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### Step 4: Environment Variables

Add to your `.env` files if not present:

**Server (.env):**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/synkboard
NODE_ENV=development
```

**Client (.env.local):**
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Step 5: Test the Migration

1. **Start MongoDB:**
```bash
mongod
```

2. **Start Server:**
```bash
cd server
npm run dev
```

3. **Start Client:**
```bash
cd client
npm run dev
```

4. **Test Checklist:**
   - [ ] Create a new room
   - [ ] Draw some elements
   - [ ] Open the same room in another browser/tab
   - [ ] Verify elements sync
   - [ ] Modify an element, verify sync
   - [ ] Check MongoDB to see elements stored correctly
   - [ ] Close all tabs, reopen room, verify persistence
   - [ ] Check cursor positions show for other users

## Troubleshooting

### Issue: Socket connection fails

**Symptom:** Console shows "Socket connection error"

**Solution:**
1. Verify server is running on port 5000
2. Check CORS configuration in server
3. Verify `NEXT_PUBLIC_SOCKET_URL` is correct

```typescript
// server/src/index.ts - Verify CORS is open
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
```

### Issue: Elements not syncing

**Symptom:** Drawing on one client doesn't appear on others

**Solution:**
1. Open browser console on both clients
2. Check for socket events: `state-update`, `full-state`
3. Verify `join-room` was successful
4. Check MongoDB has the canvas document

```bash
# Check MongoDB
mongosh
use synkboard
db.canvases.findOne({ roomId: "YOUR_ROOM_ID" })
```

### Issue: Version conflicts

**Symptom:** Elements keep changing or flickering

**Solution:**
This usually indicates clock skew or network issues. The version-based conflict resolution should handle this automatically, but you can:

1. Clear browser cache
2. Ensure system clocks are synchronized
3. Check network latency (high latency can cause more conflicts)

### Issue: Canvas not loading for late joiners

**Symptom:** User joins but sees empty canvas

**Solution:**
1. Check if database has elements: `db.canvases.findOne({ roomId: "XXX" })`
2. Verify `full-state` event is being sent (check server logs)
3. Check if peer broadcasting is working
4. Manually trigger checkpoint:

```bash
# In MongoDB
db.canvases.updateOne(
  { roomId: "XXX" },
  { $set: { lastCheckpoint: new Date() } }
)
```

### Issue: Memory leak on server

**Symptom:** Server memory grows over time

**Solution:**
This shouldn't happen with the new architecture, but if it does:

1. Check if rooms are being cleaned up when empty
2. Verify checkpoint timers are being cleared
3. Monitor `roomStates` Map size:

```typescript
// Add to socketHandler.ts for debugging
setInterval(() => {
  console.log('Active rooms:', roomStates.size);
  console.log('Shadow states:', shadowStates.size);
  console.log('Timers:', checkpointTimers.size);
}, 60000);
```

## Performance Tuning

### Adjust Checkpoint Interval

Default is 20 seconds. To change:

```typescript
// server/src/socket/socketHandler.ts
const CHECKPOINT_INTERVAL = 30000; // 30 seconds
```

Longer intervals → Less DB writes, more data loss risk
Shorter intervals → More DB writes, less data loss risk

### Adjust Broadcast Throttle

Default is 100ms. To change:

```typescript
// server/src/socket/socketHandler.ts
const BROADCAST_THROTTLE = 150; // 150ms
```

Longer throttle → Less bandwidth, higher latency
Shorter throttle → More bandwidth, lower latency

### Adjust Cursor Update Throttle

Default is 50ms (20 updates/sec). To change:

```typescript
// client/src/services/socket.ts
const CURSOR_UPDATE_THROTTLE = 100; // 100ms = 10 updates/sec
```

## Rollback Plan

If you need to rollback to the old system:

1. **Restore database:**
```bash
mongorestore --db synkboard ./backup/synkboard
```

2. **Git revert:**
```bash
git checkout <previous-commit>
```

3. **Reinstall dependencies:**
```bash
cd server && npm install
cd ../client && npm install
```

## Next Steps

After successful migration:

1. ✅ Test with multiple users
2. ✅ Monitor server performance
3. ✅ Check database growth rate
4. ✅ Test edge cases (network drops, concurrent edits)
5. ✅ Consider implementing E2E encryption
6. ✅ Add monitoring/logging (DataDog, Sentry, etc.)
7. ✅ Set up automated backups
8. ✅ Load testing with many concurrent users

## Support

For issues or questions:
- Check ARCHITECTURE.md for implementation details
- Review console logs for socket events
- Use MongoDB Compass to inspect database
- Enable verbose logging in development

```typescript
// Enable debug logging
// server/src/socket/socketHandler.ts
console.log('✓ Room state:', roomState);
console.log('✓ Changed elements:', changedElements);
```

Good luck with your migration! 🚀
