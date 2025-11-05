# EventHub Shaker (C# Minimal API)

Collect phone shake telemetry in a mobile browser and stream events to Azure Event Hub (or Eventstream with Event Hub–compatible connection string) using the .NET 8 `EventHubProducerClient` SDK.
<img width="662" height="731" alt="image" src="https://github.com/user-attachments/assets/8e6e6e4b-72b6-4029-b0e8-dae8b11a75b0" />

## Architecture
- Frontend: `wwwroot` (JavaScript) captures real accelerometer data or sends simulated shakes.
- Backend: Minimal API (`Program.cs`) batches single JSON events to Event Hub.
- Config: Environment variables first; if missing, hard-coded fallback in `Program.cs` (demo only).

## Connection details from Microsoft Fabric Eventstream
1. Create an Eventstream in Fabric.
2. Choose Custom endpoint with Event Hub compatible API.
3. For the Source 
3. For the Destination of the eventstream, choose to create a new table in an already created Eventhouse
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
## Features: Simulated Events
Button produces `eventType = simulated-shake`.

# Other

## Power BI / KQL Ideas
- Line chart: accelerationValue over time.
- Bar chart: shakes per userName.
- Gauge: deltaAccelerationValue latest.
- Table: recent events (intensity, timestamp).

## Interesting facts:
- Why is the magnitude around ~9.79 m/s² When the Device is Still?
- This is Earth's gravitational acceleration!
- Gravity Constant: Earth's gravitational acceleration is approximately 9.81 m/s² (or 9.8 m/s² as commonly rounded)
