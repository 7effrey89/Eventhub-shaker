# Azure Deployment Guide

This guide walks you through deploying the EventHub Shaker application to Azure, including both the web app and EventHub infrastructure.

## 📋 Prerequisites

- Azure subscription ([Get a free account](https://azure.microsoft.com/free/))
- Azure CLI installed ([Installation guide](https://docs.microsoft.com/cli/azure/install-azure-cli))
- Git installed

## 🚀 Deployment Options

### Option 1: Azure Static Web Apps (Recommended)

Azure Static Web Apps provides free hosting with HTTPS, perfect for this application.

#### Step 1: Create the Static Web App

```bash
# Login to Azure
az login

# Set your subscription (if you have multiple)
az account set --subscription "Your-Subscription-Name"

# Create a resource group
az group create \
  --name eventhub-shaker-rg \
  --location eastus

# Create the static web app
az staticwebapp create \
  --name eventhub-shaker \
  --resource-group eventhub-shaker-rg \
  --source https://github.com/YOUR-USERNAME/Eventhub-shaker \
  --location eastus2 \
  --branch main \
  --app-location "/" \
  --login-with-github
```

#### Step 2: Get the Deployment URL

```bash
# Get the URL of your deployed app
az staticwebapp show \
  --name eventhub-shaker \
  --resource-group eventhub-shaker-rg \
  --query "defaultHostname" \
  --output tsv
```

Your app will be available at: `https://[random-name].azurestaticapps.net`

#### Step 3: Configure Custom Domain (Optional)

```bash
# Add a custom domain
az staticwebapp hostname set \
  --name eventhub-shaker \
  --resource-group eventhub-shaker-rg \
  --hostname www.yourdomain.com
```

---

### Option 2: Azure App Service

For more control and customization options.

#### Step 1: Create App Service Plan

```bash
# Create a resource group
az group create \
  --name eventhub-shaker-rg \
  --location eastus

# Create an App Service plan (Free tier)
az appservice plan create \
  --name eventhub-shaker-plan \
  --resource-group eventhub-shaker-rg \
  --sku FREE \
  --is-linux
```

#### Step 2: Create Web App

```bash
# Create the web app
az webapp create \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --plan eventhub-shaker-plan \
  --runtime "NODE:18-lts"
```

#### Step 3: Deploy from GitHub

```bash
# Configure GitHub deployment
az webapp deployment source config \
  --name eventhub-shaker-app \
  --resource-group eventhub-shaker-rg \
  --repo-url https://github.com/YOUR-USERNAME/Eventhub-shaker \
  --branch main \
  --manual-integration
```

#### Step 4: Access Your App

Your app will be available at: `https://eventhub-shaker-app.azurewebsites.net`

---

### Option 3: Azure Blob Storage (Static Website)

Most cost-effective option for static content.

#### Step 1: Create Storage Account

```bash
# Create a resource group
az group create \
  --name eventhub-shaker-rg \
  --location eastus

# Create a storage account
az storage account create \
  --name eventhubshaker \
  --resource-group eventhub-shaker-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2
```

#### Step 2: Enable Static Website Hosting

```bash
# Enable static website hosting
az storage blob service-properties update \
  --account-name eventhubshaker \
  --static-website \
  --index-document index.html
```

#### Step 3: Upload Files

```bash
# Get the storage account key
STORAGE_KEY=$(az storage account keys list \
  --account-name eventhubshaker \
  --resource-group eventhub-shaker-rg \
  --query "[0].value" \
  --output tsv)

# Upload files to $web container
az storage blob upload-batch \
  --account-name eventhubshaker \
  --account-key $STORAGE_KEY \
  --destination '$web' \
  --source ./ \
  --pattern "*.html" \
  --pattern "*.js" \
  --pattern "*.css"
```

#### Step 4: Get the Website URL

```bash
# Get the static website URL
az storage account show \
  --name eventhubshaker \
  --resource-group eventhub-shaker-rg \
  --query "primaryEndpoints.web" \
  --output tsv
```

Your app will be available at: `https://eventhubshaker.z13.web.core.windows.net/`

---

## 🔧 Setup Azure EventHub

After deploying the web app, you need to set up the EventHub infrastructure.

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
# Get the connection string
az eventhubs eventhub authorization-rule keys list \
  --name SendPolicy \
  --eventhub-name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group eventhub-shaker-rg \
  --query "primaryConnectionString" \
  --output tsv
```

The output will look like:
```
Endpoint=sb://shake-telemetry-ns.servicebus.windows.net/;SharedAccessKeyName=SendPolicy;SharedAccessKey=...;EntityPath=phone-shakes
```

### Step 5: Extract URL and SAS Token

From the connection string, you need:

**EventHub URL:**
```
https://shake-telemetry-ns.servicebus.windows.net/phone-shakes
```

**SAS Token** (generate using the key):
```bash
# Or generate a SAS token directly (expires in 24 hours)
az eventhubs eventhub authorization-rule keys list \
  --name SendPolicy \
  --eventhub-name phone-shakes \
  --namespace-name shake-telemetry-ns \
  --resource-group eventhub-shaker-rg \
  --query "primaryKey" \
  --output tsv
```

Then create a SAS token using the format:
```
SharedAccessSignature sr=https%3A%2F%2Fshake-telemetry-ns.servicebus.windows.net%2Fphone-shakes&sig=<signature>&se=<expiry>&skn=SendPolicy
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

**Static Web App (Free tier):**
- Hosting: Free
- Bandwidth: 100 GB/month free
- Custom domains: Free

**EventHub Basic:**
- ~$10/month (1 throughput unit)
- 1M events included

**Total estimated cost:** ~$10/month

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
# Check deployment status
az staticwebapp show \
  --name eventhub-shaker \
  --resource-group eventhub-shaker-rg

# View logs
az webapp log tail \
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

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/azure/static-web-apps/)
- [Azure Event Hubs Documentation](https://docs.microsoft.com/azure/event-hubs/)
- [Power BI Real-Time Streaming](https://docs.microsoft.com/power-bi/connect-data/service-real-time-streaming)
- [Azure CLI Reference](https://docs.microsoft.com/cli/azure/)

---

## ✅ Quick Deployment Checklist

- [ ] Create Azure resource group
- [ ] Deploy web app (Static Web App, App Service, or Blob Storage)
- [ ] Create EventHub namespace
- [ ] Create event hub
- [ ] Generate SAS token with Send permissions
- [ ] Test the web app with EventHub credentials
- [ ] Set up Power BI connection
- [ ] Configure real-time dashboard
- [ ] Set up monitoring and alerts (optional)
- [ ] Configure custom domain (optional)

---

**Need help?** Check the [README.md](README.md) for usage instructions or [QUICKSTART.md](QUICKSTART.md) for a quick getting started guide.
