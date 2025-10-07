#!/usr/bin/env python3
"""
Test script to verify authentication endpoints work correctly
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_login(username, password):
    """Test login endpoint"""
    print(f"\n🔐 Testing login for user: {username}")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login/",
        json={"username": username, "password": password},
        headers={"Content-Type": "application/json"}
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            user = data.get("user", {})
            print(f"✅ Login successful!")
            print(f"   User: {user.get('display_name')}")
            print(f"   Roles: {user.get('roles', [])}")
            print(f"   Is Admin: {user.get('is_admin')}")
            print(f"   Is MFT User: {user.get('is_mft_user')}")
            print(f"   Tenant: {user.get('tenant', {}).get('name')}")
            
            # Return cookies for subsequent requests
            return response.cookies
        else:
            print(f"❌ Login failed: {data.get('error', 'Unknown error')}")
    else:
        print(f"❌ Login failed with status {response.status_code}")
        print(f"   Response: {response.text}")
    
    return None

def test_current_user(cookies):
    """Test current user endpoint"""
    print(f"\n👤 Testing current user endpoint")
    
    response = requests.get(
        f"{BASE_URL}/api/auth/user/",
        cookies=cookies
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            user = data.get("user", {})
            print(f"✅ Current user retrieved!")
            print(f"   User: {user.get('display_name')}")
            print(f"   Roles: {user.get('roles', [])}")
            print(f"   Is Admin: {user.get('is_admin')}")
            print(f"   Is MFT User: {user.get('is_mft_user')}")
        else:
            print(f"❌ Failed to get current user: {data.get('error')}")
    else:
        print(f"❌ Current user request failed with status {response.status_code}")

def test_logout(cookies):
    """Test logout endpoint"""
    print(f"\n🚪 Testing logout")
    
    response = requests.post(
        f"{BASE_URL}/api/auth/logout/",
        cookies=cookies
    )
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print(f"✅ Logout successful!")
        else:
            print(f"❌ Logout failed: {data.get('error')}")
    else:
        print(f"❌ Logout request failed with status {response.status_code}")

def main():
    print("🧪 Testing Authentication System")
    print("=" * 50)
    
    # Test admin user login
    admin_cookies = test_login("admin", "admin123")
    if admin_cookies:
        test_current_user(admin_cookies)
        test_logout(admin_cookies)
    
    # Test MFT user login
    mft_cookies = test_login("mft_user", "mft123")
    if mft_cookies:
        test_current_user(mft_cookies)
        test_logout(mft_cookies)
    
    # Test invalid credentials
    test_login("invalid_user", "wrong_password")
    
    print(f"\n✅ Authentication testing completed!")

if __name__ == "__main__":
    main()
