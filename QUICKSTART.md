# Quick Start Guide

## Step 1: Open the Website
Simply open `index.html` in your mobile browser or host it on any web server.

### Hosting Options:
```bash
# Python (simplest)
python3 -m http.server 8000

# Node.js
npx http-server

# Or deploy to GitHub Pages for free hosting
```

## Step 2: Get Your EventHub Details

### Option A: Azure EventHub
1. Go to [Azure Portal](https://portal.azure.com)
2. Create an Event Hubs namespace
3. Create an event hub within the namespace
4. Go to Shared access policies → Create policy with "Send" permission
5. Copy the connection string or generate a SAS token

### Option B: Microsoft Fabric EventStream (Recommended)
1. Go to [Microsoft Fabric](https://app.fabric.microsoft.com)
2. Navigate to Real-Time Intelligence workload
3. Create new Eventstream (e.g., "Phone-Shake-Stream")
4. Add source → **Custom App**
5. Go to the **Keys** section
6. Click on the **SAS Key Authentication** tab
7. Copy the **Event Hub compatible endpoint**:
   - Format: `https://eventhouse-[xyz].servicebus.windows.net/es_[stream-name]`
   - Example: `https://eventhouse-abc123.servicebus.windows.net/es_phone-shake-stream`
8. Copy the **SAS Key** (starts with `SharedAccessSignature sr=...`):
   - Example: `SharedAccessSignature sr=eventhouse-abc123.servicebus.windows.net&sig=...&se=1234567890&skn=KeyName`

## Step 3: Configure the App
1. Enter your name
2. Paste EventHub URL:
   - Azure EventHub: `https://[namespace].servicebus.windows.net/[eventhub-name]`
   - Microsoft Fabric EventStream: `https://eventhouse-[xyz].servicebus.windows.net/es_[stream-name]`
3. Paste SAS Key/Token: `SharedAccessSignature sr=...`
4. Click "Apply Settings & Start"

## Step 4: Shake Your Phone!
- Grant motion permission if prompted (iOS)
- Shake your phone to send telemetry
- Watch the metrics update in real-time

## Step 5: Visualize in Power BI
1. Connect Power BI to your EventHub
2. Create visualizations:
   - Line chart for acceleration over time
   - Card for total shake count
   - Gauge for current intensity

## Troubleshooting

**No motion detected?**
- Ensure you're on a mobile device
- Check browser permissions
- Try refreshing the page

**Events not sending?**
- Verify EventHub URL format
- Check SAS token has "Send" permission
- Look at browser console for errors

**HTTPS required?**
- Mobile browsers require HTTPS (except localhost)
- Use GitHub Pages or Azure Static Web Apps for free HTTPS hosting

## Example Connection Details

### Microsoft Fabric EventStream Example:
**EventHub-compatible endpoint:**
```
https://eventhouse-abc123.servicebus.windows.net/es_phone-shake-stream
```

**SAS Key (from SAS Key Authentication tab):**
```
SharedAccessSignature sr=eventhouse-abc123.servicebus.windows.net&sig=abc123xyz...&se=1234567890&skn=KeyName
```

### Azure EventHub Example:
**EventHub URL:**
```
https://mynamespace.servicebus.windows.net/myeventhub
```

**SAS Token:**
```
SharedAccessSignature sr=mynamespace.servicebus.windows.net&sig=abc123...&se=1234567890&skn=SendPolicy
```

## Need Help?
Check the detailed setup instructions on the main page or refer to README.md for complete documentation.
