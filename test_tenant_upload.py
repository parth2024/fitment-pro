#!/usr/bin/env python3
"""
Test script to verify tenant-based file upload functionality.
This script tests the sessions endpoint with different tenant IDs for file uploads.
"""

import requests
import json
import os
import tempfile

# Configuration
BASE_URL = "http://127.0.0.1:8001"
AUTH_TOKEN = "e953dd6549397cd6b190720073a98bf0b9b28774"
TENANT_ID = "6b2597e7-976d-4fce-a0ad-c1c5e2329abf"

def create_test_vcdb_file():
    """Create a test VCDB JSON file"""
    test_data = [
        {
            "year": 2020,
            "make": "Toyota",
            "model": "Camry",
            "submodel": "LE",
            "drivetype": "FWD",
            "fueltype": "Gasoline",
            "numdoors": 4,
            "bodytype": "Sedan"
        },
        {
            "year": 2021,
            "make": "Honda",
            "model": "Civic",
            "submodel": "EX",
            "drivetype": "FWD",
            "fueltype": "Gasoline",
            "numdoors": 4,
            "bodytype": "Sedan"
        }
    ]
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(test_data, temp_file, indent=2)
    temp_file.close()
    
    return temp_file.name

def create_test_products_file():
    """Create a test Products JSON file"""
    test_data = [
        {
            "id": "PART001",
            "description": "Test Part 1",
            "category": "Engine",
            "parttype": "Filter",
            "compatibility": "Universal",
            "brand": "TestBrand",
            "sku": "TB001",
            "price": 29.99
        },
        {
            "id": "PART002",
            "description": "Test Part 2",
            "category": "Brake",
            "parttype": "Pad",
            "compatibility": "Front",
            "brand": "TestBrand",
            "sku": "TB002",
            "price": 49.99
        }
    ]
    
    # Create temporary file
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
    json.dump(test_data, temp_file, indent=2)
    temp_file.close()
    
    return temp_file.name

def test_file_upload_with_tenant():
    """Test file upload with tenant ID"""
    url = f"{BASE_URL}/api/data-uploads/sessions/"
    
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
        print(f"Testing file upload with tenant ID: {TENANT_ID}")
        print(f"URL: {url}")
        
        # Create test files
        vcdb_file_path = create_test_vcdb_file()
        products_file_path = create_test_products_file()
        
        try:
            # Prepare files for upload
            files = {
                'vcdb_file': ('test_vcdb.json', open(vcdb_file_path, 'rb'), 'application/json'),
                'products_file': ('test_products.json', open(products_file_path, 'rb'), 'application/json')
            }
            
            print(f"\nUploading files:")
            print(f"- VCDB: {vcdb_file_path}")
            print(f"- Products: {products_file_path}")
            
            response = requests.post(url, headers=headers, files=files)
            
            print(f"\nResponse Status: {response.status_code}")
            print(f"Response Headers: {dict(response.headers)}")
            
            if response.status_code == 201:
                data = response.json()
                print(f"\n✅ Success: Files uploaded for tenant {TENANT_ID}")
                print(f"Session ID: {data.get('id')}")
                print(f"VCDB File: {data.get('vcdb_filename')}")
                print(f"Products File: {data.get('products_filename')}")
                print(f"VCDB Valid: {data.get('vcdb_valid')}")
                print(f"Products Valid: {data.get('products_valid')}")
                print(f"VCDB Records: {data.get('vcdb_records')}")
                print(f"Products Records: {data.get('products_records')}")
                
                # Test that the session is tenant-specific
                test_sessions_endpoint(data.get('id'))
                
            else:
                print(f"\n❌ Error: Upload failed with status {response.status_code}")
                print(f"Response: {response.text}")
                
        finally:
            # Clean up files
            for file_obj in files.values():
                if hasattr(file_obj[1], 'close'):
                    file_obj[1].close()
            
            # Remove temporary files
            os.unlink(vcdb_file_path)
            os.unlink(products_file_path)
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

def test_sessions_endpoint(session_id):
    """Test that sessions endpoint returns tenant-specific data"""
    url = f"{BASE_URL}/api/data-uploads/sessions/"
    
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
        print(f"\n" + "="*60)
        print(f"Testing sessions endpoint with tenant filtering")
        print(f"URL: {url}")
        
        response = requests.get(url, headers=headers)
        
        print(f"\nResponse Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Success: Sessions retrieved for tenant {TENANT_ID}")
            print(f"Number of sessions: {len(data)}")
            
            # Check if our uploaded session is in the results
            session_found = any(session.get('id') == session_id for session in data)
            if session_found:
                print(f"✅ Uploaded session found in tenant-specific results")
            else:
                print(f"❌ Uploaded session not found in tenant-specific results")
                
            # Show session details
            for session in data:
                print(f"\nSession: {session.get('id')}")
                print(f"  VCDB: {session.get('vcdb_filename')} ({session.get('vcdb_records')} records)")
                print(f"  Products: {session.get('products_filename')} ({session.get('products_records')} records)")
                print(f"  Created: {session.get('created_at')}")
        else:
            print(f"\n❌ Error: Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

def test_upload_without_tenant():
    """Test file upload without tenant ID"""
    url = f"{BASE_URL}/api/data-uploads/sessions/"
    
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
        print(f"Testing file upload WITHOUT tenant ID")
        print(f"URL: {url}")
        
        # Create test file
        vcdb_file_path = create_test_vcdb_file()
        
        try:
            # Prepare file for upload
            files = {
                'vcdb_file': ('test_vcdb_no_tenant.json', open(vcdb_file_path, 'rb'), 'application/json')
            }
            
            response = requests.post(url, headers=headers, files=files)
            
            print(f"\nResponse Status: {response.status_code}")
            
            if response.status_code == 201:
                data = response.json()
                print(f"\n✅ Success: File uploaded without tenant ID")
                print(f"Session ID: {data.get('id')}")
                print(f"VCDB File: {data.get('vcdb_filename')}")
                print(f"VCDB Valid: {data.get('vcdb_valid')}")
                print(f"VCDB Records: {data.get('vcdb_records')}")
            else:
                print(f"\n❌ Error: Upload failed with status {response.status_code}")
                print(f"Response: {response.text}")
                
        finally:
            # Clean up
            for file_obj in files.values():
                if hasattr(file_obj[1], 'close'):
                    file_obj[1].close()
            os.unlink(vcdb_file_path)
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

def test_invalid_tenant_upload():
    """Test file upload with invalid tenant ID"""
    url = f"{BASE_URL}/api/data-uploads/sessions/"
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
        print(f"Testing file upload with INVALID tenant ID: {invalid_tenant_id}")
        print(f"URL: {url}")
        
        # Create test file
        vcdb_file_path = create_test_vcdb_file()
        
        try:
            # Prepare file for upload
            files = {
                'vcdb_file': ('test_vcdb_invalid_tenant.json', open(vcdb_file_path, 'rb'), 'application/json')
            }
            
            response = requests.post(url, headers=headers, files=files)
            
            print(f"\nResponse Status: {response.status_code}")
            
            if response.status_code == 400:
                data = response.json()
                print(f"\n✅ Success: Invalid tenant ID properly rejected")
                print(f"Error message: {data.get('error', 'No error message')}")
            else:
                print(f"\n❌ Error: Expected 400 status for invalid tenant, got {response.status_code}")
                print(f"Response: {response.text}")
                
        finally:
            # Clean up
            for file_obj in files.values():
                if hasattr(file_obj[1], 'close'):
                    file_obj[1].close()
            os.unlink(vcdb_file_path)
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Network Error: {e}")
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")

if __name__ == "__main__":
    print("🧪 Testing Tenant-Based File Upload")
    print("="*60)
    
    # Test with valid tenant ID
    test_file_upload_with_tenant()
    
    # Test without tenant ID (should work but no tenant filtering)
    test_upload_without_tenant()
    
    # Test with invalid tenant ID (should return 400 error)
    test_invalid_tenant_upload()
    
    print(f"\n" + "="*60)
    print("🏁 Testing Complete!")
    print("\nExpected Results:")
    print("1. ✅ Valid tenant ID: Files uploaded and processed with tenant association")
    print("2. ✅ No tenant ID: Files uploaded without tenant filtering")
    print("3. ✅ Invalid tenant ID: Upload rejected with 400 error")
    print("4. ✅ Sessions endpoint: Returns only tenant-specific sessions")
