# ClawShake - Simple Commands

## Quick Commands (No Menu)

### Run Demo
```bash
npm run demo
```

### Setup New Profile
```bash
npm run setup
```

### Broadcast Job Request
```bash
npm run broadcast
```

### Start Web Dashboard
```bash
npm run server
```

### Run Tests
```bash
npm test
```

---

## With Menu (Interactive)

```bash
npm start
```

Then choose from:
1. Run Demo
2. Setup Profile
3. Broadcast Job
4. Start Dashboard
5. Run Tests
6. View Docs
7. Check Status

---

## Direct File Execution

If npm commands don't work, run files directly:

### Demo
```bash
node demo-local.js
```

### Setup
```bash
node setup-wizard.js
```

### Broadcast
```bash
node broadcast-wizard.js
```

### Server
```bash
node server.js
```

### Tests
```bash
node test.js
```

---

## Troubleshooting

**Setup wizard not responding?**
```bash
# Skip the menu, run directly:
node setup-wizard.js
```

**Need to broadcast without menu?**
```bash
# Run directly:
node broadcast-wizard.js
```

**Menu not working?**
```bash
# Use npm commands instead:
npm run setup
npm run broadcast
npm run demo
```

---

## Recommended Workflow

1. **First time?** Run: `npm run demo`
2. **Set up profile?** Run: `npm run setup`  
3. **Start dashboard?** Run: `npm run server`
4. **Broadcast job?** Run: `npm run broadcast`

**All commands work independently. No menu required.**
