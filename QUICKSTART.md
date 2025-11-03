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
5. Copy the connection string

### Option B: Microsoft Fabric EventStream
1. Go to [Microsoft Fabric](https://app.fabric.microsoft.com)
2. Navigate to Real-Time Intelligence
3. Create new Eventstream
4. Add source → Custom App
5. Copy the EventHub-compatible endpoint and generate SAS token

## Step 3: Configure the App
1. Enter your name
2. Paste EventHub URL: `https://[namespace].servicebus.windows.net/[eventhub-name]`
3. Paste SAS token: `SharedAccessSignature sr=...`
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

## Example SAS Token Format
```
SharedAccessSignature sr=mynamespace.servicebus.windows.net&sig=abc123...&se=1234567890&skn=SendPolicy
```

## Need Help?
Check the detailed setup instructions on the main page or refer to README.md for complete documentation.
