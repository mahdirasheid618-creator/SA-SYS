/**
 * Validators - التحقق من صحة المدخلات
 */

const Validators = (function() {

  /**
   * التحقق من وجود صورة
   */
  function validateImageExists(file) {
    if (!file) {
      return {
        valid: false,
        error: 'لم يتم اختيار صورة'
      };
    }
    return { valid: true };
  }

  /**
   * التحقق من نوع الصورة
   */
  function validateImageType(file) {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!supportedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `صيغة الصورة غير مدعومة. الصيغ المدعومة: JPEG, PNG, WebP`
      };
    }
    return { valid: true };
  }

  /**
   * التحقق من حجم الصورة (بالبايتات)
   */
  function validateImageSize(file, maxSizeMB = 5) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: `حجم الصورة كبير جداً. الحد الأقصى: ${maxSizeMB}MB، الحجم الفعلي: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      };
    }
    
    if (file.size === 0) {
      return {
        valid: false,
        error: 'الملف فارغ'
      };
    }
    
    return { valid: true };
  }

  /**
   * التحقق من أبعاد الصورة
   */
  function validateImageDimensions(width, height, minWidth = 100, minHeight = 100) {
    if (width < minWidth || height < minHeight) {
      return {
        valid: false,
        error: `أبعاد الصورة صغيرة جداً. الحد الأدنى: ${minWidth}x${minHeight}، الأبعاد الفعلية: ${width}x${height}`
      };
    }
    return { valid: true };
  }

  /**
   * التحقق الشامل من الصورة
   */
  async function validateImageComplete(file, options = {}) {
    const {
      maxSizeMB = 5,
      minWidth = 100,
      minHeight = 100
    } = options;

    // التحقق من الوجود
    let validation = validateImageExists(file);
    if (!validation.valid) return validation;

    // التحقق من النوع
    validation = validateImageType(file);
    if (!validation.valid) return validation;

    // التحقق من الحجم
    validation = validateImageSize(file, maxSizeMB);
    if (!validation.valid) return validation;

    // التحقق من الأبعاد
    try {
      const dimensions = await ImageUtils.getImageDimensions(file);
      validation = validateImageDimensions(dimensions.width, dimensions.height, minWidth, minHeight);
      if (!validation.valid) return validation;
    } catch (error) {
      return {
        valid: false,
        error: 'فشل قراءة أبعاد الصورة: ' + error.message
      };
    }

    return { valid: true };
  }

  /**
   * التحقق من استجابة API
   */
  function validateAPIResponse(response) {
    if (!response || typeof response !== 'object') {
      return {
        valid: false,
        error: 'استجابة غير صحيحة من الخادم'
      };
    }

    if (response.success === false) {
      return {
        valid: false,
        error: response.error || 'حدث خطأ في معالجة الطلب'
      };
    }

    return { valid: true };
  }

  /**
   * التحقق من البصمة (Embedding)
   */
  function validateEmbedding(embedding) {
    if (!Array.isArray(embedding)) {
      return {
        valid: false,
        error: 'البصمة ليست من النوع الصحيح'
      };
    }

    if (embedding.length === 0) {
      return {
        valid: false,
        error: 'البصمة فارغة'
      };
    }

    if (!embedding.every(val => typeof val === 'number')) {
      return {
        valid: false,
        error: 'البصمة تحتوي على قيم غير رقمية'
      };
    }

    return { valid: true };
  }

  /**
   * التحقق من وقت المعالجة
   */
  function validateProcessingTime(processingTime) {
    if (typeof processingTime !== 'number' || processingTime < 0) {
      return {
        valid: false,
        error: 'وقت المعالجة غير صحيح'
      };
    }

    if (processingTime > 60) {
      return {
        valid: false,
        error: 'استغرقت معالجة الصورة وقتاً طويلاً جداً'
      };
    }

    return { valid: true };
  }

  /**
   * التحقق من صورة Base64
   */
  function validateBase64Image(base64String) {
    if (!base64String || typeof base64String !== 'string') {
      return {
        valid: false,
        error: 'صورة Base64 غير صحيحة'
      };
    }

    if (!base64String.includes('data:image/')) {
      return {
        valid: false,
        error: 'الصورة لا تحتوي على رأس MIME صحيح'
      };
    }

    return { valid: true };
  }

  return {
    validateImageExists,
    validateImageType,
    validateImageSize,
    validateImageDimensions,
    validateImageComplete,
    validateAPIResponse,
    validateEmbedding,
    validateProcessingTime,
    validateBase64Image
  };
})();
