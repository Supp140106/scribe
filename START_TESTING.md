# Testing Instructions for Skribbl.io Whiteboard

## Quick Start

### Terminal 1 - Start Server:
```powershell
cd C:\Users\Supprit\OneDrive\Desktop\skribble\server
node server.js
```

### Terminal 2 - Start Web Client:
```powershell
cd C:\Users\Supprit\OneDrive\Desktop\skribble\web
npm run dev
```

## Testing Steps

1. **Open 4+ browser tabs** (need 4 players minimum to start game)
   - Go to `http://localhost:5173` in each tab

2. **Enter different names** in each tab and click PLAY

3. **Wait for game to start** (happens automatically when 4 players join)

4. **Drawer chooses a word** from the popup

5. **Test Drawing:**
   - Drawer should be able to draw
   - **ALL OTHER PLAYERS should see the drawing in real-time** ✨
   - Test different colors
   - Test different brush sizes
   - Test eraser
   - Test clear button
   - Test undo button

6. **Test Guessing:**
   - Non-drawers type guesses in chat
   - Everyone sees all guesses
   - Correct guesses show celebration message
   - Scores update

## What Was Fixed

### The Problem:
- You were using `react-sketch-canvas` library which had a different data format
- The server expected simple stroke data (points array)
- Events weren't matching between client and server

### The Solution:
- **Removed react-sketch-canvas** completely
- **Using native HTML5 Canvas API** with the Canvas.jsx component
- Canvas now collects drawing points and sends complete strokes
- Server broadcasts strokes to all other players
- Everyone's canvas renders the same strokes

## Architecture

```
Player 1 (Drawer)                    Server                     Player 2,3,4 (Viewers)
─────────────────                    ──────                     ──────────────────────
  Draw on canvas
        │
        └──> endStroke event ──────> Receives stroke
                {roomId, stroke}     Stores in drawHistory
                                            │
                                            └──> Broadcasts ────> Receives stroke
                                                 endStroke         Draws on canvas
                                                 {stroke}
```

## Stroke Data Format

```javascript
{
  points: [
    {x: 100, y: 150},
    {x: 102, y: 152},
    {x: 105, y: 155},
    // ... more points
  ],
  color: "#FF0000",
  size: 5
}
```

## Debugging

If drawing still doesn't sync:

1. **Open browser DevTools** (F12) on multiple tabs
2. **Check Console** for errors
3. **Check Network tab** → WS (WebSocket) → Should show connected
4. **Add console.log** to see events:

In Canvas.jsx, add after line 37:
```javascript
console.log("Received stroke from server:", stroke);
```

In Canvas.jsx, add after line 151:
```javascript
console.log("Sending stroke to server:", currentStroke.current);
```

In server.js, add after line 288:
```javascript
console.log("Broadcasting stroke to room:", roomId, "stroke points:", stroke.points?.length);
```

## Common Issues

1. **Canvas is blank**: Check if roomId is being passed to Canvas component
2. **Drawing locally but not syncing**: Check WebSocket connection in DevTools
3. **Can't draw at all**: Make sure you're the drawer (only drawer can draw)
4. **Game won't start**: Need 4+ players to join

## Port Configuration

- Server: `http://localhost:3001`
- Web Client: `http://localhost:5173`

Make sure these ports are available!
