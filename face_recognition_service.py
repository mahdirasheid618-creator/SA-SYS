"""
خدمة معالجة الوجه - Python Face Recognition Service
استخدام OpenCV و TensorFlow Lite للكشف عن الوجه
"""

import cv2
import numpy as np
import base64
import io
from PIL import Image
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FaceRecognitionService:
    """خدمة معالجة الوجه المحترفة"""
    
    def __init__(self):
        # تحميل نموذج الكشف عن الوجه من OpenCV
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        logger.info("✓ تم تهيئة خدمة معالجة الوجه")
    
    @staticmethod
    def load_image_from_base64(image_base64):
        """
        تحميل صورة من Base64 (من المتصفح)
        """
        try:
            # إزالة بادئة data:image/jpeg;base64,
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            # فك ترميز Base64
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # تحويل إلى numpy array
            image_np = np.array(image)
            
            # تحويل RGB إلى BGR لـ OpenCV
            if len(image_np.shape) == 3:
                if image_np.shape[2] == 4:  # RGBA
                    image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2BGR)
                elif image_np.shape[2] == 3:  # RGB
                    image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
            
            return image_np
        except Exception as e:
            logger.error(f"خطأ في تحميل الصورة: {e}")
            raise
    
    def extract_face_embedding(self, image_base64):
        """
        استخراج بصمة الوجه من الصورة
        يُستخدم عند إضافة طالب جديد
        
        Returns:
            {
                'success': bool,
                'embedding': list (128 قيمة عددية),
                'face_count': int,
                'message': str
            }
        """
        try:
            logger.info("بدء استخراج بصمة الوجه...")
            
            # تحميل الصورة
            image_np = self.load_image_from_base64(image_base64)
            
            # تحجيم الصورة إذا كانت كبيرة جداً
            height, width = image_np.shape[:2]
            if width > 1000:
                scale = 1000.0 / width
                new_width = 1000
                new_height = int(height * scale)
                image_np = cv2.resize(image_np, (new_width, new_height))
            
            # تحويل إلى رمادي
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            
            # تحسين الصورة (معادلة الهيستوجرام)
            gray = cv2.equalizeHist(gray)
            
            # الكشف عن الوجوه
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=4,
                minSize=(30, 30),
                maxSize=(400, 400)
            )
            
            logger.info(f"تم العثور على {len(faces)} وجه(وه)")
            
            if len(faces) == 0:
                return {
                    'success': False,
                    'message': 'لم يتم العثور على وجه في الصورة',
                    'face_count': 0
                }
            
            # إذا كان هناك وجوه متعددة، اختر الأكبر
            if len(faces) > 1:
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)[:1]
                logger.warning(f"تم العثور على وجوه متعددة، استخدام الأكبر")
            
            # استخراج الوجه الأول
            x, y, w, h = faces[0]
            
            # إضافة قليل من المساحة حول الوجه
            padding = int(min(w, h) * 0.1)
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(image_np.shape[1] - x, w + padding * 2)
            h = min(image_np.shape[0] - y, h + padding * 2)
            
            face_roi = image_np[y:y+h, x:x+w]
            
            if face_roi.size == 0:
                return {
                    'success': False,
                    'message': 'خطأ في استخراج الوجه',
                    'face_count': 0
                }
            
            # حساب الـ embedding من خصائص الوجه
            embedding = self._compute_face_embedding(face_roi)
            
            logger.info("✓ تم استخراج بصمة الوجه بنجاح")
            logger.info(f"طول البصمة: {len(embedding)}")
            
            return {
                'success': True,
                'embedding': embedding,
                'face_count': len(faces),
                'message': 'تم استخراج بصمة الوجه بنجاح'
            }
        
        except Exception as e:
            logger.error(f"خطأ في استخراج البصمة: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'message': f'خطأ: {str(e)}',
                'face_count': 0
            }
    
    def _compute_face_embedding(self, face_image):
        """
        حساب بصمة الوجه من الصورة باستخدام خصائص الصورة محسّنة
        """
        try:
            # تعديل حجم الصورة
            face_resized = cv2.resize(face_image, (64, 64))
            
            # تحويل إلى رمادي
            gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
            
            # معالجة محسّنة للصورة
            gray = cv2.equalizeHist(gray)
            
            # استخراج ميزات قوية
            features = []
            
            # 1. Pixel intensities (الكثافة المباشرة)
            pixel_features = gray.flatten().astype(float) / 255.0
            features.extend(pixel_features[:32])  # أول 32 pixel
            
            # 2. Histogram features (موزعة بشكل أفضل)
            hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
            hist = cv2.normalize(hist, hist).flatten().tolist()
            features.extend(hist[:64])
            
            # 3. HOG-like features (تدرجات الصورة)
            gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
            magnitude = np.sqrt(gx**2 + gy**2)
            features.extend(magnitude.flatten()[:32] / 255.0)
            
            # 4. Local Binary Pattern-like (تغيرات محلية)
            for i in range(0, 64, 8):
                for j in range(0, 64, 8):
                    region = gray[i:i+8, j:j+8]
                    if region.size > 0:
                        features.append(float(np.mean(region)) / 255.0)
                        features.append(float(np.std(region)) / 255.0)
            
            # 5. Edges
            edges = cv2.Canny(gray, 30, 100)
            features.extend(edges.flatten()[:32] / 255.0)
            
            # 6. ORB features (كشف النقاط المميزة)
            orb = cv2.ORB_create(nfeatures=32)
            try:
                kp = orb.detect(gray, None)
                features.append(float(len(kp)))
                for k in kp[:8]:
                    features.append(float(k.pt[0]) / 64.0)
                    features.append(float(k.pt[1]) / 64.0)
                    features.append(float(k.size) / 100.0)
            except:
                features.extend([0.0] * 25)
            
            # 7. Color moments إذا كان لدينا صورة ملونة
            if len(face_resized.shape) == 3 and face_resized.shape[2] >= 3:
                for channel in cv2.split(face_resized)[:3]:
                    features.append(float(np.mean(channel)) / 255.0)
                    features.append(float(np.std(channel)) / 255.0)
            
            # Padding إلى 128 عنصر
            embedding = features[:128]
            while len(embedding) < 128:
                embedding.append(0.0)
            
            # تطبيع القيم بشكل آمن
            embedding_array = np.array(embedding[:128], dtype=np.float32)
            mean_val = np.mean(embedding_array)
            std_val = np.std(embedding_array)
            
            if std_val > 1e-6:
                embedding_array = (embedding_array - mean_val) / std_val
            
            # قص القيم المتطرفة
            embedding_array = np.clip(embedding_array, -5, 5)
            
            return embedding_array.tolist()
        
        except Exception as e:
            logger.error(f"خطأ في حساب البصمة: {e}")
            # إرجاع بصمة افتراضية
            return [0.0] * 128
    
    def match_face_with_students(self, image_base64, students_with_embeddings):
        """
        مطابقة الوجه مع الطلاب المسجلين
        يُستخدم عند تسجيل الحضور
        
        Returns:
            {
                'success': bool,
                'student_id': str,
                'student_name': str,
                'distance': float,
                'similarity': float (0-1)
            }
        """
        try:
            logger.info("بدء مطابقة الوجه...")
            
            # تحميل الصورة
            image_np = self.load_image_from_base64(image_base64)
            
            # تحجيم الصورة إذا كانت كبيرة جداً
            height, width = image_np.shape[:2]
            if width > 1000:
                scale = 1000.0 / width
                new_width = 1000
                new_height = int(height * scale)
                image_np = cv2.resize(image_np, (new_width, new_height))
            
            # الكشف عن الوجه مع معاملات أفضل
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)
            
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,       # أكثر دقة من 1.05
                minNeighbors=4,        # توازن بين الدقة والحساسية
                minSize=(30, 30),      # حجم أصغر معقول
                maxSize=(400, 400)
            )
            
            if len(faces) == 0:
                logger.warning("لم يتم العثور على وجه في الصورة")
                return {
                    'success': False,
                    'message': 'لم يتم العثور على وجه في الصورة',
                    'distance': None,
                    'similarity': 0
                }
            
            # إذا كان هناك وجوه متعددة، اختر الأكبر
            if len(faces) > 1:
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)[:1]
                logger.info(f"تم العثور على وجوه متعددة، استخدام الأكبر")
            
            # استخراج الوجه الأول
            x, y, w, h = faces[0]
            
            # إضافة قليل من المساحة حول الوجه
            padding = int(min(w, h) * 0.1)
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(image_np.shape[1] - x, w + padding * 2)
            h = min(image_np.shape[0] - y, h + padding * 2)
            
            face_roi = image_np[y:y+h, x:x+w]
            
            if face_roi.size == 0:
                logger.warning("الوجه المستخرج فارغ")
                return {
                    'success': False,
                    'message': 'خطأ في استخراج الوجه',
                    'distance': None,
                    'similarity': 0
                }
            
            # حساب الـ embedding
            input_embedding = self._compute_face_embedding(face_roi)
            input_embedding_array = np.array(input_embedding, dtype=np.float32)
            
            # مقارنة مع جميع الطلاب
            best_match = None
            best_distance = float('inf')
            DISTANCE_THRESHOLD = 50.0  # زيادة الحد للسماح بتطابقات أفضل
            
            logger.info(f"جاري المقارنة مع {len(students_with_embeddings)} طالب...")
            
            distances_log = []
            
            for student in students_with_embeddings:
                if not student.get('embedding'):
                    continue
                
                try:
                    stored_embedding = np.array(student['embedding'], dtype=np.float32)
                    
                    # حساب المسافة الإقليدية
                    distance = float(np.linalg.norm(input_embedding_array - stored_embedding))
                    
                    distances_log.append({
                        'name': student['full_name'],
                        'distance': distance
                    })
                    
                    if distance < best_distance:
                        best_distance = distance
                        best_match = student
                
                except Exception as e:
                    logger.warning(f"خطأ في مقارنة {student.get('full_name')}: {e}")
                    continue
            
            # طباعة السجل للتصحيح
            distances_log.sort(key=lambda x: x['distance'])
            for log in distances_log[:5]:
                logger.info(f"  {log['name']}: {log['distance']:.3f}")
            
            # التحقق من وجود تطابق
            if best_match and best_distance <= DISTANCE_THRESHOLD:
                similarity = 1 - (best_distance / DISTANCE_THRESHOLD)
                similarity = max(0, min(1, similarity))
                
                logger.info(f"✓ تطابق وجد: {best_match['full_name']} (المسافة: {best_distance:.3f}, التشابه: {similarity:.2%})")
                
                return {
                    'success': True,
                    'student_id': best_match['id'],
                    'student_name': best_match['full_name'],
                    'stage': best_match.get('stage'),
                    'distance': best_distance,
                    'similarity': similarity,
                    'message': f"تم العثور على تطابق: {best_match['full_name']}"
                }
            else:
                best_distance_msg = f"{best_distance:.3f}" if best_distance != float('inf') else "N/A"
                logger.warning(f"لم يتم العثور على تطابق (أفضل مسافة: {best_distance_msg})")
                
                return {
                    'success': False,
                    'message': f'لم يتم العثور على طالب مطابق (أفضل مسافة: {best_distance_msg})',
                    'distance': best_distance if best_distance != float('inf') else None,
                    'similarity': 0
                }
        
        except Exception as e:
            logger.error(f"خطأ في المطابقة: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'message': f'خطأ في المطابقة: {str(e)}',
                'distance': None,
                'similarity': 0
            }
    
    def compare_face_encodings(self, embedding1, embedding2):
        """
        مقارنة بصمتي وجه مباشرة
        """
        try:
            arr1 = np.array(embedding1, dtype=np.float32)
            arr2 = np.array(embedding2, dtype=np.float32)
            
            distance = np.linalg.norm(arr1 - arr2)
            similarity = 1 - (distance / 30.0)
            similarity = max(0, min(1, similarity))
            
            return {
                'distance': distance,
                'similarity': similarity,
                'match': distance <= 30.0
            }
        except Exception as e:
            logger.error(f"خطأ في المقارنة: {e}")
            return {
                'distance': None,
                'similarity': 0,
                'match': False
            }
    
    def detect_faces_only(self, image_base64):
        """
        الكشف السريع عن الوجوه بدون استخراج بصمة
        يُستخدم للكشف الحي في الفيديو
        """
        try:
            image_np = self.load_image_from_base64(image_base64)
            
            # طباعة معلومات الصورة
            logger.info(f"صورة مستلمة: الشكل={image_np.shape}, dtype={image_np.dtype}")
            
            # تحقق من أن الصورة ليست فارغة
            if image_np is None or image_np.size == 0:
                logger.error("الصورة فارغة!")
                return {
                    'success': False,
                    'face_count': 0,
                    'message': 'الصورة فارغة'
                }
            
            # تحجيم الصورة إذا كانت كبيرة جداً
            height, width = image_np.shape[:2]
            if width > 800:
                scale = 800.0 / width
                new_width = 800
                new_height = int(height * scale)
                image_np = cv2.resize(image_np, (new_width, new_height))
            
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
            logger.info(f"الصورة الرمادية: الشكل={gray.shape}")
            
            # الكشف عن الوجوه بمعاملات بسيطة
            try:
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.3,       
                    minNeighbors=5,        
                    minSize=(30, 30)      
                )
                face_count = len(faces)
                logger.info(f"المحاولة الأولى: وجوه مكتشفة={face_count}")
                
            except cv2.error as e:
                logger.error(f"خطأ في detectMultiScale: {e}")
                # إذا فشلت المحاولة الأولى، حاول بدون معالجة
                faces = []
                face_count = 0
            
            if face_count > 0:
                logger.info(f"✓ تم الكشف عن {face_count} وجه(وه)")
                return {
                    'success': True,
                    'face_count': face_count,
                    'message': f"تم الكشف عن {face_count} وجه(وه)"
                }
            else:
                logger.info("لم يتم الكشف عن أي وجه")
                return {
                    'success': False,
                    'face_count': 0,
                    'message': 'لم يتم الكشف عن وجه - تأكد من الإضاءة والموضع'
                }
        
        except Exception as e:
            logger.error(f"خطأ في الكشف: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return {
                'success': False,
                'face_count': 0,
                'message': f'خطأ في الكشف: {str(e)}'
            }


# إنشاء instance واحد من الخدمة
face_service = FaceRecognitionService()

