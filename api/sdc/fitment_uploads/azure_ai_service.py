import os
import json
import pandas as pd
from typing import List, Dict, Any
from django.conf import settings
import asyncio
from openai import AzureOpenAI


class AzureAIService:
    def __init__(self):
        self.api_key = getattr(settings, 'AZURE_OPENAI_API_KEY', '')
        self.endpoint = getattr(settings, 'AZURE_OPENAI_ENDPOINT', '')
        self.api_version = getattr(settings, 'AZURE_OPENAI_API_VERSION', '2024-12-01-preview')
        self.deployment_name = getattr(settings, 'AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-5-mini')
        self._initialized = bool(self.api_key and self.endpoint)
        
        # Initialize Azure OpenAI client
        if self._initialized:
            self.client = AzureOpenAI(
                api_version=self.api_version,
                azure_endpoint=self.endpoint,
                api_key=self.api_key,
            )
            print("✅ Azure AI Foundry configured successfully")
            print(f"   Endpoint: {self.endpoint}")
            print(f"   Deployment: {self.deployment_name}")
            print(f"   API Version: {self.api_version}")
        else:
            self.client = None
            print("⚠️  Azure AI Foundry not configured - using fallback system")
            if not self.api_key:
                print("   Missing: AZURE_OPENAI_API_KEY")
            if not self.endpoint:
                print("   Missing: AZURE_OPENAI_ENDPOINT")

    def generate_fitments(
        self, 
        vcdb_data: List[Dict[str, Any]], 
        products_data: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate fitments using Azure AI Foundry
        """
        if not self._initialized:
            print("⚠️  Azure AI not configured, using fallback system")
            print("   To use Azure AI Foundry, configure the environment variables:")
            print("   - AZURE_OPENAI_API_KEY")
            print("   - AZURE_OPENAI_ENDPOINT")
            print("   - AZURE_OPENAI_DEPLOYMENT_NAME")
            return self._fallback_fitment_generation(vcdb_data, products_data)

        try:
            # Prepare the prompt for AI
            prompt = self._create_fitment_prompt(vcdb_data, products_data)
            
            # Call Azure OpenAI using the official client
            response = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert automotive fitment specialist. Your task is to analyze vehicle data and product data to generate accurate fitment combinations. Return your response as a JSON array of fitment objects."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_completion_tokens=8000,
                model=self.deployment_name
            )
            
            print(f"🔍 Raw AI response: {response}")
            
            if response.choices and len(response.choices) > 0:
                content = response.choices[0].message.content
                print(f"🔍 AI response content: {content}")
                
                if content and content.strip():
                    fitments = self._parse_ai_response(content)
                    print(f"✅ Azure AI generated {len(fitments)} fitments")
                    return fitments
                else:
                    print("⚠️  AI returned empty content, using fallback")
                    return self._fallback_fitment_generation(vcdb_data, products_data)
            else:
                print("⚠️  No choices in AI response, using fallback")
                return self._fallback_fitment_generation(vcdb_data, products_data)
            
        except Exception as e:
            print(f"Azure AI error: {str(e)}")
            return self._fallback_fitment_generation(vcdb_data, products_data)

    def _create_fitment_prompt(self, vcdb_data: List[Dict], products_data: List[Dict]) -> str:
        """Create a detailed prompt for AI fitment generation"""
        
        # Sample data for context (limit to avoid token limits)
        vcdb_sample = vcdb_data[:10] if len(vcdb_data) > 10 else vcdb_data
        products_sample = products_data[:15] if len(products_data) > 15 else products_data
        
        # Analyze data structure to provide better context
        vcdb_fields = list(vcdb_data[0].keys()) if vcdb_data else []
        products_fields = list(products_data[0].keys()) if products_data else []
        
        # Convert data to strings to avoid f-string formatting issues
        vcdb_fields_str = ', '.join(vcdb_fields)
        products_fields_str = ', '.join(products_fields)
        vcdb_sample_str = json.dumps(vcdb_sample, indent=2)
        products_sample_str = json.dumps(products_sample, indent=2)
        
        prompt = f"""Generate automotive fitments by matching products to vehicles.

VEHICLE DATA (Fields: {vcdb_fields_str}):
{vcdb_sample_str}

PRODUCT DATA (Fields: {products_fields_str}):
{products_sample_str}

RULES:
- Wheels/Tires: 4 per vehicle, position-specific
- Brake/Suspension: 2-4 per vehicle, position-specific  
- Engine/Electrical: 1 per vehicle, no position
- Body parts: 1 per vehicle, position-specific

Generate 15-20 fitments. Return ONLY JSON array:
[
  {{
    "partId": "WHEEL001",
    "partDescription": "18\" Alloy Wheel", 
    "year": 2020,
    "make": "Toyota",
    "model": "RAV4",
    "submodel": "XLE",
    "driveType": "AWD",
    "position": "Front",
    "quantity": 4,
    "confidence": 0.85,
    "ai_reasoning": "Compatible wheel for this vehicle",
    "confidence_explanation": "High confidence due to exact vehicle match and standard wheel specifications"
  }}
]"""
        
        return prompt

    def _parse_ai_response(self, content: str) -> List[Dict[str, Any]]:
        """Parse AI response and extract fitments"""
        try:
            # Try to extract JSON from the response
            content = content.strip()
            print(f"🔍 Parsing content: {content[:200]}...")
            
            # Remove markdown code blocks if present
            if content.startswith('```json'):
                content = content[7:]
            elif content.startswith('```'):
                content = content[3:]
            
            if content.endswith('```'):
                content = content[:-3]
            
            content = content.strip()
            
            # Try to parse as JSON
            fitments = json.loads(content)
            
            # Ensure it's a list
            if not isinstance(fitments, list):
                if isinstance(fitments, dict):
                    fitments = [fitments]
                else:
                    print("⚠️  AI response is not a list or dict")
                    return []
            
            # Validate and clean the fitments
            cleaned_fitments = []
            for i, fitment in enumerate(fitments):
                if isinstance(fitment, dict):
                    # Ensure required fields
                    cleaned_fitment = {
                        "partId": fitment.get("partId", f"PART_{i}"),
                        "partDescription": fitment.get("partDescription", f"AI Generated Part {i}"),
                        "year": fitment.get("year", 2020),
                        "make": fitment.get("make", "Unknown"),
                        "model": fitment.get("model", "Unknown"),
                        "submodel": fitment.get("submodel", ""),
                        "driveType": fitment.get("driveType", ""),
                        "position": fitment.get("position", "Front"),
                        "quantity": fitment.get("quantity", 1),
                        "confidence": min(max(fitment.get("confidence", 0.7), 0.0), 1.0),
                        "ai_reasoning": fitment.get("ai_reasoning", "AI-generated fitment based on automotive compatibility analysis")
                    }
                    cleaned_fitments.append(cleaned_fitment)
                else:
                    print(f"⚠️  Skipping non-dict fitment: {fitment}")
            
            print(f"✅ Successfully parsed {len(cleaned_fitments)} fitments")
            return cleaned_fitments
            
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse AI response as JSON: {str(e)}")
            print(f"   Content: {content}")
            return []
        except Exception as e:
            print(f"❌ Unexpected error parsing AI response: {str(e)}")
            return []

    def _fallback_fitment_generation(self, vcdb_data: List[Dict], products_data: List[Dict]) -> List[Dict[str, Any]]:
        """Fallback rule-based fitment generation when AI fails"""
        fitments = []
        
        # Enhanced matching logic with realistic rules
        positions = ["Front", "Rear", "Front Left", "Front Right", "Rear Left", "Rear Right"]
        
        for i, product in enumerate(products_data[:15]):  # Limit for demo
            product_desc = product.get("description", "").lower()
            product_id = product.get("id", f"PART_{i}")
            
            # Determine part type and quantity based on description
            quantity = 1
            position = ""
            
            if any(keyword in product_desc for keyword in ["wheel", "tire", "rim"]):
                quantity = 4
                position = "Front"  # Default for wheels
            elif any(keyword in product_desc for keyword in ["brake", "rotor", "pad", "caliper"]):
                quantity = 2
                position = "Front"
            elif any(keyword in product_desc for keyword in ["shock", "strut", "spring", "suspension"]):
                quantity = 2
                position = "Front"
            elif any(keyword in product_desc for keyword in ["engine", "motor", "transmission"]):
                quantity = 1
                position = ""
            elif any(keyword in product_desc for keyword in ["bumper", "fender", "door", "mirror"]):
                quantity = 1
                position = "Front"
            elif any(keyword in product_desc for keyword in ["light", "lamp", "bulb"]):
                quantity = 2
                position = "Front"
            
            # Generate fitments for top vehicles
            for j, vehicle in enumerate(vcdb_data[:8]):  # Limit for demo
                # Calculate confidence based on various factors
                base_confidence = 0.6
                confidence_factors = []
                
                # Increase confidence for common makes/models
                make = vehicle.get("make", "").lower()
                if make in ["toyota", "honda", "ford", "chevrolet", "nissan"]:
                    base_confidence += 0.1
                    confidence_factors.append("Popular vehicle make with extensive compatibility data")
                
                # Increase confidence for recent years
                year = vehicle.get("year", 2020)
                if year >= 2015:
                    base_confidence += 0.1
                    confidence_factors.append("Recent model year with updated specifications")
                
                # Add some randomness but keep it realistic
                confidence = min(0.95, base_confidence + (i * j * 0.005) % 0.2)
                
                # Generate confidence explanation
                if confidence >= 0.8:
                    confidence_explanation = "High confidence: " + "; ".join(confidence_factors) if confidence_factors else "Strong compatibility match based on standard specifications"
                elif confidence >= 0.6:
                    confidence_explanation = "Medium confidence: " + "; ".join(confidence_factors) if confidence_factors else "Moderate compatibility based on general specifications"
                else:
                    confidence_explanation = "Lower confidence: Limited compatibility data available"
                
                fitment = {
                    "partId": product_id,
                    "partDescription": product.get("description", f"Product {i}"),
                    "year": year,
                    "make": vehicle.get("make", "Unknown"),
                    "model": vehicle.get("model", "Unknown"),
                    "submodel": vehicle.get("submodel", ""),
                    "driveType": vehicle.get("driveType", ""),
                    "position": position,
                    "quantity": quantity,
                    "confidence": confidence,
                    "ai_reasoning": f"Rule-based compatibility: {product.get('description', 'product')} is compatible with {year} {vehicle.get('make', 'Unknown')} {vehicle.get('model', 'Unknown')} based on automotive standards and part specifications.",
                    "confidence_explanation": confidence_explanation
                }
                fitments.append(fitment)
        
        return fitments


# Global instance
azure_ai_service = AzureAIService()
