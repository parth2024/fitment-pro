#!/usr/bin/env python3
"""
Test script to verify Azure AI Foundry configuration
Run this script to test your Azure AI setup before using it in the application
"""

import os
import json
from dotenv import load_dotenv
from openai import AzureOpenAI

# Load environment variables
load_dotenv()

def test_azure_ai():
    """Test Azure AI Foundry connection and configuration"""
    
    # Get configuration from environment
    api_key = os.getenv('AZURE_OPENAI_API_KEY', '')
    endpoint = os.getenv('AZURE_OPENAI_ENDPOINT', '')
    api_version = os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview')
    deployment_name = os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-5-mini')
    
    print("🔍 Testing Azure AI Foundry Configuration...")
    print(f"   Endpoint: {endpoint}")
    print(f"   Deployment: {deployment_name}")
    print(f"   API Version: {api_version}")
    print(f"   API Key: {'*' * (len(api_key) - 4) + api_key[-4:] if api_key else 'NOT SET'}")
    print()
    
    # Check if configuration is complete
    if not api_key:
        print("❌ AZURE_OPENAI_API_KEY is not set")
        return False
    
    if not endpoint:
        print("❌ AZURE_OPENAI_ENDPOINT is not set")
        return False
    
    if not deployment_name:
        print("❌ AZURE_OPENAI_DEPLOYMENT_NAME is not set")
        return False
    
    # Test API connection
    try:
        # Initialize Azure OpenAI client
        client = AzureOpenAI(
            api_version=api_version,
            azure_endpoint=endpoint,
            api_key=api_key,
        )
        
        print("🚀 Testing API connection...")
        
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Respond with 'Azure AI Foundry is working correctly!'"
                },
                {
                    "role": "user",
                    "content": "Test connection"
                }
            ],
            max_completion_tokens=50,
            model=deployment_name
        )
        
        if response.choices and len(response.choices) > 0:
            content = response.choices[0].message.content
            print(f"✅ Connection successful!")
            print(f"   Response: {content}")
            return True
        else:
            print("❌ No response from API")
            return False
                    
    except Exception as e:
        print(f"❌ Connection failed: {str(e)}")
        return False

def main():
    """Main test function"""
    print("=" * 60)
    print("🧪 Azure AI Foundry Configuration Test")
    print("=" * 60)
    
    success = test_azure_ai()
    
    print()
    print("=" * 60)
    if success:
        print("🎉 Azure AI Foundry is configured correctly!")
        print("   You can now use the full AI fitment generation.")
    else:
        print("⚠️  Azure AI Foundry configuration needs attention.")
        print("   Please check the setup guide: AZURE_AI_SETUP.md")
    print("=" * 60)

if __name__ == "__main__":
    main()
