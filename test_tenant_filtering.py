#!/usr/bin/env python3
"""
Test script to verify tenant-based data filtering functionality.
This script tests the data-status endpoint with different tenant IDs.
"""

import requests
import json

# Configuration
BASE_URL = "http://127.0.0.1:8001"
AUTH_TOKEN = "e953dd6549397cd6b190720073a98bf0b9b28774"
TENANT_ID = "d319e711-0969-469d-b812-04f5e6684e0d"

def test_data_status_with_tenant():
    """Test the data-status endpoint with tenant ID header"""
    url = f"{BASE_URL}/api/data-uploads/data-status/"
    
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Authorization': f'Bearer {AUTH_TOKEN}',
        'Connection': 'keep-alive',
        'Origin': 'http://localhost:5001',
        'Referer': 'http://localhost:5001/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'X-Tenant-ID': TENANT_ID,
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
    }
    
    try:
        print(f"Testing data-status endpoint with tenant ID: {TENANT_ID}")
        print(f"URL: {url}")
        print(f"Headers: {json.dumps({k: v for k, v in headers.items() if k != 'Authorization'}, indent=2)}")
        
        response = requests.get(url, headers=headers)
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nResponse Data:")
            print(json.dumps(data, indent=2))
            
            # Verify the response structure
            if 'vcdb' in data and 'products' in data:
                print(f"\n✅ Success: Data status retrieved for tenant {TENANT_ID}")
                print(f"VCDB records: {data['vcdb']['record_count']}")
                print(f"Product records: {data['products']['record_count']}")
                print(f"Ready for fitment: {data['ready_for_fitment']}")
            else:
                print(f"\n❌ Error: Invalid response structure")
        else:
            print(f"\n❌ Error: Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

def test_data_status_without_tenant():
    """Test the data-status endpoint without tenant ID header"""
    url = f"{BASE_URL}/api/data-uploads/data-status/"
    
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Authorization': f'Bearer {AUTH_TOKEN}',
        'Connection': 'keep-alive',
        'Origin': 'http://localhost:5001',
        'Referer': 'http://localhost:5001/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
    }
    
    try:
        print(f"\n" + "="*60)
        print(f"Testing data-status endpoint WITHOUT tenant ID")
        print(f"URL: {url}")
        
        response = requests.get(url, headers=headers)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\nResponse Data:")
            print(json.dumps(data, indent=2))
            
            print(f"\n✅ Success: Data status retrieved without tenant filtering")
            print(f"VCDB records: {data['vcdb']['record_count']}")
            print(f"Product records: {data['products']['record_count']}")
            print(f"Ready for fitment: {data['ready_for_fitment']}")
        else:
            print(f"\n❌ Error: Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

def test_invalid_tenant():
    """Test the data-status endpoint with invalid tenant ID"""
    url = f"{BASE_URL}/api/data-uploads/data-status/"
    invalid_tenant_id = "invalid-tenant-id-12345"
    
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Authorization': f'Bearer {AUTH_TOKEN}',
        'Connection': 'keep-alive',
        'Origin': 'http://localhost:5001',
        'Referer': 'http://localhost:5001/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'X-Tenant-ID': invalid_tenant_id,
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
    }
    
    try:
        print(f"\n" + "="*60)
        print(f"Testing data-status endpoint with INVALID tenant ID: {invalid_tenant_id}")
        print(f"URL: {url}")
        
        response = requests.get(url, headers=headers)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print(f"\n✅ Success: Invalid tenant ID properly rejected")
            print(f"Error message: {data.get('error', 'No error message')}")
        else:
            print(f"\n❌ Error: Expected 400 status for invalid tenant, got {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

if __name__ == "__main__":
    print("🧪 Testing Tenant-Based Data Filtering")
    print("="*60)
    
    # Test with valid tenant ID
    test_data_status_with_tenant()
    
    # Test without tenant ID (should return all data)
    test_data_status_without_tenant()
    
    # Test with invalid tenant ID (should return 400 error)
    test_invalid_tenant()
    
    print(f"\n" + "="*60)
    print("🏁 Testing Complete!")
    print("\nExpected Results:")
    print("1. ✅ Valid tenant ID: Returns tenant-specific data")
    print("2. ✅ No tenant ID: Returns all data (no filtering)")
    print("3. ✅ Invalid tenant ID: Returns 400 error with message")
