from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from functools import wraps
import os
from datetime import datetime, timedelta
from face_recognition_service import face_service

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)
app.config['SESSION_COOKIE_SECURE'] = False  
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):

        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    if session.get('username'):
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        login_role = request.form.get('login_role', 'supervisor')
        
        if login_role == 'supervisor':
            sup_name = request.form.get('sup_name', '')
            sup_code = request.form.get('sup_code', '')
            session.permanent = True
            session['role'] = 'supervisor'
            session['permissions'] = 'full'
            session['username'] = sup_name
        else:
            username = request.form.get('username', '')
            password = request.form.get('password', '')
            session.permanent = True
            session['role'] = 'instructor'
            session['permissions'] = 'default'
            session['username'] = username
        
        # Track last login timestamp
        from datetime import datetime
        session['last_login'] = datetime.now().isoformat()
        
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/students')
@login_required
def students():
    return render_template('students.html')

@app.route('/add_student')
@app.route('/add-student')
@login_required
def add_student():
    return render_template('add_student.html')

@app.route('/attendance')
@login_required
def attendance():
    return render_template('attendance.html')

@app.route('/instructors')
@login_required
def instructors():
    return render_template('instructors.html')

@app.route('/add_instructor')
@login_required
def add_instructor():
    return render_template('add_instructor.html')

@app.route('/supervisors')
@login_required
def supervisors():
    return render_template('supervisors.html')

@app.route('/add_supervisor')
@login_required
def add_supervisor():
    return render_template('add_supervisor.html')

@app.route('/reports')
@login_required
def reports():
    return render_template('reports.html')

@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html')

@app.route('/certificate')
@login_required
def certificate():
    return render_template('certificate.html')

@app.route('/api/students', methods=['GET'])
def api_students():
    return jsonify([])

@app.route('/api/attendance', methods=['GET'])
def api_attendance():
    return jsonify([])


@app.errorhandler(404)
def page_not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('500.html'), 500


@app.route('/api/face/extract-embedding', methods=['POST'])
def extract_embedding():
    """
    استخراج بصمة الوجه من صورة
    يُستخدم عند إضافة طالب جديد
    
    Request:
        {
            'image': 'data:image/jpeg;base64,...'
        }
    """
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({
                'success': False,
                'message': 'لم يتم إرسال صورة'
            }), 400
        
        result = face_service.extract_face_embedding(image_base64)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ: {str(e)}'
        }), 500


@app.route('/api/face/match-attendance', methods=['POST'])
def match_attendance():
    """
    مطابقة الوجه مع الطلاب لتسجيل الحضور
    
    Request:
        {
            'image': 'data:image/jpeg;base64,...',
            'students': [
                {'id': '...', 'full_name': '...', 'stage': '...', 'embedding': [...]},
                ...
            ]
        }
    """
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        students = data.get('students', [])
        
        if not image_base64:
            return jsonify({
                'success': False,
                'message': 'لم يتم إرسال صورة'
            }), 400
        
        if not students:
            return jsonify({
                'success': False,
                'message': 'لا توجد بيانات طلاب'
            }), 400
        
        students_with_embeddings = [
            s for s in students if s.get('embedding')
        ]
        
        if not students_with_embeddings:
            return jsonify({
                'success': False,
                'message': 'لا توجد بيانات بصمات طلاب'
            }), 400
        
        result = face_service.match_face_with_students(
            image_base64,
            students_with_embeddings
        )
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ: {str(e)}'
        }), 500


@app.route('/api/face/compare', methods=['POST'])
def compare_embeddings():
    """
    مقارنة بصمتي وجه مباشرة
    
    Request:
        {
            'embedding1': [...],
            'embedding2': [...]
        }
    """
    try:
        data = request.get_json()
        embedding1 = data.get('embedding1')
        embedding2 = data.get('embedding2')
        
        if not embedding1 or not embedding2:
            return jsonify({
                'success': False,
                'message': 'لم يتم إرسال بصمات'
            }), 400
        
        result = face_service.compare_face_encodings(embedding1, embedding2)
        return jsonify({
            'success': True,
            **result
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'خطأ: {str(e)}'
        }), 500

@app.route('/api/face/detect-only', methods=['POST'])
def detect_faces_only():
    """
    الكشف السريع عن الوجوه بدون استخراج بصمة
    يُستخدم للكشف الحي في الفيديو
    
    Request:
        {
            'image': 'data:image/jpeg;base64,...'
        }
    
    Response:
        {
            'success': bool,
            'face_count': int,
            'message': str
        }
    """
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({
                'success': False,
                'face_count': 0,
                'message': 'لم يتم إرسال صورة'
            }), 400
        
        result = face_service.detect_faces_only(image_base64)
        return jsonify({
            'success': result['success'],
            'face_count': result.get('face_count', 0),
            'message': result.get('message', '')
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'face_count': 0,
            'message': f'خطأ: {str(e)}'
        }), 500


if __name__ == '__main__':
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True,
        use_reloader=True
    )
