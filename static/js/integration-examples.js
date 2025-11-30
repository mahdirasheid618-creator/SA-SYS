/**
 * Integration Guide - دليل دمج الملفات الجديدة
 * كيفية استخدام الملفات الجديدة مع الصفحات الموجودة
 */

// ============================================================================
// 1. إضافة الملفات إلى layout.html
// ============================================================================

/*
<!-- في نهاية </body> قبل إغلاق الوسم -->
<script src="/static/js/helpers.js"></script>
<script src="/static/js/ui.js"></script>
<script src="/static/js/image-utils.js"></script>
<script src="/static/js/validators.js"></script>
<script src="/static/js/error-handler.js"></script>
<script src="/static/js/face-handler.js"></script>

<!-- وسائط اختيارية -->
<script src="/static/js/face-scan-module.js"></script>
<script src="/static/js/test-suite.js"></script>
*/

// ============================================================================
// 2. مثال: صفحة الحضور (attendance.html)
// ============================================================================

/*
<div class="attendance-container">
  <h2>تحميل صورة الطالب</h2>
  
  <!-- تحميل الصورة -->
  <input type="file" id="attendance-photo" accept="image/*" />
  
  <!-- معاينة -->
  <img id="attendance-preview" style="max-width: 300px; margin: 20px 0;" />
  
  <!-- الأزرار -->
  <button id="scan-attendance-btn">فحص الحضور</button>
  <button id="clear-attendance-btn">مسح</button>
  
  <!-- النتائج -->
  <div id="attendance-result"></div>
</div>

<script>
const AttendanceModule = (function() {
  const fileInput = document.getElementById('attendance-photo');
  const preview = document.getElementById('attendance-preview');
  const scanBtn = document.getElementById('scan-attendance-btn');
  const clearBtn = document.getElementById('clear-attendance-btn');
  const resultDiv = document.getElementById('attendance-result');
  
  function init() {
    fileInput.addEventListener('change', handleFileSelect);
    scanBtn.addEventListener('click', handleScan);
    clearBtn.addEventListener('click', handleClear);
  }
  
  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      // التحقق من الصورة
      const validation = await Validators.validateImageComplete(file);
      if (!validation.valid) {
        ErrorHandler.showErrorMessage(validation.error);
        return;
      }
      
      // عرض المعاينة
      const base64 = await ImageUtils.fileToBase64(file);
      preview.src = base64;
      preview.style.display = 'block';
      
      ErrorHandler.showSuccessMessage('تم تحميل الصورة بنجاح');
    } catch (error) {
      ErrorHandler.showErrorMessage(error.message);
    }
  }
  
  async function handleScan() {
    if (!fileInput.files[0]) {
      ErrorHandler.showErrorMessage('الرجاء اختيار صورة');
      return;
    }
    
    try {
      scanBtn.disabled = true;
      scanBtn.textContent = 'جاري الفحص...';
      
      const result = await FaceHandler.processImageFile(fileInput.files[0]);
      
      if (result.success) {
        // محاولة المطابقة
        const match = await FaceHandler.matchCurrentFace(result.embedding);
        
        if (match.matched) {
          resultDiv.innerHTML = `
            <div class="success">
              ✓ تم تأكيد الحضور - ${match.message}
            </div>
          `;
          ErrorHandler.showSuccessMessage('تم تسجيل الحضور');
        } else {
          resultDiv.innerHTML = `
            <div class="warning">
              ⚠ لم يتم التعرف على الطالب - ${match.message}
            </div>
          `;
          ErrorHandler.showWarningMessage('الطالب غير مسجل مسبقاً');
        }
      } else {
        ErrorHandler.showErrorMessage(result.error);
      }
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = 'فحص الحضور';
    }
  }
  
  function handleClear() {
    fileInput.value = '';
    preview.src = '';
    preview.style.display = 'none';
    resultDiv.innerHTML = '';
  }
  
  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  AttendanceModule.init();
});
</script>
*/

// ============================================================================
// 3. مثال: صفحة إضافة الطالب (add_student.html)
// ============================================================================

/*
<form id="add-student-form">
  <!-- البيانات الأساسية -->
  <input type="text" id="student-name" placeholder="اسم الطالب" required />
  <input type="email" id="student-email" placeholder="البريد الإلكتروني" />
  
  <!-- صورة الوجه -->
  <h3>صورة الطالب</h3>
  <input type="file" id="student-photo" accept="image/*" required />
  <img id="student-preview" style="max-width: 200px; margin: 10px 0;" />
  
  <!-- حالة المعالجة -->
  <div id="processing-status"></div>
  
  <!-- الأزرار -->
  <button type="submit">إضافة الطالب</button>
  <button type="button" onclick="document.getElementById('add-student-form').reset()">إعادة تعيين</button>
</form>

<script>
const AddStudentModule = (function() {
  const form = document.getElementById('add-student-form');
  const photoInput = document.getElementById('student-photo');
  const preview = document.getElementById('student-preview');
  const status = document.getElementById('processing-status');
  let studentFaceEmbedding = null;
  
  function init() {
    photoInput.addEventListener('change', handlePhotoSelect);
    form.addEventListener('submit', handleSubmit);
  }
  
  async function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      status.textContent = 'جاري معالجة الصورة...';
      
      // التحقق من الصورة
      const validation = await Validators.validateImageComplete(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // عرض المعاينة
      const base64 = await ImageUtils.fileToBase64(file);
      preview.src = base64;
      preview.style.display = 'block';
      
      // تحليل الوجه والحصول على البصمة
      const result = await FaceHandler.scanFace(base64);
      if (result.success) {
        studentFaceEmbedding = result.embedding;
        status.innerHTML = `
          <div class="success">
            ✓ تم تحليل الوجه بنجاح - وقت المعالجة: ${result.processingTime}ms
          </div>
        `;
        ErrorHandler.showSuccessMessage('تم قراءة بصمة الوجه');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      ErrorHandler.showErrorMessage(error.message);
      photoInput.value = '';
      preview.src = '';
      preview.style.display = 'none';
      studentFaceEmbedding = null;
    }
  }
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!studentFaceEmbedding) {
      ErrorHandler.showErrorMessage('الرجاء تحميل صورة الطالب');
      return;
    }
    
    const name = document.getElementById('student-name').value;
    const email = document.getElementById('student-email').value;
    
    try {
      // حفظ الطالب في Firebase (من جانب العميل)
      const studentData = {
        name: name,
        email: email,
        faceEmbedding: studentFaceEmbedding,
        createdAt: new Date().toISOString()
      };
      
      // هنا يتم الاتصال مع Firebase API (من جانب العميل)
      if (window.FirebaseAPI && window.FirebaseAPI.addStudent) {
        await window.FirebaseAPI.addStudent(studentData);
        ErrorHandler.showSuccessMessage('تم إضافة الطالب بنجاح');
        form.reset();
        preview.style.display = 'none';
        studentFaceEmbedding = null;
      } else {
        console.error('Firebase API غير متاح');
      }
    } catch (error) {
      ErrorHandler.showErrorMessage(error.message);
    }
  }
  
  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  AddStudentModule.init();
});
</script>
*/

// ============================================================================
// 4. مثال: دالة عامة للاستخدام في عدة صفحات
// ============================================================================

const CommonFaceCapture = (function() {
  
  /**
   * فتح محاورة لاختيار وتحليل صورة وجه
   */
  async function captureAndAnalyze(options = {}) {
    const {
      maxSizeMB = 5,
      compress = true,
      returnBase64 = false
    } = options;
    
    return new Promise((resolve, reject) => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
          reject(new Error('لم يتم اختيار ملف'));
          return;
        }
        
        try {
          // التحقق والمعالجة
          const result = await FaceHandler.processImageFile(file, {
            compress,
            validate: true,
            maxSizeMB,
            showProgress: true
          });
          
          if (result.success) {
            if (returnBase64) {
              result.base64 = await ImageUtils.fileToBase64(file);
            }
            resolve(result);
          } else {
            reject(new Error(result.error));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      fileInput.click();
    });
  }
  
  /**
   * عرض صور الوجه في معرض
   */
  function displayFaceGallery(embeddings, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = embeddings.map((item, index) => `
      <div class="face-item">
        <img src="${item.image}" alt="وجه ${index + 1}" />
        <p>${item.timestamp}</p>
        <small>التشابه: ${(item.similarity * 100).toFixed(2)}%</small>
      </div>
    `).join('');
  }
  
  /**
   * حفظ البصمة مع اسم مخصص
   */
  async function saveFaceWithName(embedding, name) {
    const data = {
      name: name,
      embedding: embedding,
      timestamp: new Date().toISOString()
    };
    
    return await FaceHandler.storeFaceEmbedding(data);
  }
  
  /**
   * مقارنة صورتين مباشرة
   */
  async function compareFiles(file1, file2, threshold = 0.6) {
    try {
      // معالجة الملف الأول
      const result1 = await FaceHandler.processImageFile(file1, { 
        compress: true,
        validate: true 
      });
      if (!result1.success) throw new Error('فشل معالجة الصورة الأولى');
      
      // معالجة الملف الثاني
      const result2 = await FaceHandler.processImageFile(file2, { 
        compress: true,
        validate: true 
      });
      if (!result2.success) throw new Error('فشل معالجة الصورة الثانية');
      
      // حساب التشابه
      const similarity = FaceHandler.calculateSimilarity(
        result1.embedding, 
        result2.embedding
      );
      
      return {
        similar: similarity >= threshold,
        similarity: similarity,
        message: similarity >= threshold 
          ? `تطابق بنسبة ${(similarity * 100).toFixed(2)}%`
          : `عدم تطابق (النسبة: ${(similarity * 100).toFixed(2)}%)`
      };
    } catch (error) {
      throw error;
    }
  }
  
  return {
    captureAndAnalyze,
    displayFaceGallery,
    saveFaceWithName,
    compareFiles
  };
})();

// ============================================================================
// 5. استخدام في main.js أو أي ملف عام
// ============================================================================

/*
// عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // إعداد معالج الأخطاء العام
  ErrorHandler.setupGlobalErrorHandler();
  
  // تحديث الصفحة
  if (window.PageModules && window.PageModules.attendance) {
    window.PageModules.attendance();
  }
});

// إذا كنت تستخدم نظام الـ modules
window.PageModules = window.PageModules || {};

window.PageModules.attendance = function() {
  console.log('تحميل صفحة الحضور');
  AttendanceModule?.init?.();
};

window.PageModules.addStudent = function() {
  console.log('تحميل صفحة إضافة الطالب');
  AddStudentModule?.init?.();
};
*/

// ============================================================================
// 6. أمثلة إضافية
// ============================================================================

// مثال 1: التقاط صورة من الكاميرا
async function captureFromCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById('video');
    video.srcObject = stream;
    
    const canvas = document.getElementById('canvas');
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const result = await FaceHandler.processCameraImage(canvas);
    stream.getTracks().forEach(track => track.stop());
    
    return result;
  } catch (error) {
    ErrorHandler.showErrorMessage('خطأ الوصول للكاميرا: ' + error.message);
  }
}

// مثال 2: معالجة صور متعددة
async function processMultipleImages(files) {
  const results = [];
  
  for (const file of files) {
    const result = await FaceHandler.processImageFile(file);
    results.push({
      filename: file.name,
      ...result
    });
  }
  
  return results;
}

// مثال 3: البحث عن أقرب مطابقة
async function findClosestMatch(embedding) {
  const stored = await FaceHandler.retrieveStoredEmbeddings();
  
  let best = null;
  let bestSimilarity = 0;
  
  for (const item of stored) {
    const similarity = FaceHandler.calculateSimilarity(
      embedding,
      item.embedding
    );
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      best = item;
    }
  }
  
  return { best, similarity: bestSimilarity };
}

// Export للاستخدام العام
window.IntegrationHelpers = {
  captureFromCamera,
  processMultipleImages,
  findClosestMatch,
  CommonFaceCapture
};
