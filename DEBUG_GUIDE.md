# 🐛 Debug Guide - Whiteboard Not Syncing

## Quick Test Steps

### 1. Start Server with Logs
```powershell
cd C:\Users\Supprit\OneDrive\Desktop\skribble\server
node server.js
```

### 2. Start Web Client
```powershell
cd C:\Users\Supprit\OneDrive\Desktop\skribble\web
npm run dev
```

### 3. Open Browser DevTools (F12) in ALL Tabs
- Open 4+ tabs → http://localhost:5173
- Press F12 in each tab to open Console
- Enter names and join game

### 4. Check Console Logs

#### When Drawer Draws:

**On Drawer's Console (Tab 1):**
```
✅ Canvas: Setting up socket listeners {roomId: "room-1", isDrawing: true}
✅ Canvas: Socket listeners attached
📤 Sending stroke to server: {roomId: "room-1", points: 45, color: "#FF0000", size: 5}
✅ Stroke emitted
```

**On Server Console:**
```
📥 Received endStroke from abc123: {roomId: "room-1", pointCount: 45}
🖌️ Broadcasting stroke to room room-1: 45 points
   Players in room: Player1, Player2, Player3, Player4
✅ Stroke broadcasted to other players in room-1
```

**On Other Players' Console (Tabs 2-4):**
```
✅ Canvas: Setting up socket listeners {roomId: "room-1", isDrawing: false}
✅ Canvas: Socket listeners attached
📥 Received stroke from server: {points: Array(45), color: "#FF0000", size: 5}
✅ Stroke drawn on canvas
```

---

## Common Issues & Fixes

### Issue 1: "⚠️ Canvas: No socket provided"
**Problem:** Socket not passed to Canvas component
**Fix:** Check PlayGround.jsx passes socket prop

### Issue 2: "⚠️ Stroke not sent: hasRoomId: false"
**Problem:** roomId is null/undefined
**Fix:** Check user.roomId is set when joining

### Issue 3: "❌ Room room-1 not found"
**Problem:** Server doesn't have the room
**Fix:** Check players joined properly with register event

### Issue 4: No "📥 Received stroke" on other players
**Problem:** Socket.io not broadcasting properly
**Possible causes:**
- Players not in same room
- Socket not connected
- Event listener not attached

### Issue 5: Socket connects but no events
**Check WebSocket Connection:**
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Should see connection to localhost:3001
4. Should show "101 Switching Protocols"

---

## Manual Debug Checklist

Run through this checklist:

### ✅ Server Side:
- [ ] Server running on port 3001
- [ ] See "✅ Client connected" logs for each player
- [ ] See "👥 Player joined room-X" for each player
- [ ] All players in SAME room (e.g., "room-1")
- [ ] See "📥 Received endStroke" when drawing
- [ ] See "✅ Stroke broadcasted" after receiving

### ✅ Client Side (Drawer):
- [ ] Canvas component receives socket prop
- [ ] Canvas component receives roomId prop
- [ ] Canvas component receives isDrawing={true}
- [ ] See "✅ Canvas: Socket listeners attached"
- [ ] Can draw on canvas (cursor is crosshair)
- [ ] See "📤 Sending stroke" when mouse released
- [ ] See "✅ Stroke emitted" after sending

### ✅ Client Side (Viewers):
- [ ] Canvas component receives socket prop
- [ ] Canvas component receives roomId prop  
- [ ] Canvas component receives isDrawing={false}
- [ ] See "✅ Canvas: Socket listeners attached"
- [ ] Cursor shows "not-allowed"
- [ ] See "📥 Received stroke from server" when drawer draws
- [ ] See "✅ Stroke drawn on canvas" after receiving

---

## Test Commands

### Check if Socket.io is working:
In browser console (any tab):
```javascript
console.log("Socket connected?", socket.connected);
console.log("Socket ID:", socket.id);
```

### Manually test emit:
In drawer's console:
```javascript
socket.emit("endStroke", {
  roomId: "room-1",  // Use actual room ID
  stroke: {
    points: [{x:100,y:100}, {x:200,y:200}],
    color: "#FF0000",
    size: 5
  }
});
```

Check if other players receive it.

---

## If Still Not Working

### 1. Check Room ID matches
In all browser consoles:
```javascript
console.log("My room:", socket.roomId); // Should be same for all players
```

### 2. Verify socket joining room
In server console, you should see:
```
👥 Player1 joined room-1
👥 Player2 joined room-1
👥 Player3 joined room-1
👥 Player4 joined room-1
```

### 3. Test with simple drawing
- Draw a single line slowly
- Check server logs immediately
- Check other players' logs immediately

### 4. Clear browser cache
```
Ctrl+Shift+Delete → Clear all cache → Restart browser
```

---

## Success Indicators

When working correctly:

1. **Drawer draws** → Immediately see logs on server
2. **Server receives** → Immediately broadcasts to room
3. **Other players receive** → Immediately draw on canvas
4. **Total time** → < 100ms from draw to display

---

## Next Steps

If you see the logs correctly but still no drawing appears:
1. Check canvas rendering code in drawStroke()
2. Check canvas dimensions (width/height)
3. Check if canvas context is available
4. Try drawing with different colors/sizes

If you don't see logs at all:
1. Socket.io connection issue
2. Room joining issue
3. Event name mismatch
