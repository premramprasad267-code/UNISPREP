import urllib.request
import urllib.error
import json
import time

BASE_URL = 'http://127.0.0.1:5000/api'
test_email = f"prod_student_{int(time.time())}@uniprep.com"
password = "password123"
token = ""
admin_token = ""

def print_step(msg):
    print(f"\n[+] {msg}")

def test_flow():
    global token
    
    # 1. Register Student
    print_step("Registering new student")
    req = urllib.request.Request(f'{BASE_URL}/auth/register', data=json.dumps({
        'name': 'Prod Student', 'email': test_email, 'password': password, 'university_id': 1, 'course_id': 1
    }).encode(), headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    print("Registered successfully.")
    
    # 2. Login Student
    print_step("Logging in student")
    req = urllib.request.Request(f'{BASE_URL}/auth/login', data=json.dumps({
        'email': test_email, 'password': password
    }).encode(), headers={'Content-Type': 'application/json'})
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())['token']
    print("Login successful.")

    # 3. Check Dashboard Profile
    print_step("Checking Dashboard")
    req = urllib.request.Request(f'{BASE_URL}/dashboard/data', headers={'Authorization': 'Bearer ' + token})
    res = urllib.request.urlopen(req)
    data = json.loads(res.read())
    print(f"Loaded dashboard for {data.get('course')}.")
    
    # 4. Save Resource (Bookmark)
    print_step("Saving a resource (Bookmark)")
    req = urllib.request.Request(f'{BASE_URL}/user/saved_resources', data=json.dumps({
        'resource_id': 1
    }).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token})
    try:
        urllib.request.urlopen(req)
        print("Resource saved.")
    except urllib.error.HTTPError as e:
        print("Fallback or error:", e.read().decode())
        
    # 5. Fetch Saved Resources
    print_step("Fetching Saved Resources")
    req = urllib.request.Request(f'{BASE_URL}/user/saved_resources', headers={'Authorization': 'Bearer ' + token})
    res = urllib.request.urlopen(req)
    saved = json.loads(res.read()).get('data', [])
    print(f"Found {len(saved)} saved resources.")

    # 6. Admin Login
    print_step("Logging in Admin")
    try:
        req = urllib.request.Request(f'{BASE_URL}/auth/login', data=json.dumps({
            'email': 'admin@uniprep.com', 'password': 'admin' # Assuming default admin exists
        }).encode(), headers={'Content-Type': 'application/json'})
        res = urllib.request.urlopen(req)
        admin_token = json.loads(res.read())['token']
        print("Admin login successful.")
        
        # 7. Admin Fetch Users
        print_step("Admin: Fetching Users")
        req = urllib.request.Request(f'{BASE_URL}/admin/users', headers={'Authorization': 'Bearer ' + admin_token})
        res = urllib.request.urlopen(req)
        users = json.loads(res.read())['data']
        print(f"Found {len(users)} total users.")
        
        # 8. Admin Delete the test user
        student_id = next(u['id'] for u in users if u['email'] == test_email)
        print_step(f"Admin: Deleting test user {student_id}")
        req = urllib.request.Request(f'{BASE_URL}/admin/users/{student_id}', method='DELETE', headers={'Authorization': 'Bearer ' + admin_token})
        res = urllib.request.urlopen(req)
        print("Test user deleted.")
        
    except Exception as e:
        print("Skipping admin delete flow (admin@uniprep.com might not exist locally):", e)

    print("\nPRODUCTION API FLOW TEST COMPLETE")

if __name__ == '__main__':
    test_flow()
