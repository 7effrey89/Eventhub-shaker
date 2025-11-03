# Azure Deployment Guide

This guide walks you through deploying the EventHub Shaker application to Azure App Service, including both the web app and EventHub infrastructure.

## 📋 Prerequisites

- Azure subscription ([Get a free account](https://azure.microsoft.com/free/))
- Azure CLI installed ([Installation guide](https://docs.microsoft.com/cli/azure/install-azure-cli))
- Git installed
- A GitHub account with access to fork or use this repository

## 🚀 Deploying to Azure App Service

Azure App Service provides production-ready hosting with HTTPS, custom domains, scaling, and integrated authentication. This is a client-side web application with UI components that can be hosted on Azure App Service for production use.

### Step 1: Login and Set Subscription

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "Your-Subscription-Name"
```

### Step 2: Create Resource Group

```bash
# Create a resource group
az group create \
  --name eventhub-shaker-rg \
  --location eastus
```

### Step 3: Create App Service Plan

```bash
# Create an App Service plan (B1 tier recommended for production)
az appservice plan create \
  --name eventhub-shaker-plan \
  --resource-group eventhub-shaker-rg \
  --sku B1 \
  --is-linux

# For development/testing, you can use Free tier (F1):
# az appservice plan create \
#   --name eventhub-shaker-plan \
#   --resource-group eventhub-shaker-rg \
#   --sku F1 \
#   --is-linux
```

### Step 4: Create Web App

```bash
# Create the web app with Node.js runtime for hosting the application
az webapp create \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --plan eventhub-shaker-plan \
  --runtime "NODE:18-lts"

# Note: Replace 'eventhub-shaker-app' with a unique name as it must be globally unique
```

**Important:** After creating the web app, you'll need to configure it to serve static files. The simplest approach is to ensure your repository includes a basic Node.js server or use the default static file serving provided by Azure App Service.

### Step 5: Configure Deployment from GitHub

#### Option A: Using GitHub Actions (Recommended)

```bash
# Configure GitHub Actions deployment
az webapp deployment github-actions add \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --repo "YOUR-USERNAME/Eventhub-shaker" \
  --branch main \
  --login-with-github

# This will create a GitHub Actions workflow in your repository
```

#### Option B: Using Manual Git Deployment

```bash
# Get deployment credentials
az webapp deployment source config-local-git \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg

# Get the Git URL (it will be displayed in the output)
# Then push your code:
# git remote add azure <git-url>
# git push azure main
```

### Step 6: Access Your App

```bash
# Get the URL of your deployed app
az webapp show \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --query "defaultHostName" \
  --output tsv
```

Your app will be available at: `https://[your-app-name].azurewebsites.net` (replace `[your-app-name]` with the actual name you used in Step 4)

**Note:** This is a client-side web application. Users will configure their EventHub credentials (URL and SAS token) directly through the web UI after accessing the application. The credentials are stored in browser memory only and are not persisted.

### Step 7: Configure Custom Domain (Optional)

```bash
# Add a custom domain
az webapp config hostname add \
  --webapp-name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --hostname www.yourdomain.com

# Enable HTTPS
az webapp update \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --https-only true
```

---

## 🔧 Setup Azure EventHub

After deploying the web app, you need to set up the EventHub infrastructure to receive telemetry data.

### Step 1: Create EventHub Namespace

```bash
# Create EventHub namespace (Basic tier)
az eventhubs namespace create \
  --name shake-telemetry-ns \
  --resource-group eventhub-shaker-rg \
  --location eastus \
  --sku Basic
```

### Step 2: Create Event Hub

```bash
# Create the event hub
az eventhubs eventhub create \
  --name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group eventhub-shaker-rg \
  --partition-count 2 \
  --message-retention 1
```

### Step 3: Create SAS Policy

```bash
# Create an authorization rule with Send permission
az eventhubs eventhub authorization-rule create \
  --name SendPolicy \
  --eventhub-name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group eventhub-shaker-rg \
  --rights Send
```

### Step 4: Get Connection Details

```bash
# Get the connection string and SAS key
az eventhubs eventhub authorization-rule keys list \
  --name SendPolicy \
  --eventhub-name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group eventhub-shaker-rg \
  --output json
```

The output will contain:
```json
{
  "primaryConnectionString": "Endpoint=sb://shake-telemetry-ns.servicebus.windows.net/;SharedAccessKeyName=SendPolicy;SharedAccessKey=...;EntityPath=phone-shakes",
  "primaryKey": "...",
  "keyName": "SendPolicy"
}
```

### Step 5: Extract Configuration Values

From the connection details, extract:

**EventHub URL (EVENTSTREAM_CONNECTION):**
```
https://shake-telemetry-ns.servicebus.windows.net/phone-shakes
```

**SAS Key (SAS_KEY):**
Get the full SAS token signature:
```bash
# Get the primary key
az eventhubs eventhub authorization-rule keys list \
  --name SendPolicy \
  --eventhub-name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group eventhub-shaker-rg \
  --query "primaryKey" \
  --output tsv
```

The SAS token format should be:
```
SharedAccessSignature sr=https%3A%2F%2Fshake-telemetry-ns.servicebus.windows.net%2Fphone-shakes&sig=<signature>&se=<expiry>&skn=SendPolicy
```

**For the web application:**
1. The EventHub URL will be: `https://shake-telemetry-ns.servicebus.windows.net/phone-shakes`
2. The SAS token can be obtained from Azure Portal:
   - Go to your EventHub → Shared access policies → SendPolicy
   - Copy the **Connection string–primary key** value
   - Extract the SAS token portion or generate a full SAS token using Azure Portal's "Generate SAS token" feature

Users will enter these values (EventHub URL and SAS token) directly into the web application's configuration form when they first access the app.

---

## 📊 Connect to Power BI

### Step 1: Add EventHub as Data Source

1. Open Power BI Desktop
2. Click **Get Data** → **More**
3. Search for **Azure Event Hubs**
4. Enter your EventHub connection details:
   - **Event Hub namespace**: `shake-telemetry-ns.servicebus.windows.net`
   - **Event Hub name**: `phone-shakes`
   - **Policy name**: `SendPolicy` (or use a Read policy)

### Step 2: Configure Real-Time Dashboard

1. Create a new report
2. Add visuals:
   - **Line chart**: acceleration.magnitude over timestamp
   - **Card**: COUNT of shakes
   - **Table**: Recent events with userName and shakeIntensity
   - **Gauge**: Latest acceleration.magnitude (0-20 range)

### Step 3: Publish to Power BI Service

1. Click **Publish** in Power BI Desktop
2. Select workspace
3. Enable **Automatic page refresh** for real-time updates

---

## 🔒 Security Best Practices

### Configure CORS (If needed)

```bash
# Configure CORS on the web app
az webapp cors add \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --allowed-origins "https://yourdomain.com"
```

### Use Managed Identity (Advanced)

For production, consider using Azure Managed Identity instead of SAS tokens:

```bash
# Enable system-assigned identity
az webapp identity assign \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg

# Grant EventHub permissions
az role assignment create \
  --assignee <managed-identity-id> \
  --role "Azure Event Hubs Data Sender" \
  --scope /subscriptions/<subscription-id>/resourceGroups/eventhub-shaker-rg/providers/Microsoft.EventHub/namespaces/shake-telemetry-ns
```

### Set Token Expiration

Generate SAS tokens with appropriate expiration:

```bash
# Generate token that expires in 7 days
EXPIRY=$(date -u -d "+7 days" '+%s')
echo $EXPIRY
```

---

## 💰 Cost Estimation

**Azure App Service (B1 Basic tier):**
- App Service: ~$13/month
- 100 GB bandwidth included
- Custom domains and SSL: Free

**Azure App Service (F1 Free tier):**
- Hosting: Free
- 1 GB bandwidth/day
- 60 CPU minutes/day
- No custom domain SSL
- Suitable for development/testing

**EventHub Basic:**
- ~$10/month (1 throughput unit)
- 1M events included

**Total estimated cost:**
- Production (B1): ~$23/month
- Development (F1): ~$10/month

---

## 🧹 Cleanup Resources

To avoid charges, delete all resources when done:

```bash
# Delete the entire resource group
az group delete \
  --name eventhub-shaker-rg \
  --yes \
  --no-wait
```

---

## 🐛 Troubleshooting

### Web App Not Loading
```bash
# Check web app status
az webapp show \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --query "state"

# View application logs
az webapp log tail \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg

# Check deployment status
az webapp deployment list \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg
```

### Static File Serving Issues
If your web app doesn't display correctly, you may need to add a simple Node.js server. Create a `server.js` file in your repository:

```javascript
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve index.html for the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

And update your `package.json`:
```json
{
  "name": "eventhub-shaker",
  "version": "1.0.0",
  "description": "EventHub Shaker Application",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

### EventHub Connection Issues
```bash
# Verify EventHub is running
az eventhubs namespace show \
  --name shake-telemetry-ns \
  --resource-group eventhub-shaker-rg \
  --query "status"

# Test connection with Azure Portal Event Hub Explorer
```

### HTTPS Required Error
- Ensure you're accessing the app via HTTPS
- For testing, use `localhost` which doesn't require HTTPS

---

## 📚 Additional Resources

- [Azure App Service Documentation](https://docs.microsoft.com/azure/app-service/)
- [Azure Event Hubs Documentation](https://docs.microsoft.com/azure/event-hubs/)
- [Power BI Real-Time Streaming](https://docs.microsoft.com/power-bi/connect-data/service-real-time-streaming)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/)
- [Deploy to Azure App Service](https://docs.microsoft.com/azure/app-service/quickstart-nodejs)

---

## ✅ Quick Deployment Checklist

- [ ] Install Azure CLI and login
- [ ] Create Azure resource group
- [ ] Create App Service plan
- [ ] Create web app with Node.js runtime
- [ ] Configure deployment from GitHub (Actions or manual Git)
- [ ] Optionally add server.js for static file serving
- [ ] Create EventHub namespace
- [ ] Create event hub
- [ ] Generate SAS policy with Send permissions
- [ ] Get EventHub URL and SAS token for user configuration
- [ ] Test the web app and configure EventHub credentials through the UI
- [ ] Set up Power BI connection (optional)
- [ ] Configure real-time dashboard (optional)
- [ ] Set up monitoring and alerts (optional)
- [ ] Configure custom domain (optional)

---

**Need help?** Check the [README.md](README.md) for usage instructions or [QUICKSTART.md](QUICKSTART.md) for a quick getting started guide.
