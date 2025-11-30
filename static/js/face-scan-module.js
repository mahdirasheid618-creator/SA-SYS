/**
 * Face Scan Module - وحدة تحميل الصورة وتحليل الوجه
 * مثال على استخدام الملفات الجديدة
 */

const FaceScanModule = (function() {

  // عناصر DOM
  let fileInput, previewImage, scanButton, resultContainer;
  let currentEmbedding = null;

  /**
   * تهيئة الوحدة
   */
  function init() {
    fileInput = document.getElementById('face-upload');
    previewImage = document.getElementById('face-preview');
    scanButton = document.getElementById('scan-button');
    resultContainer = document.getElementById('result-container');

    if (!fileInput || !scanButton) {
      console.error('عناصر DOM مفقودة');
      return false;
    }

    // ربط الأحداث
    fileInput.addEventListener('change', handleFileSelect);
    scanButton.addEventListener('click', handleScanClick);

    console.log('[FaceScanModule] تم التهيئة بنجاح');
    return true;
  }

  /**
   * معالجة اختيار الملف
   */
  async function handleFileSelect(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    try {
      // التحقق من الصورة
      const validation = await Validators.validateImageComplete(file);
      if (!validation.valid) {
        ErrorHandler.showErrorMessage(validation.error);
        fileInput.value = '';
        return;
      }

      // عرض الصورة
      const base64 = await ImageUtils.fileToBase64(file);
      if (previewImage) {
        previewImage.src = base64;
        previewImage.style.display = 'block';
      }

      // تفعيل زر الفحص
      scanButton.disabled = false;
      ErrorHandler.showSuccessMessage('تم تحميل الصورة بنجاح');

    } catch (error) {
      ErrorHandler.showErrorMessage(error.message);
      fileInput.value = '';
    }
  }

  /**
   * معالجة زر الفحص
   */
  async function handleScanClick() {
    if (!fileInput.files[0]) {
      ErrorHandler.showErrorMessage('الرجاء اختيار صورة أولاً');
      return;
    }

    try {
      // تعطيل الزر أثناء المعالجة
      scanButton.disabled = true;
      scanButton.textContent = 'جاري الفحص...';

      // معالجة الصورة
      const result = await FaceHandler.processImageFile(fileInput.files[0], {
        compress: true,
        validate: true,
        showProgress: true
      });

      if (result.success) {
        currentEmbedding = result.embedding;
        displayResult(result);
        ErrorHandler.showSuccessMessage('تم تحليل الوجه بنجاح');

        // محاولة مقارنة مع الوجوه المحفوظة
        const match = await FaceHandler.matchCurrentFace(currentEmbedding);
        displayMatchResult(match);

      } else {
        ErrorHandler.showErrorMessage(result.error);
      }

    } catch (error) {
      ErrorHandler.showErrorMessage(error.message);
    } finally {
      scanButton.disabled = false;
      scanButton.textContent = 'فحص الوجه';
    }
  }

  /**
   * عرض نتائج التحليل
   */
  function displayResult(result) {
    if (!resultContainer) return;

    const html = `
      <div class="result-card">
        <h3>نتائج التحليل</h3>
        <div class="result-info">
          <p><strong>الحالة:</strong> ✓ تم العثور على وجه</p>
          <p><strong>وقت المعالجة:</strong> ${result.processingTime}ms</p>
          <p><strong>حجم البصمة:</strong> ${result.embedding.length} نقطة</p>
        </div>
        <div class="result-image">
          <img src="${result.image}" alt="صورة الوجه المحللة" />
        </div>
      </div>
    `;

    resultContainer.innerHTML = html;
    resultContainer.style.display = 'block';
  }

  /**
   * عرض نتائج المقارنة
   */
  function displayMatchResult(match) {
    if (!resultContainer || !match.matched) return;

    const matchHtml = `
      <div class="match-card">
        <h3>نتائج المقارنة</h3>
        <div class="match-info">
          <p><strong>النتيجة:</strong> ${match.message}</p>
          <p><strong>نسبة التطابق:</strong> ${(match.similarity * 100).toFixed(2)}%</p>
        </div>
      </div>
    `;

    resultContainer.innerHTML += matchHtml;
  }

  /**
   * حفظ البصمة الحالية
   */
  async function saveCurrentEmbedding(name = 'وجه جديد') {
    if (!currentEmbedding) {
      ErrorHandler.showErrorMessage('لا توجد بصمة لحفظها');
      return false;
    }

    try {
      await FaceHandler.storeFaceEmbedding({
        name: name,
        embedding: currentEmbedding,
        timestamp: new Date().toISOString()
      });

      ErrorHandler.showSuccessMessage('تم حفظ البصمة بنجاح');
      return true;
    } catch (error) {
      ErrorHandler.showErrorMessage(error.message);
      return false;
    }
  }

  /**
   * الحصول على البصمة الحالية
   */
  function getCurrentEmbedding() {
    return currentEmbedding;
  }

  /**
   * مسح الصورة والنتائج
   */
  function clear() {
    fileInput.value = '';
    if (previewImage) {
      previewImage.src = '';
      previewImage.style.display = 'none';
    }
    if (resultContainer) {
      resultContainer.innerHTML = '';
      resultContainer.style.display = 'none';
    }
    scanButton.disabled = false;
    currentEmbedding = null;
  }

  return {
    init,
    saveCurrentEmbedding,
    getCurrentEmbedding,
    clear
  };
})();

// تهيئة الوحدة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  ErrorHandler.setupGlobalErrorHandler();
  FaceScanModule.init();
});
