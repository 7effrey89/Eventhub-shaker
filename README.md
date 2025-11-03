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
   - **EventHub URL**: Paste the EventHub-compatible endpoint from Azure EventHub or Microsoft Fabric EventStream
     - Azure EventHub format: `https://[namespace].servicebus.windows.net/[eventhub-name]`
     - EventStream format: `https://eventhouse-[xyz].servicebus.windows.net/es_[stream-name]`
   - **SAS Token**: Paste the SAS Key from the "SAS Key Authentication" tab (starts with "SharedAccessSignature sr=...")
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

#### Option 2: Deploy to Azure App Service
For production deployment with HTTPS, scalability, custom domains, and integration with Azure services:

📘 **See [AZURE_DEPLOYMENT.md](AZURE_DEPLOYMENT.md) for complete deployment guide**

Azure App Service provides:
- Production-ready hosting with HTTPS
- Custom domain support with SSL
- Integrated deployment from GitHub
- Environment variable configuration for secure credential storage
- Scaling and performance monitoring
- Integration with Azure services

The deployment guide includes:
- Complete Azure CLI setup instructions
- Steps for creating resource group, plan, and web app
- GitHub deployment configuration
- Environment variable setup (SAS_KEY, EVENTSTREAM_CONNECTION)
- EventHub infrastructure configuration
- Power BI connection setup
- Security best practices
- Cost estimation (~$23/month for production, ~$10/month for dev)

## 📊 Setup Microsoft Fabric EventStream

### Step 1: Create EventStream
1. Go to [Microsoft Fabric Portal](https://app.fabric.microsoft.com)
2. Navigate to **Real-Time Intelligence** workload
3. Click **New** → **Eventstream**
4. Name it (e.g., "Phone-Shake-Stream")

### Step 2: Configure Custom Endpoint
1. In your EventStream, add a source → **Custom App**
2. Go to the **Keys** section
3. Click on the **SAS Key Authentication** tab
4. Copy the **Event Hub compatible endpoint** URL
   - Format: `https://eventhouse-[xyz].servicebus.windows.net/es_[stream-name]`
   - Example: `https://eventhouse-abc123.servicebus.windows.net/es_phone-shake-stream`
5. Copy the **SAS Key** value (starts with `SharedAccessSignature sr=...`)
   - Example: `SharedAccessSignature sr=eventhouse-abc123.servicebus.windows.net&sig=...&se=1234567890&skn=KeyName`
6. Use these values in the web app configuration form

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
