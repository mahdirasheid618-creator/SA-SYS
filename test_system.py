import os
import sys
from pathlib import Path

def check_files():
    """التحقق من وجود جميع الملفات المطلوبة"""
    print("=" * 60)
    print("🔍 التحقق من الملفات...")
    print("=" * 60)
    
    base_path = Path(__file__).parent
    
    required_files = {
        "Python Files": [
            "app.py",
            "requirements.txt",
        ],
        "Templates": [
            "templates/layout.html",
            "templates/add_student.html",
            "templates/students.html",
            "templates/index.html",
        ],
        "JavaScript Files": [
            "static/js/face-human.js",
            "static/js/face-scan.js",
            "static/js/student.js",
            "static/js/firebase_init.js",
        ],
        "CSS Files": [
            "static/css/base.css",
            "static/css/layout.css",
            "static/css/components.css",
        ],
        "Documentation": [
            "FACE_SCAN_SETUP.md",
            "FACE_SCAN_COMPLETION.md",
            "TESTING_GUIDE.md",
            "PROJECT_SUMMARY.md",
        ]
    }
    
    total_files = 0
    found_files = 0
    
    for category, files in required_files.items():
        print(f"\n📂 {category}:")
        for file in files:
            file_path = base_path / file
            exists = file_path.exists()
            status = "✅" if exists else "❌"
            size = f"({file_path.stat().st_size} bytes)" if exists else ""
            print(f"  {status} {file} {size}")
            total_files += 1
            if exists:
                found_files += 1
    
    print("\n" + "=" * 60)
    print(f"📊 النتيجة: {found_files}/{total_files} ملف موجود")
    print("=" * 60)
    
    return found_files == total_files

def check_imports():
    """التحقق من أن جميع الـ imports توجد"""
    print("\n" + "=" * 60)
    print("🔧 التحقق من الـ Imports...")
    print("=" * 60)
    
    try:
        print("\n📚 جاري التحقق من المكتبات المطلوبة:")
        
        packages = {
            "Flask": "flask",
            "Jinja2": "jinja2",
            "SQLAlchemy": "flask_sqlalchemy",
        }
        
        all_ok = True
        for name, module in packages.items():
            try:
                __import__(module)
                print(f"  ✅ {name} موجود")
            except ImportError:
                print(f"  ❌ {name} غير موجود - تثبيت: pip install -r requirements.txt")
                all_ok = False
        
        return all_ok
    except Exception as e:
        print(f"  ⚠️ خطأ: {e}")
        return False

def check_app():
    """التحقق من أن app.py يحتوي على الـ routes المطلوبة"""
    print("\n" + "=" * 60)
    print("🚀 التحقق من الـ Routes...")
    print("=" * 60)
    
    try:
        app_path = Path(__file__).parent / "app.py"
        with open(app_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        routes = [
            ('/', 'index'),
            ('/dashboard', 'dashboard'),
            ('/login', 'login'),
            ('/logout', 'logout'),
            ('/students', 'students'),
            ('/add_student', 'add_student'),
            ('/add-student', 'backward compatibility'),
            ('/attendance', 'attendance'),
            ('/instructors', 'instructors'),
            ('/reports', 'reports'),
            ('/api/students', 'API'),
        ]
        
        print("\n🗺️ الـ Routes المكتشفة:")
        found = 0
        for route, description in routes:
            if f"'{route}'" in content or f'"{route}"' in content:
                print(f"  ✅ {route:<20} ({description})")
                found += 1
            else:
                print(f"  ⚠️ {route:<20} (قد لا يكون موجود)")
        
        print(f"\n✅ تم العثور على {found}/{len(routes)} route")
        return found >= len(routes) - 2  # السماح بـ 2 قد لا يكونوا موجودين
    
    except Exception as e:
        print(f"❌ خطأ: {e}")
        return False

def main():
    """تشغيل جميع الاختبارات"""
    print("\n" + "🎯 " * 10)
    print("بدء الاختبارات السريعة لنظام مسح الوجه")
    print("=" * 60)
    
    # الاختبار 1: الملفات
    files_ok = check_files()
    
    # الاختبار 2: الـ Imports
    imports_ok = check_imports()
    
    # الاختبار 3: الـ Routes
    routes_ok = check_app()
    
    # النتيجة النهائية
    print("\n" + "=" * 60)
    print("📊 ملخص الاختبارات:")
    print("=" * 60)
    print(f"✅ الملفات:  {'✓ نجاح' if files_ok else '✗ فشل'}")
    print(f"✅ المكتبات: {'✓ نجاح' if imports_ok else '✗ فشل'}")
    print(f"✅ الـ Routes: {'✓ نجاح' if routes_ok else '✗ فشل'}")
    
    print("\n" + "=" * 60)
    if files_ok and imports_ok and routes_ok:
        print("🎉 جميع الاختبارات نجحت!")
        print("يمكنك الآن تشغيل: python app.py")
    else:
        print("⚠️ بعض الاختبارات فشلت، يرجى التحقق من الأعلى")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
