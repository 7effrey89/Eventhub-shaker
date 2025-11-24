# EventHub Shaker (C# Minimal API)

Collect phone shake telemetry in a mobile browser and stream events to Azure Event Hub (or Fabric Eventstream with Event Hub–compatible connection string) using the .NET 8 `EventHubProducerClient` SDK.
<img width="662" height="731" alt="image" src="https://github.com/user-attachments/assets/8e6e6e4b-72b6-4029-b0e8-dae8b11a75b0" />

## Features
- **Real-time Shake Detection**: Captures phone accelerometer data to detect shake gestures
- **Simulated Events**: Test button for simulated shake events without motion sensor
- **Custom Connection Strings**: Override Event Hub connection via settings dialog
- **QR Code Sharing**: Generate QR codes with embedded connection strings for easy team sharing
- **Browser Storage**: Custom connection strings cached in localStorage
- **URL Parameters**: Share configuration via encoded URL parameters

## Architecture
- Frontend: `wwwroot` (JavaScript) captures real accelerometer data or sends simulated shakes.
- Backend: Minimal API (`Program.cs`) batches single JSON events to Event Hub.
- Config: Environment variables first; if missing, hard-coded fallback in `Program.cs` (demo only).

## Connection details from Microsoft Fabric Eventstream
1. Create an Eventstream in Fabric.
2. Choose Custom endpoint with Event Hub compatible API.
3. For the Source 
3. For the Destination of the eventstream, choose to create a new table (e.g. shakertable - do not use names with hyphen shakertable-001) in an already created Eventhouse
4. Publish
5. Once published get the connection details
6. Click on the source of the eventstream
7. In the bottom section of the source, choose the protocol: Event Hub
8. Sas Key Authentication: Note down the 'Event Hub Name' and the 'Connection string-primary key' for later usag

## Connection String 
At startup the app checks (first non-empty wins):
1. `EVENTHUB__CONNECTIONSTRING`
If the chosen connection string does NOT contain `EntityPath=`, it then looks for hub name via:
1. `EVENTHUB__NAME`
If still missing, it uses the hard-coded fallback values. When `EntityPath=` is embedded, the name variable is ignored.

## Event Payload Schema (sent to Event Hub)
```json
{
  "timestamp": "2024-11-02T23:45:00.000Z",
  "userName": "Jane",
  "eventType": "shake",
  "acceleration": { "x": 2.45, "y": -3.21, "z": 9.81, "magnitude": 10.75 },
  "deltaAcceleration": { "x": 1.23, "y": -2.15, "z": 0.45, "magnitude": 2.56 },
  "shakeIntensity": "high",
  "serverTimestamp": "2024-11-02T23:45:00.120Z",
  "accelerationValue": 10.75,
  "deltaAccelerationValue": 2.56
}
```
`accelerationValue` and `deltaAccelerationValue` duplicate the magnitude fields for simpler querying.

## Local Run
1. Install .NET 8 SDK.
2. Set env vars (preferred):
```bash
set EVENTHUB__CONNECTIONSTRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=SendPolicy;SharedAccessKey=<KEY>;EntityPath=<EventHubNameInEventStreamSourceSasKeyAuthentication>
# OR without EntityPath (which will be the default from connection string primary key):
set EVENTHUB__CONNECTIONSTRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=SendPolicy;SharedAccessKey=<KEY>
set EVENTHUB__NAME=<EventHubNameInEventStreamSourceSasKeyAuthentication>
```
3. Run:
```bash
dotnet run
```
4. Open http://localhost:5000 on a phone → enter name → Start.

User-secrets alternative (Development only):
```bash
dotnet user-secrets init
dotnet user-secrets set "EventHub:ConnectionString" "Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=SendPolicy;SharedAccessKey=<KEY>;EntityPath=<EventHubNameInEventStreamSourceSasKeyAuthentication>"
```

## Using Custom Connection Strings

### Settings Dialog
1. Click the ⚙️ settings button in the top-right corner
2. Enter your Event Hub connection string (must include `EntityPath=`)
3. Click "Apply Connection" - validates the connection before saving
4. Connection string is cached in browser localStorage

### Sharing Configuration via QR Code
1. Open settings and apply a custom connection string
2. A QR code is automatically generated
3. Other users can scan the QR code with their phone camera
4. The app opens with the connection string automatically applied
5. The connection string is base64-encoded in the URL for basic obfuscation

### Sharing via URL
- Copy the generated share URL from the settings dialog
- Share via email, chat, or other communication channels
- Anyone opening the link gets the connection string auto-applied
- Format: `https://yourapp.com/?conn=<base64-encoded-connection-string>`

### Reverting to Default
- Click "Revert to Default" in settings to clear custom connection
- Returns to using the server's configured connection string

# Deploy

## Deploy (Option 1: Zip Deploy from VS Code to Azure App Service Linux)
Provision resources:
```bash
# Login to Azure
az login

az group create -n shaker-rg -l swedencentral
az appservice plan create -n shaker-plan -g shaker-rg --sku B1 --is-linux
az webapp create -n shaker-web -g shaker-rg -p shaker-plan --runtime "DOTNETCORE:8.0"
```
Configure application settings:
```bash
az webapp config appsettings set -n shaker-web -g shaker-rg --settings \
  EVENTHUB__CONNECTIONSTRING="Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=SendPolicy;SharedAccessKey=<KEY>;EntityPath=<EventHubNameInEventStreamSourceSasKeyAuthentication>"
# If no EntityPath in connection string:
az webapp config appsettings set -n shaker-web -g shaker-rg --settings EVENTHUB__NAME=<EventHubNameInEventStreamSourceSasKeyAuthentication>
```
Publish and package:
```bash
dotnet publish EventhubShaker.csproj -c Release -o publish
cd publish
# Linux/macOS:
zip -r app.zip .
# Windows PowerShell:
Compress-Archive -Path * -DestinationPath app.zip
```
Deploy zip:
```bash
az webapp deployment source config-zip -n shaker-web -g shaker-rg --src app.zip
```
Test:
```bash
# Linux/macOS/Git Bash:
curl https://shaker-web.azurewebsites.net/api/config-status
curl -X POST https://shaker-web.azurewebsites.net/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{"timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","userName":"Test","eventType":"shake","acceleration":{"x":1,"y":2,"z":3,"magnitude":3.74},"deltaAcceleration":{"x":0.5,"y":0.2,"z":0.1,"magnitude":0.55},"shakeIntensity":"low"}'

# Windows PowerShell:
curl https://shaker-web.azurewebsites.net/api/config-status
$timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ" -AsUTC)
curl -X POST https://shaker-web.azurewebsites.net/api/telemetry -H "Content-Type: application/json" -d "{`"timestamp`":`"$timestamp`",`"userName`":`"Test`",`"eventType`":`"shake`",`"acceleration`":{`"x`":1,`"y`":2,`"z`":3,`"magnitude`":3.74},`"deltaAcceleration`":{`"x`":0.5,`"y`":0.2,`"z`":0.1,`"magnitude`":0.55},`"shakeIntensity`":`"low`"}"
```
## Change Eventhub hub endpoint in app

### Method 1: Azure Portal (Server-wide Default)
You can change the default Event Hub connection for all users:
1. Go to the web app in the Azure portal
2. Navigate to "Settings" → "Environment Variables"
3. Replace the value for `EVENTHUB__CONNECTIONSTRING` with another connection string
4. Restart the app service

### Method 2: Settings Dialog (Per-user Override)
Individual users can override the connection string:
1. Click the ⚙️ settings button
2. Enter a custom Event Hub connection string
3. Click "Apply Connection" to validate and save
4. The custom connection is cached in the browser and used for all events
5. Share the configuration with teammates via QR code or URL

## API Endpoints

### `/api/telemetry` (POST)
Send telemetry using the default server connection string.

### `/api/telemetry-custom` (POST)
Send telemetry or validate a custom connection string.
- **Validation mode**: Send `{ "connectionString": "...", "telemetry": null }`
- **Send mode**: Send `{ "connectionString": "...", "telemetry": { ... } }`

### `/api/config-status` (GET)
Check server configuration status.

## Features: Simulated Events
Button produces `eventType = simulated-shake`.

# Other

## Power BI / KQL Ideas
- Line chart: accelerationValue over time.
- Bar chart: shakes per userName.
- Gauge: deltaAccelerationValue latest.
- Table: recent events (intensity, timestamp).

## Evenstream
## KQL demo
<img width="1319" height="561" alt="image" src="https://github.com/user-attachments/assets/4f77c0d0-440d-40af-95a3-b87772bacb09" />
Insert below kql script into a kql queryset and execute the code (adjust the tablename as appropriate - in this example it's called shakertable). this will show a graph of all the data in the eventhouse

```KQL
shakertable
| extend timestamp_dt = todatetime(timestamp)
| project timestamp_dt, accelerationValue, userName
| render timechart 
    with (
        title="Acceleration Value Over Time by User",
        xtitle="Timestamp",
        ytitle="Acceleration Value",
        ysplit=none,
        xcolumn=timestamp_dt,
        ycolumns=accelerationValue,
        series=userName
    )
```
Or if you need a less history in graph

<img width="625" height="402" alt="image" src="https://github.com/user-attachments/assets/05f31ab1-54eb-489e-8c02-4cae12a9b5d0" />

```KQL
shakertable
| extend timestamp_dt = todatetime(timestamp)
| project timestamp_dt, accelerationValue, userName
| order by timestamp_dt desc
| top 20 by timestamp_dt
| render timechart 
    with (
        title="Acceleration Value Over Time by User",
        xtitle="Timestamp",
        ytitle="Acceleration Value",
        ysplit=none,
        xcolumn=timestamp_dt,
        ycolumns=accelerationValue,
        series=userName
    )
```

Or if you want to aggregate the values by name - so the more they shake the taller the vertical bars on the graph
<img width="756" height="437" alt="image" src="https://github.com/user-attachments/assets/36b474b1-8456-4445-b90d-282336481295" />

```KQL
shakertable
| summarize totalDeltaAcceleration = sum(toint(deltaAccelerationValue)) by userName
| sort by totalDeltaAcceleration desc
| render columnchart
```

## Interesting facts:
- Why is the magnitude around ~9.79 m/s² When the Device is Still?
- This is Earth's gravitational acceleration!
- Gravity Constant: Earth's gravitational acceleration is approximately 9.81 m/s² (or 9.8 m/s² as commonly rounded)

## Security Considerations
- **URL Encoding**: Connection strings in URLs are base64-encoded (obfuscation, not encryption)
- **Browser Storage**: Custom connections stored in localStorage are accessible to JavaScript
- **Production Use**: For production, consider using Azure Key Vault or managed identities
- **Sharing**: QR codes and share URLs contain sensitive credentials - share only with trusted team members
- **Validation**: All custom connection strings are validated before use
