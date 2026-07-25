import urllib.request
import urllib.error
import urllib.parse
import json
import sys

BASE_URL = 'http://127.0.0.1:5000'

def request(method, path, data=None, headers=None):
    url = BASE_URL + path
    if headers is None:
        headers = {}
    
    req_data = None
    if data:
        req_data = json.dumps(data).encode('utf-8')
        headers['Content-Type'] = 'application/json'
        
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            status = response.status
            body = response.read().decode('utf-8')
            try:
                json_data = json.loads(body)
            except:
                json_data = None
            return status, json_data, body
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode('utf-8')
        try:
            json_data = json.loads(body)
        except:
            json_data = None
        return status, json_data, body
    except Exception as e:
        print(f"Connection error: {e}")
        sys.exit(1)

def run_test():
    print("Testing complete user flow via API...")

    # 1. Homepage
    status, _, _ = request('GET', '/')
    if status != 200:
        print(f"Error: Homepage failed to load (Status {status})")
        sys.exit(1)
    print("[OK] Homepage loaded correctly")

    # 2. Register
    email = "testflowuser2@uniprep.com"
    password = "password123"
    register_data = {
        "name": "Test Flow User",
        "email": email,
        "password": password
    }
    status, json_data, body = request('POST', '/api/auth/register', data=register_data)
    if status not in [201, 400]:
        print(f"Error: Register failed (Status {status}): {body}")
        sys.exit(1)
    print(f"[OK] Register API returned: {json_data}")

    # 3. Login
    login_data = {
        "email": email,
        "password": password
    }
    status, json_data, body = request('POST', '/api/auth/login', data=login_data)
    if status != 200:
        print(f"Error: Login failed (Status {status}): {body}")
        sys.exit(1)
    
    token = json_data.get('token')
    if not token:
        print("Error: No token returned in login response")
        sys.exit(1)
    print("[OK] Login successful, JWT token received")
    
    headers = {'Authorization': f'Bearer {token}'}

    # 4. Dashboard Data
    status, json_data, body = request('GET', '/api/dashboard/data', headers=headers)
    if status != 200:
        print(f"Error: Dashboard failed (Status {status}): {body}")
        sys.exit(1)
    print("[OK] Dashboard data loaded")

    # 5. Subjects/Resources
    subject_id = 1
    status, json_data, body = request('GET', f'/api/resources?subject_id={subject_id}', headers=headers)
    if status != 200:
        print(f"Error: Resources failed (Status {status}): {body}")
        sys.exit(1)
    print(f"[OK] Resources loaded for subject {subject_id}")

    # 6. Quiz Questions
    status, json_data, body = request('GET', f'/api/questions?subject_id={subject_id}', headers=headers)
    if status != 200:
        print(f"Error: Questions failed (Status {status}): {body}")
        sys.exit(1)
    print(f"[OK] Questions loaded for subject {subject_id}")

    # 7. Submit Quiz Activity
    score_data = {
        "subject_id": subject_id,
        "score": 8,
        "total_questions": 10
    }
    status, json_data, body = request('POST', '/api/activity_scores', data=score_data, headers=headers)
    if status != 201:
        print(f"Error: Submit score failed (Status {status}): {body}")
        sys.exit(1)
    print("[OK] Activity score successfully recorded")
    
    print("All backend API flows successfully tested!")

if __name__ == "__main__":
    run_test()
