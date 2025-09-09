import os
import json
import pandas as pd
from typing import List, Dict, Any
from django.conf import settings
import asyncio
import aiohttp


class AzureAIService:
    def __init__(self):
        self.api_key = getattr(settings, 'AZURE_OPENAI_API_KEY', '')
        self.endpoint = getattr(settings, 'AZURE_OPENAI_ENDPOINT', '')
        self.api_version = getattr(settings, 'AZURE_OPENAI_API_VERSION', '2024-02-15-preview')
        self.deployment_name = getattr(settings, 'AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4')
        self._initialized = bool(self.api_key and self.endpoint)

    async def generate_fitments(
        self, 
        vcdb_data: List[Dict[str, Any]], 
        products_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate fitments using Azure AI Foundry
        """
        if not self._initialized:
            print("Azure AI not configured, using fallback")
            return self._fallback_fitment_generation(vcdb_data, products_data)

        try:
            # Prepare the prompt for AI
            prompt = self._create_fitment_prompt(vcdb_data, products_data)
            
            # Call Azure OpenAI
            async with aiohttp.ClientSession() as session:
                url = f"{self.endpoint}/openai/deployments/{self.deployment_name}/chat/completions?api-version={self.api_version}"
                
                headers = {
                    "Content-Type": "application/json",
                    "api-key": self.api_key
                }
                
                payload = {
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are an expert automotive fitment specialist. Your task is to analyze vehicle data and product data to generate accurate fitment combinations. Return your response as a JSON array of fitment objects."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 4000
                }
                
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        content = result['choices'][0]['message']['content']
                        fitments = self._parse_ai_response(content)
                        return fitments
                    else:
                        print(f"Azure AI API error: {response.status}")
                        return self._fallback_fitment_generation(vcdb_data, products_data)
            
        except Exception as e:
            print(f"Azure AI error: {str(e)}")
            return self._fallback_fitment_generation(vcdb_data, products_data)

    def _create_fitment_prompt(self, vcdb_data: List[Dict], products_data: List[Dict]) -> str:
        """Create a detailed prompt for AI fitment generation"""
        
        # Sample data for context (limit to avoid token limits)
        vcdb_sample = vcdb_data[:5] if len(vcdb_data) > 5 else vcdb_data
        products_sample = products_data[:10] if len(products_data) > 10 else products_data
        
        prompt = f"""
        Analyze the following automotive data and generate fitment combinations:

        VEHICLE DATA (VCDB):
        {json.dumps(vcdb_sample, indent=2)}

        PRODUCT DATA:
        {json.dumps(products_sample, indent=2)}

        TASK:
        Generate fitment combinations by matching products to compatible vehicles based on:
        1. Vehicle specifications (year, make, model, submodel, drive type)
        2. Product compatibility requirements
        3. Common automotive fitment patterns
        4. Industry standards and best practices

        For each fitment, provide:
        - partId: Product identifier
        - partDescription: Product description
        - year: Vehicle year
        - make: Vehicle make
        - model: Vehicle model
        - submodel: Vehicle submodel
        - driveType: Vehicle drive type
        - position: Installation position (Front, Rear, etc.)
        - quantity: Number of parts needed
        - confidence: Confidence score (0.0 to 1.0)
        - ai_reasoning: Brief explanation of why this fitment was suggested

        Return ONLY a JSON array of fitment objects. Limit to the most relevant combinations.
        """
        
        return prompt

    def _parse_ai_response(self, content: str) -> List[Dict[str, Any]]:
        """Parse AI response and extract fitments"""
        try:
            # Try to extract JSON from the response
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            
            fitments = json.loads(content)
            
            # Validate and clean the fitments
            cleaned_fitments = []
            for i, fitment in enumerate(fitments):
                if isinstance(fitment, dict):
                    # Ensure required fields
                    cleaned_fitment = {
                        "partId": fitment.get("partId", ""),
                        "partDescription": fitment.get("partDescription", ""),
                        "year": fitment.get("year", 2020),
                        "make": fitment.get("make", "Unknown"),
                        "model": fitment.get("model", "Unknown"),
                        "submodel": fitment.get("submodel", ""),
                        "driveType": fitment.get("driveType", ""),
                        "position": fitment.get("position", "Front"),
                        "quantity": fitment.get("quantity", 1),
                        "confidence": min(max(fitment.get("confidence", 0.7), 0.0), 1.0),
                        "ai_reasoning": fitment.get("ai_reasoning", "AI-generated fitment")
                    }
                    cleaned_fitments.append(cleaned_fitment)
            
            return cleaned_fitments
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response: {str(e)}")
            return []

    def _fallback_fitment_generation(self, vcdb_data: List[Dict], products_data: List[Dict]) -> List[Dict[str, Any]]:
        """Fallback rule-based fitment generation when AI fails"""
        fitments = []
        
        # Simple matching logic for demonstration
        for i, product in enumerate(products_data[:10]):  # Limit for demo
            for j, vehicle in enumerate(vcdb_data[:5]):  # Limit for demo
                # Generate a fitment with confidence score
                confidence = 0.7 + (i * j * 0.01) % 0.3  # Simulate confidence
                
                fitment = {
                    "partId": product.get("id", f"PART_{i}"),
                    "partDescription": product.get("description", f"Product {i}"),
                    "year": vehicle.get("year", 2020),
                    "make": vehicle.get("make", "Unknown"),
                    "model": vehicle.get("model", "Unknown"),
                    "submodel": vehicle.get("submodel", ""),
                    "driveType": vehicle.get("driveType", ""),
                    "position": "Front",  # Default position
                    "quantity": 1,
                    "confidence": confidence,
                    "ai_reasoning": f"Rule-based match: {product.get('description', 'product')} with {vehicle.get('year', 2020)} {vehicle.get('make', 'Unknown')} {vehicle.get('model', 'Unknown')}"
                }
                fitments.append(fitment)
        
        return fitments


# Global instance
azure_ai_service = AzureAIService()
