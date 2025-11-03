# Azure Deployment Guide

This guide walks you through deploying the EventHub Shaker application to Azure App Service, including both the web app and EventHub infrastructure.

## 📋 Prerequisites

- Azure subscription ([Get a free account](https://azure.microsoft.com/free/))
- Azure CLI installed ([Installation guide](https://docs.microsoft.com/cli/azure/install-azure-cli))
- Git installed
- A GitHub account with access to fork or use this repository

## 🚀 Deploying to Azure App Service

Azure App Service provides production-ready hosting with HTTPS, custom domains, scaling, and integrated authentication. This application is a web application with UI components that requires proper hosting with environment variable support.

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
# Create the web app with Node.js runtime (for serving static content)
az webapp create \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --plan eventhub-shaker-plan \
  --runtime "NODE:18-lts"

# Note: Replace 'eventhub-shaker-app' with a unique name as it must be globally unique
```

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

### Step 6: Configure Environment Variables

The application can optionally use environment variables for default configuration. While the app allows users to configure these values through the UI, you can set defaults using App Settings.

#### Using Azure Portal:

1. Navigate to your App Service in Azure Portal
2. Go to **Settings** → **Configuration** → **Application settings**
3. Click **+ New application setting** and add:
   - **Name**: `SAS_KEY`
   - **Value**: Your EventHub SAS token (starts with `SharedAccessSignature sr=...`)
4. Click **+ New application setting** again:
   - **Name**: `EVENTSTREAM_CONNECTION`
   - **Value**: Your EventHub URL (e.g., `https://[namespace].servicebus.windows.net/[eventhub-name]`)
5. Click **Save** at the top

#### Using Azure CLI:

```bash
# Set SAS_KEY environment variable
az webapp config appsettings set \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --settings SAS_KEY="SharedAccessSignature sr=..."

# Set EVENTSTREAM_CONNECTION environment variable
az webapp config appsettings set \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --settings EVENTSTREAM_CONNECTION="https://[namespace].servicebus.windows.net/[eventhub-name]"

# View all configured settings
az webapp config appsettings list \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --output table
```

**Note:** These environment variables are optional. Users can still enter their own EventHub credentials through the web UI when using the application.

### Step 7: Access Your App

```bash
# Get the URL of your deployed app
az webapp show \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --query "defaultHostName" \
  --output tsv
```

Your app will be available at: `https://eventhub-shaker-app.azurewebsites.net`

### Step 8: Configure Custom Domain (Optional)

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

You can generate a complete SAS token using Azure Portal:
1. Go to your EventHub → Shared access policies → SendPolicy
2. Copy the **Primary key** value - this is what you'll use as the SAS_KEY

### Step 6: Configure Web App with EventHub Settings

Now that you have your EventHub details, configure them in your web app:

#### Using Azure Portal:
1. Go to your App Service → Configuration → Application settings
2. Add `SAS_KEY` with your SAS token
3. Add `EVENTSTREAM_CONNECTION` with your EventHub URL
4. Save changes

#### Using Azure CLI:
```bash
# Set both environment variables at once
az webapp config appsettings set \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --settings \
    EVENTSTREAM_CONNECTION="https://shake-telemetry-ns.servicebus.windows.net/phone-shakes" \
    SAS_KEY="SharedAccessSignature sr=..."
```

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

### Environment Variables Not Working
```bash
# Verify environment variables are set
az webapp config appsettings list \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --output table

# Restart the web app after changing settings
az webapp restart \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg
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
- [ ] Create EventHub namespace
- [ ] Create event hub
- [ ] Generate SAS token with Send permissions
- [ ] Configure environment variables (SAS_KEY, EVENTSTREAM_CONNECTION) in App Service
- [ ] Test the web app with EventHub credentials
- [ ] Set up Power BI connection (optional)
- [ ] Configure real-time dashboard (optional)
- [ ] Set up monitoring and alerts (optional)
- [ ] Configure custom domain (optional)

---

**Need help?** Check the [README.md](README.md) for usage instructions or [QUICKSTART.md](QUICKSTART.md) for a quick getting started guide.
