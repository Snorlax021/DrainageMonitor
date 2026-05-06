# Smart Drainage Monitoring Dashboard

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```
3. Open http://localhost:3000

## Sensor data simulation
Send sample readings to the backend:

```bash
curl -X POST http://localhost:3000/api/sensor \
  -H "Content-Type: application/json" \
  -d '{"waterLevel": 82, "trashWeight": 45, "status": "Active"}'
```

## Controls
- Reset system sets water level and trash weight to 0.
- Manual trash collection clears trash weight to 0.
