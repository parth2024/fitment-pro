# Azure AI Foundry Setup Guide

## Prerequisites

1. Azure subscription
2. Azure AI Foundry project created
3. OpenAI model deployed in Azure AI Foundry

## Step 1: Create Azure AI Foundry Project

1. Go to [Azure AI Foundry Portal](https://ai.azure.com/)
2. Sign in with your Azure account
3. Create a new project or select existing one
4. Note down your project details

## Step 2: Deploy OpenAI Model

1. In your Azure AI Foundry project, go to "Models" section
2. Deploy a GPT-4 or GPT-3.5-turbo model
3. Note down the deployment name (e.g., "gpt-4", "gpt-35-turbo")

## Step 3: Get API Credentials

1. Go to "Keys and Endpoint" in your project
2. Copy the following values:
   - **API Key**: Your primary or secondary key
   - **Endpoint**: Your Azure AI Foundry endpoint URL
   - **API Version**: Usually "2024-02-15-preview" or "2024-06-01"

## Step 4: Configure Environment Variables

Create a `.env` file in the project root with:

```bash
# Azure AI Foundry Configuration
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-project-name.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name_here
```

## Step 5: Test Configuration

1. Restart your Django server
2. Try uploading files and generating AI fitments
3. Check the terminal - you should see "Azure AI configured" instead of "Azure AI not configured, using fallback"

## Example Configuration

```bash
AZURE_OPENAI_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
AZURE_OPENAI_ENDPOINT=https://my-fitment-ai.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

## Troubleshooting

### Common Issues:

1. **Invalid API Key**: Make sure you copied the correct key from Azure portal
2. **Wrong Endpoint**: Ensure the endpoint URL is correct and includes the protocol (https://)
3. **Deployment Not Found**: Verify the deployment name matches exactly
4. **API Version**: Use the supported API version for your deployment

### Testing Connection:

You can test the connection by running:

```bash
curl -X POST "https://your-endpoint.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-15-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

## Benefits of Azure AI Foundry

- **Enterprise Security**: Built-in security and compliance features
- **Scalability**: Automatic scaling based on demand
- **Cost Management**: Pay-per-use pricing model
- **Integration**: Easy integration with other Azure services
- **Monitoring**: Built-in monitoring and analytics
