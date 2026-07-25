from flask import Flask, request, jsonify, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import datetime, timedelta
import bcrypt
import os
import uuid
import json
from dotenv import load_dotenv
from supabase import create_client, Client
from werkzeug.utils import secure_filename

load_dotenv(override=True)

app = Flask(__name__, static_folder='../frontend', static_url_path='')

# Configuration
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)

jwt = JWTManager(app)
CORS(app)

# Initialize Supabase Client
supabase_url: str = os.environ.get("SUPABASE_URL", "")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")

# Safe debug logging for deployment troubleshooting
print(f"DEBUG: SUPABASE_URL detected: {'YES' if supabase_url else 'NO'}")
print(f"DEBUG: SUPABASE_SERVICE_ROLE_KEY detected: {'YES' if os.environ.get('SUPABASE_SERVICE_ROLE_KEY') else 'NO'}")
print(f"DEBUG: SUPABASE_KEY detected: {'YES' if os.environ.get('SUPABASE_KEY') else 'NO'}")

try:
    if not supabase_url or not supabase_key:
        raise ValueError("Missing Supabase URL or Key in environment variables")
    supabase: Client = create_client(supabase_url, supabase_key)
except Exception as e:
    print(f"Warning: Failed to initialize Supabase client. Check your environment variables. Error: {e}")
    supabase = None

@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/login.html')
def serve_login():
    return send_from_directory(app.static_folder, 'login.html')

@app.route('/subject.html')
def serve_subject():
    return send_from_directory(app.static_folder, 'subject.html')

@app.route('/register.html')
def serve_register():
    return send_from_directory(app.static_folder, 'register.html')

@app.route('/admin.html')
def serve_admin():
    return send_from_directory(app.static_folder, 'admin.html')

@app.route('/api/auth/register', methods=['POST'])
def register():
    if not supabase:
         return jsonify({'error': 'Database not configured'}), 500

    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not all([name, email, password]):
        return jsonify({'error': 'Missing data'}), 400

    # Check if user exists
    existing = supabase.table('users').select('*').eq('email', email).execute()
    if existing.data and len(existing.data) > 0:
        return jsonify({'error': 'Email already registered'}), 400

    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Insert new user
    new_user = {
        'name': name,
        'email': email,
        'password_hash': hashed_password,
        'last_login': datetime.utcnow().isoformat(),
        'created_at': datetime.utcnow().isoformat()
    }
    
    try:
        supabase.table('users').insert(new_user).execute()
        return jsonify({'message': 'User created successfully'}), 201
    except Exception as e:
        print(f"Error registering user: {e}")
        return jsonify({'error': 'Failed to create user'}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    if not supabase:
         return jsonify({'error': 'Database not configured'}), 500

    data = request.json
    email = data.get('email')
    password = data.get('password')

    user_res = supabase.table('users').select('*').eq('email', email).execute()
    if not user_res.data or len(user_res.data) == 0:
        return jsonify({'error': 'Invalid credentials'}), 401

    user = user_res.data[0]
    
    try:
        if bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            # Update last login
            supabase.table('users').update({'last_login': datetime.utcnow().isoformat()}).eq('id', user['id']).execute()
            
            access_token = create_access_token(identity=str(user['id']))
            is_admin = bool(user.get('is_admin', False))
            return jsonify({'token': access_token, 'name': user['name'], 'is_admin': is_admin}), 200
    except ValueError:
        # Invalid hash format in database
        pass

    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/dashboard/data', methods=['GET'])
@jwt_required()
def dashboard_data():
    if not supabase:
         return jsonify({'error': 'Database not configured'}), 500

    current_user_id = get_jwt_identity()
    
    # Fetch User
    user_res = supabase.table('users').select('name').eq('id', current_user_id).execute()
    if not user_res.data:
        return jsonify({'error': 'User not found'}), 404
    
    user_name = user_res.data[0]['name']
    
    # Fetch first university and its courses & subjects via join
    # Using Supabase PostgREST syntax for nested relationships
    uni_res = supabase.table('universities').select('name, courses(name, subjects(id, name, color_code, icon))').limit(1).execute()
    
    if not uni_res.data or len(uni_res.data) == 0:
        return jsonify({'error': 'No data found'}), 404
        
    university = uni_res.data[0]
    
    if not university.get('courses') or len(university['courses']) == 0:
        return jsonify({'error': 'No courses found'}), 404
        
    course = university['courses'][0]
    
    subjects_data = []
    if course.get('subjects'):
        for subject in course['subjects']:
            subjects_data.append({
                'id': subject['id'],
                'name': subject['name'],
                'color': subject['color_code'],
                'icon': subject['icon']
            })

        
        # Fetch activity scores
        scores_res = supabase.table('activity_scores').select('score').eq('user_id', current_user_id).execute()
        total_quizzes = 0
        total_score = 0
        total_possible = 0
        if scores_res.data:
            total_quizzes = len(scores_res.data)
            total_score = sum(s['score'] for s in scores_res.data if s.get('score'))
            total_possible = total_quizzes * 10 # Default to 10 questions per quiz
            
        avg_score = 0
        if total_possible > 0:
            avg_score = round((total_score / total_possible) * 100)

        return jsonify({
            'user': {'name': user_name},
            'university': university['name'],
            'course': course['name'],
            'subjects': subjects_data,
            'stats': {
                'quizzes_completed': total_quizzes,
                'average_score': f"{avg_score}%",
                'total_score': total_score
            }
        }), 200

@app.route('/api/resources', methods=['GET'])
@jwt_required()
def get_resources():
    if not supabase:
         return jsonify({'error': 'Database not configured'}), 500

    subject_id = request.args.get('subject_id')
    query = supabase.table('resources').select('*')
    if subject_id:
        query = query.eq('subject_id', subject_id)
        
    try:
        res = query.execute()
        return jsonify({'data': res.data}), 200
    except Exception as e:
        print(f"Error fetching resources: {e}")
        return jsonify({'error': 'Failed to fetch resources'}), 500

@app.route('/api/questions', methods=['GET'])
@jwt_required()
def get_questions():
    if not supabase:
         return jsonify({'error': 'Database not configured'}), 500

    subject_id = request.args.get('subject_id')
    query = supabase.table('questions').select('*')
    if subject_id:
        query = query.eq('subject_id', subject_id)
        
    try:
        res = query.execute()
        return jsonify({'data': res.data}), 200
    except Exception as e:
        print(f"Error fetching questions: {e}")
        return jsonify({'error': 'Failed to fetch questions'}), 500

@app.route('/api/activity_scores', methods=['POST'])
@jwt_required()
def post_activity_score():
    if not supabase:
        return jsonify({'error': 'Database not configured'}), 500

    current_user_id = get_jwt_identity()
    data = request.json
    subject_id = data.get('subject_id')
    score = data.get('score')
    total_questions = data.get('total_questions')

    if subject_id is None or score is None:
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        new_score = {
            'user_id': current_user_id,
            'score': score,
            'created_at': datetime.utcnow().isoformat()
        }
        res = supabase.table('activity_scores').insert(new_score).execute()
        return jsonify({'message': 'Score saved successfully', 'data': res.data}), 201
    except Exception as e:
        import traceback
        err = traceback.format_exc()
        print(f"Error saving score: {err}")
        return jsonify({'error': 'Failed to save score', 'details': str(err)}), 500

@app.route('/api/user/saved_resources', methods=['GET', 'POST'])
@jwt_required()
def saved_resources():
    current_user_id = get_jwt_identity()
    
    if request.method == 'GET':
        try:
            res = supabase.table('saved_resources').select('resource_id, resources(title, url, type)').eq('user_id', current_user_id).execute()
            saved_items = []
            for item in res.data:
                if item.get('resources'):
                    saved_items.append({
                        'id': item['resource_id'],
                        'title': item['resources']['title'],
                        'url': item['resources']['url'],
                        'type': item['resources']['type']
                    })
            return jsonify({'data': saved_items}), 200
        except Exception as e:
            return jsonify({'error': 'Failed to fetch saved resources'}), 500

    if request.method == 'POST':
        data = request.json
        resource_id = data.get('resource_id')
        if not resource_id:
            return jsonify({'error': 'resource_id required'}), 400
        
        try:
            new_bookmark = {'user_id': current_user_id, 'resource_id': resource_id}
            supabase.table('saved_resources').insert(new_bookmark).execute()
            return jsonify({'message': 'Resource saved'}), 201
        except Exception as e:
            return jsonify({'error': 'Failed to save resource or already saved'}), 400

@app.route('/api/user/saved_resources/<int:resource_id>', methods=['DELETE'])
@jwt_required()
def delete_saved_resource(resource_id):
    current_user_id = get_jwt_identity()
    try:
        supabase.table('saved_resources').delete().eq('user_id', current_user_id).eq('resource_id', resource_id).execute()
        return jsonify({'message': 'Resource removed'}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to remove resource'}), 500


# --- Admin Helpers ---
def check_admin_access():
    try:
        current_user_id = get_jwt_identity()
        user_res = supabase.table('users').select('is_admin').eq('id', current_user_id).execute()
        
        if not user_res.data:
            return False
            
        return bool(user_res.data[0].get('is_admin', False))
    except Exception as e:
        # Fails gracefully if 'is_admin' column doesn't exist yet
        print(f"Admin check error (ensure is_admin column exists): {e}")
        return False

@app.route('/api/admin/check', methods=['GET'])
@jwt_required()
def check_admin():
    if not supabase: return jsonify({'error': 'DB Error'}), 500
    if check_admin_access():
        return jsonify({'is_admin': True}), 200
    return jsonify({'is_admin': False}), 403

# --- Admin Subject Endpoints ---
@app.route('/api/admin/courses', methods=['GET'])
@jwt_required()
def admin_courses():
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    res = supabase.table('courses').select('id, name').execute()
    return jsonify({'data': res.data}), 200
@app.route('/api/admin/resources/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_resource(id):
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    res = supabase.table('resources').delete().eq('id', id).execute()
    return jsonify({'message': 'Deleted', 'data': res.data}), 200

@app.route('/api/admin/upload', methods=['POST'])
@jwt_required()
def upload_resource_file():
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and file.filename.lower().endswith('.pdf'):
        filename = secure_filename(file.filename)
        # Generate a unique file path in the bucket to prevent overwriting
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        try:
            # Read file bytes
            file_bytes = file.read()
            
            # Upload to Supabase 'resources' bucket
            res = supabase.storage.from_("resources").upload(
                file=file_bytes,
                path=unique_filename,
                file_options={"content-type": "application/pdf"}
            )
            
            # Get public URL
            public_url = supabase.storage.from_("resources").get_public_url(unique_filename)
            
            return jsonify({'url': public_url}), 200
        except Exception as e:
            print(f"File upload error: {e}")
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Only PDF files are allowed'}), 400

@app.route('/api/admin/subjects', methods=['GET', 'POST'])
@jwt_required()
def admin_subjects():
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    
    if request.method == 'GET':
        res = supabase.table('subjects').select('*').execute()
        return jsonify({'data': res.data}), 200
        
    if request.method == 'POST':
        data = request.json
        if not data.get('name') or not data.get('course_id'):
            return jsonify({'error': 'Name and Course ID required'}), 400
        new_subject = {
            'name': data.get('name'),
            'course_id': data.get('course_id'),
            'semester': data.get('semester', 1),
            'color_code': data.get('color_code', 'blue'),
            'icon': data.get('icon', 'book')
        }
        res = supabase.table('subjects').insert(new_subject).execute()
        return jsonify({'message': 'Subject created', 'data': res.data}), 201

@app.route('/api/admin/subjects/<int:subject_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_subject_item(subject_id):
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    
    if request.method == 'PUT':
        data = request.json
        update_data = {k: v for k, v in data.items() if k in ['name', 'course_id', 'semester', 'color_code', 'icon']}
        res = supabase.table('subjects').update(update_data).eq('id', subject_id).execute()
        return jsonify({'message': 'Subject updated', 'data': res.data}), 200
        
    if request.method == 'DELETE':
        res = supabase.table('subjects').delete().eq('id', subject_id).execute()
        return jsonify({'message': 'Subject deleted'}), 200

# --- Admin Resource Endpoints ---
@app.route('/api/admin/resources', methods=['POST'])
@jwt_required()
def admin_resources():
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    if not data.get('title') or not data.get('subject_id') or not data.get('url') or not data.get('type'):
        return jsonify({'error': 'Missing fields'}), 400
    new_res = {
        'title': data.get('title'),
        'subject_id': data.get('subject_id'),
        'url': data.get('url'),
        'type': data.get('type')
    }
    res = supabase.table('resources').insert(new_res).execute()
    return jsonify({'message': 'Resource created', 'data': res.data}), 201

@app.route('/api/admin/resources/<int:resource_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_resource_item(resource_id):
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    
    if request.method == 'PUT':
        data = request.json
        update_data = {k: v for k, v in data.items() if k in ['title', 'subject_id', 'url', 'type']}
        res = supabase.table('resources').update(update_data).eq('id', resource_id).execute()
        return jsonify({'message': 'Resource updated', 'data': res.data}), 200
        
    if request.method == 'DELETE':
        res = supabase.table('resources').delete().eq('id', resource_id).execute()
        return jsonify({'message': 'Resource deleted'}), 200

# --- Admin Question Endpoints ---
@app.route('/api/admin/questions', methods=['POST'])
@jwt_required()
def admin_questions():
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    required_fields = ['question', 'subject_id', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option']
    if not all(data.get(f) for f in required_fields):
        return jsonify({'error': 'Missing fields'}), 400
        
    new_q = {f: data.get(f) for f in required_fields}
    res = supabase.table('questions').insert(new_q).execute()
    return jsonify({'message': 'Question created', 'data': res.data}), 201

@app.route('/api/admin/questions/<int:question_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def admin_question_item(question_id):
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    
    if request.method == 'PUT':
        data = request.json
        update_data = {k: v for k, v in data.items() if k in ['question', 'subject_id', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option']}
        res = supabase.table('questions').update(update_data).eq('id', question_id).execute()
        return jsonify({'message': 'Question updated', 'data': res.data}), 200
        
    if request.method == 'DELETE':
        res = supabase.table('questions').delete().eq('id', question_id).execute()
        return jsonify({'message': 'Question deleted'}), 200

# --- Admin User Endpoints ---
@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def admin_users():
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    res = supabase.table('users').select('id, name, email, is_admin, created_at, last_login').execute()
    return jsonify({'data': res.data}), 200

@app.route('/api/admin/users/<string:user_id>', methods=['DELETE'])
@jwt_required()
def admin_user_delete(user_id):
    if not check_admin_access(): return jsonify({'error': 'Unauthorized'}), 403
    # Prevent admin from deleting themselves
    if str(get_jwt_identity()) == str(user_id):
        return jsonify({'error': 'Cannot delete your own account'}), 400
    res = supabase.table('users').delete().eq('id', user_id).execute()
    return jsonify({'message': 'User deleted'}), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
