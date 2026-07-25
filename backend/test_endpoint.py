import urllib.request
import json
import uuid

# 1. Register a fake user to get token
url_reg = "http://127.0.0.1:5000/api/auth/register"
url_login = "http://127.0.0.1:5000/api/auth/login"
uid = str(uuid.uuid4())
email = f"test_{uid}@example.com"
password = "password"

data = json.dumps({
    "name": "Test User",
    "email": email,
    "password": password,
    "university_id": 1,
    "course_id": 1
}).encode('utf-8')

req = urllib.request.Request(url_reg, data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as res:
        print("Registered")
        
    login_data = json.dumps({"email": email, "password": password}).encode('utf-8')
    req_login = urllib.request.Request(url_login, data=login_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req_login) as res_login:
        res_data = json.loads(res_login.read().decode('utf-8'))
        token = res_data.get('token')
        print("Got token!")
        
        # 2. Fetch resources for subject 1
        req2 = urllib.request.Request("http://127.0.0.1:5000/api/resources?subject_id=1", headers={"Authorization": f"Bearer {token}"})
        with urllib.request.urlopen(req2) as r:
            print("Resources:", json.loads(r.read().decode('utf-8')))
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
