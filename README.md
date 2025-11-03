# EventHub Shaker 📱

A web-based demo application that captures phone shake telemetry and sends it to Azure EventHub or Microsoft Fabric EventStream in real-time. Perfect for demonstrating real-time data streaming and Power BI visualizations!

## 🌟 Features

- **Simple Web Interface**: No app installation required - just open in a mobile browser
- **Real-time Telemetry**: Captures accelerometer data when you shake your phone
- **EventHub Integration**: Sends structured data to Azure EventHub or Microsoft Fabric EventStream
- **Power BI Ready**: Data format optimized for real-time dashboards
- **Visual Feedback**: See your shake count and acceleration metrics in real-time

## 🚀 Quick Start

### For Users

1. Open `index.html` in a mobile browser (or host it on any web server)
2. Enter your name
3. Enter your EventHub/EventStream connection details:
   - **EventHub URL**: `https://[namespace].servicebus.windows.net/[eventhub-name]`
   - **SAS Token**: Your SharedAccessSignature with Send permissions
4. Click "Apply Settings & Start"
5. Grant motion permission when prompted (iOS)
6. Start shaking your phone! 📱

### Hosting the Application

#### Option 1: Local Testing
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Then open: http://localhost:8000
```

#### Option 2: GitHub Pages
1. Push to GitHub
2. Go to Settings → Pages
3. Select branch and save
4. Access at: `https://[username].github.io/Eventhub-shaker/`

#### Option 3: Deploy to Azure
For production deployment with HTTPS, scalability, and integration with Azure services:

📘 **See [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) for complete deployment guide**

Quick deploy options:
- **Azure Static Web Apps** (Recommended - Free tier available)
- **Azure App Service** (More control and features)
- **Azure Blob Storage** (Most cost-effective)

Includes full setup for:
- Web app deployment with Azure CLI
- EventHub infrastructure configuration
- Power BI connection setup
- Security best practices
- Cost estimation (~$10/month)

## 📊 Setup Microsoft Fabric EventStream

### Step 1: Create EventStream
1. Go to [Microsoft Fabric Portal](https://app.fabric.microsoft.com)
2. Navigate to **Real-Time Intelligence** workload
3. Click **New** → **Eventstream**
4. Name it (e.g., "Phone-Shake-Stream")

### Step 2: Configure Custom Endpoint
1. In your EventStream, add a source → **Custom App**
2. Copy the **Event Hub compatible endpoint**
3. Generate a **SAS token** with Send permissions
4. Use these in the web app configuration

### Step 3: Add Destinations
- **KQL Database**: For querying and analytics
- **Lakehouse**: For long-term storage
- **Reflex**: For real-time alerts

### Step 4: Visualize in Power BI
Create real-time reports with:
- **Line Chart**: Acceleration magnitude over time
- **Bar Chart**: Shake count by user
- **Gauge**: Current shake intensity
- **Map**: Geographic distribution (if location added)

## 📦 Data Format

The application sends JSON events to EventHub:

```json
{
  "timestamp": "2024-11-02T23:45:00.000Z",
  "userName": "John Doe",
  "eventType": "shake",
  "acceleration": {
    "x": 2.45,
    "y": -3.21,
    "z": 9.81,
    "magnitude": 10.75
  },
  "deltaAcceleration": {
    "x": 1.23,
    "y": -2.15,
    "z": 0.45,
    "magnitude": 2.56
  },
  "shakeIntensity": "high"
}
```

### Fields Explanation
- **timestamp**: ISO 8601 format timestamp
- **userName**: User identifier from form
- **eventType**: Always "shake" for shake events
- **acceleration**: Current acceleration on X, Y, Z axes (m/s²)
- **deltaAcceleration**: Change in acceleration (useful for detecting shake intensity)
- **shakeIntensity**: "low", "medium", or "high" based on delta magnitude

## 🛠️ Azure EventHub Setup

### Create EventHub
```bash
# Create namespace
az eventhubs namespace create \
  --name shake-telemetry-ns \
  --resource-group myResourceGroup \
  --location eastus

# Create event hub
az eventhubs eventhub create \
  --name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group myResourceGroup
```

### Generate SAS Token
```bash
# Create authorization rule
az eventhubs eventhub authorization-rule create \
  --name SendPolicy \
  --eventhub-name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group myResourceGroup \
  --rights Send

# Get connection string
az eventhubs eventhub authorization-rule keys list \
  --name SendPolicy \
  --eventhub-name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group myResourceGroup
```

## 📱 Browser Compatibility

- ✅ iOS Safari (with permission prompt)
- ✅ Android Chrome
- ✅ Android Firefox
- ⚠️ Desktop browsers (limited motion support)

**Note**: DeviceMotion API requires HTTPS on mobile devices (except localhost).

## 🔒 Security Notes

- SAS tokens are stored in browser memory only (not persisted)
- Use SAS tokens with minimal permissions (Send only)
- Set token expiration to limit exposure
- Consider using Azure Key Vault for production

## 🎯 Use Cases

1. **Conference Demos**: Engage audience by having them shake phones
2. **IoT Training**: Demonstrate real-time data streaming concepts
3. **Power BI Workshops**: Show live dashboard updates
4. **Team Building**: Gamify data collection with shake competitions

## 🤝 Contributing

Contributions welcome! Feel free to:
- Add new telemetry types (orientation, rotation)
- Improve shake detection algorithm
- Add more visualizations
- Enhance mobile UX

## 📝 License

MIT License - feel free to use for demos, workshops, and learning!

## 🙏 Acknowledgments

Built to demonstrate Azure EventHub and Microsoft Fabric EventStream capabilities with real-time mobile telemetry.
