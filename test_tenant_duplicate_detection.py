#!/usr/bin/env python3
"""
Test script to verify tenant-aware duplicate detection functionality.
This script tests that duplicates are prevented within the same tenant but allowed across different tenants.
"""

import requests
import json
import os
import tempfile

# Configuration
BASE_URL = "http://127.0.0.1:8001"
AUTH_TOKEN = "e953dd6549397cd6b190720073a98bf0b9b28774"
TENANT_1_ID = "d319e711-0969-469d-b812-04f5e6684e0d"
TENANT_2_ID = "6b2597e7-976d-4fce-a0ad-c1c5e2329abf"

def create_test_vcdb_file():
    """Create a test VCDB JSON file with specific data"""
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
    """Create a test Products JSON file with specific data"""
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

def upload_file_with_tenant(tenant_id, file_type="vcdb"):
    """Upload a file for a specific tenant"""
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
        'X-Tenant-ID': tenant_id,
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
    }
    
    try:
        if file_type == "vcdb":
            file_path = create_test_vcdb_file()
            files = {
                'vcdb_file': ('test_vcdb.json', open(file_path, 'rb'), 'application/json')
            }
        else:
            file_path = create_test_products_file()
            files = {
                'products_file': ('test_products.json', open(file_path, 'rb'), 'application/json')
            }
        
        response = requests.post(url, headers=headers, files=files)
        
        # Clean up
        for file_obj in files.values():
            if hasattr(file_obj[1], 'close'):
                file_obj[1].close()
        os.unlink(file_path)
        
        return response
        
    except Exception as e:
        print(f"Error uploading file: {e}")
        return None

def get_data_status_for_tenant(tenant_id):
    """Get data status for a specific tenant"""
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
        'X-Tenant-ID': tenant_id,
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"'
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Error getting data status: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error getting data status: {e}")
        return None

def test_duplicate_detection_within_tenant():
    """Test that duplicates are prevented within the same tenant"""
    print("🧪 Testing Duplicate Detection Within Same Tenant")
    print("="*60)
    
    # Upload VCDB file for Tenant 1
    print(f"1. Uploading VCDB file for Tenant 1: {TENANT_1_ID}")
    response1 = upload_file_with_tenant(TENANT_1_ID, "vcdb")
    
    if response1 and response1.status_code == 201:
        data1 = response1.json()
        print(f"   ✅ First upload successful")
        print(f"   Session ID: {data1.get('id')}")
        print(f"   VCDB Records: {data1.get('vcdb_records')}")
        
        # Check data status after first upload
        status1 = get_data_status_for_tenant(TENANT_1_ID)
        if status1:
            print(f"   VCDB Records in DB: {status1['vcdb']['record_count']}")
        
        # Upload the same VCDB file again for the same tenant
        print(f"\n2. Uploading SAME VCDB file again for Tenant 1: {TENANT_1_ID}")
        response2 = upload_file_with_tenant(TENANT_1_ID, "vcdb")
        
        if response2 and response2.status_code == 201:
            data2 = response2.json()
            print(f"   ✅ Second upload successful")
            print(f"   Session ID: {data2.get('id')}")
            print(f"   VCDB Records: {data2.get('vcdb_records')}")
            
            # Check data status after second upload
            status2 = get_data_status_for_tenant(TENANT_1_ID)
            if status2:
                print(f"   VCDB Records in DB: {status2['vcdb']['record_count']}")
                
                # Verify that no new records were created (duplicates prevented)
                if status1 and status2:
                    if status1['vcdb']['record_count'] == status2['vcdb']['record_count']:
                        print(f"   ✅ SUCCESS: Duplicates prevented within same tenant")
                        print(f"   Record count remained: {status1['vcdb']['record_count']}")
                    else:
                        print(f"   ❌ FAILURE: Duplicates were not prevented")
                        print(f"   Record count changed: {status1['vcdb']['record_count']} -> {status2['vcdb']['record_count']}")
        else:
            print(f"   ❌ Second upload failed: {response2.status_code if response2 else 'No response'}")
    else:
        print(f"   ❌ First upload failed: {response1.status_code if response1 else 'No response'}")

def test_duplicate_allowed_across_tenants():
    """Test that duplicates are allowed across different tenants"""
    print(f"\n🧪 Testing Duplicates Allowed Across Different Tenants")
    print("="*60)
    
    # Upload VCDB file for Tenant 1
    print(f"1. Uploading VCDB file for Tenant 1: {TENANT_1_ID}")
    response1 = upload_file_with_tenant(TENANT_1_ID, "vcdb")
    
    if response1 and response1.status_code == 201:
        data1 = response1.json()
        print(f"   ✅ Upload successful for Tenant 1")
        print(f"   VCDB Records: {data1.get('vcdb_records')}")
        
        # Check data status for Tenant 1
        status1 = get_data_status_for_tenant(TENANT_1_ID)
        if status1:
            print(f"   Tenant 1 VCDB Records in DB: {status1['vcdb']['record_count']}")
        
        # Upload the same VCDB file for Tenant 2
        print(f"\n2. Uploading SAME VCDB file for Tenant 2: {TENANT_2_ID}")
        response2 = upload_file_with_tenant(TENANT_2_ID, "vcdb")
        
        if response2 and response2.status_code == 201:
            data2 = response2.json()
            print(f"   ✅ Upload successful for Tenant 2")
            print(f"   VCDB Records: {data2.get('vcdb_records')}")
            
            # Check data status for Tenant 2
            status2 = get_data_status_for_tenant(TENANT_2_ID)
            if status2:
                print(f"   Tenant 2 VCDB Records in DB: {status2['vcdb']['record_count']}")
                
                # Verify that both tenants have the same number of records (duplicates allowed across tenants)
                if status1 and status2:
                    if status1['vcdb']['record_count'] == status2['vcdb']['record_count']:
                        print(f"   ✅ SUCCESS: Duplicates allowed across different tenants")
                        print(f"   Both tenants have: {status1['vcdb']['record_count']} records")
                    else:
                        print(f"   ❌ FAILURE: Records not consistent across tenants")
                        print(f"   Tenant 1: {status1['vcdb']['record_count']}, Tenant 2: {status2['vcdb']['record_count']}")
        else:
            print(f"   ❌ Upload failed for Tenant 2: {response2.status_code if response2 else 'No response'}")
    else:
        print(f"   ❌ Upload failed for Tenant 1: {response1.status_code if response1 else 'No response'}")

def test_products_duplicate_detection():
    """Test duplicate detection for Products data"""
    print(f"\n🧪 Testing Products Duplicate Detection")
    print("="*60)
    
    # Upload Products file for Tenant 1
    print(f"1. Uploading Products file for Tenant 1: {TENANT_1_ID}")
    response1 = upload_file_with_tenant(TENANT_1_ID, "products")
    
    if response1 and response1.status_code == 201:
        data1 = response1.json()
        print(f"   ✅ First upload successful")
        print(f"   Products Records: {data1.get('products_records')}")
        
        # Check data status after first upload
        status1 = get_data_status_for_tenant(TENANT_1_ID)
        if status1:
            print(f"   Products Records in DB: {status1['products']['record_count']}")
        
        # Upload the same Products file again for the same tenant
        print(f"\n2. Uploading SAME Products file again for Tenant 1: {TENANT_1_ID}")
        response2 = upload_file_with_tenant(TENANT_1_ID, "products")
        
        if response2 and response2.status_code == 201:
            data2 = response2.json()
            print(f"   ✅ Second upload successful")
            print(f"   Products Records: {data2.get('products_records')}")
            
            # Check data status after second upload
            status2 = get_data_status_for_tenant(TENANT_1_ID)
            if status2:
                print(f"   Products Records in DB: {status2['products']['record_count']}")
                
                # Verify that no new records were created (duplicates prevented)
                if status1 and status2:
                    if status1['products']['record_count'] == status2['products']['record_count']:
                        print(f"   ✅ SUCCESS: Product duplicates prevented within same tenant")
                        print(f"   Record count remained: {status1['products']['record_count']}")
                    else:
                        print(f"   ❌ FAILURE: Product duplicates were not prevented")
                        print(f"   Record count changed: {status1['products']['record_count']} -> {status2['products']['record_count']}")
        else:
            print(f"   ❌ Second upload failed: {response2.status_code if response2 else 'No response'}")
    else:
        print(f"   ❌ First upload failed: {response1.status_code if response1 else 'No response'}")

def test_cross_tenant_products():
    """Test that Products duplicates are allowed across different tenants"""
    print(f"\n🧪 Testing Products Duplicates Allowed Across Tenants")
    print("="*60)
    
    # Upload Products file for Tenant 1
    print(f"1. Uploading Products file for Tenant 1: {TENANT_1_ID}")
    response1 = upload_file_with_tenant(TENANT_1_ID, "products")
    
    if response1 and response1.status_code == 201:
        data1 = response1.json()
        print(f"   ✅ Upload successful for Tenant 1")
        print(f"   Products Records: {data1.get('products_records')}")
        
        # Check data status for Tenant 1
        status1 = get_data_status_for_tenant(TENANT_1_ID)
        if status1:
            print(f"   Tenant 1 Products Records in DB: {status1['products']['record_count']}")
        
        # Upload the same Products file for Tenant 2
        print(f"\n2. Uploading SAME Products file for Tenant 2: {TENANT_2_ID}")
        response2 = upload_file_with_tenant(TENANT_2_ID, "products")
        
        if response2 and response2.status_code == 201:
            data2 = response2.json()
            print(f"   ✅ Upload successful for Tenant 2")
            print(f"   Products Records: {data2.get('products_records')}")
            
            # Check data status for Tenant 2
            status2 = get_data_status_for_tenant(TENANT_2_ID)
            if status2:
                print(f"   Tenant 2 Products Records in DB: {status2['products']['record_count']}")
                
                # Verify that both tenants have the same number of records
                if status1 and status2:
                    if status1['products']['record_count'] == status2['products']['record_count']:
                        print(f"   ✅ SUCCESS: Product duplicates allowed across different tenants")
                        print(f"   Both tenants have: {status1['products']['record_count']} records")
                    else:
                        print(f"   ❌ FAILURE: Product records not consistent across tenants")
                        print(f"   Tenant 1: {status1['products']['record_count']}, Tenant 2: {status2['products']['record_count']}")
        else:
            print(f"   ❌ Upload failed for Tenant 2: {response2.status_code if response2 else 'No response'}")
    else:
        print(f"   ❌ Upload failed for Tenant 1: {response1.status_code if response1 else 'No response'}")

if __name__ == "__main__":
    print("🧪 Testing Tenant-Aware Duplicate Detection")
    print("="*60)
    print(f"Tenant 1 ID: {TENANT_1_ID}")
    print(f"Tenant 2 ID: {TENANT_2_ID}")
    print("="*60)
    
    # Test VCDB duplicate detection within same tenant
    test_duplicate_detection_within_tenant()
    
    # Test VCDB duplicates allowed across different tenants
    test_duplicate_allowed_across_tenants()
    
    # Test Products duplicate detection within same tenant
    test_products_duplicate_detection()
    
    # Test Products duplicates allowed across different tenants
    test_cross_tenant_products()
    
    print(f"\n" + "="*60)
    print("🏁 Testing Complete!")
    print("\nExpected Results:")
    print("1. ✅ Same tenant, same data: Duplicates prevented (no new records created)")
    print("2. ✅ Different tenants, same data: Duplicates allowed (both tenants get records)")
    print("3. ✅ VCDB and Products: Both data types follow tenant-aware duplicate rules")
    print("4. ✅ Data isolation: Each tenant only sees their own data")
