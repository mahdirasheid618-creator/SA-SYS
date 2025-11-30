/**
 * Error Handler - معالجة الأخطاء والتنبيهات
 */

const ErrorHandler = (function() {

  // أنواع الأخطاء
  const ERROR_TYPES = {
    IMAGE_NOT_FOUND: 'IMAGE_NOT_FOUND',
    IMAGE_INVALID_TYPE: 'IMAGE_INVALID_TYPE',
    IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
    IMAGE_TOO_SMALL: 'IMAGE_TOO_SMALL',
    FACE_NOT_DETECTED: 'FACE_NOT_DETECTED',
    MULTIPLE_FACES: 'MULTIPLE_FACES',
    PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
    SERVER_ERROR: 'SERVER_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    STORAGE_ERROR: 'STORAGE_ERROR',
    UNKNOWN: 'UNKNOWN'
  };

  // رسائل الأخطاء العربية
  const ERROR_MESSAGES = {
    [ERROR_TYPES.IMAGE_NOT_FOUND]: 'لم يتم اختيار صورة',
    [ERROR_TYPES.IMAGE_INVALID_TYPE]: 'صيغة الصورة غير مدعومة',
    [ERROR_TYPES.IMAGE_TOO_LARGE]: 'حجم الصورة كبير جداً',
    [ERROR_TYPES.IMAGE_TOO_SMALL]: 'أبعاد الصورة صغيرة جداً',
    [ERROR_TYPES.FACE_NOT_DETECTED]: 'لم يتم العثور على وجه في الصورة',
    [ERROR_TYPES.MULTIPLE_FACES]: 'تم العثور على عدة وجوه، يجب أن تكون صورة لوجه واحد فقط',
    [ERROR_TYPES.PROCESSING_TIMEOUT]: 'انتهت مهلة معالجة الصورة',
    [ERROR_TYPES.SERVER_ERROR]: 'حدث خطأ في الخادم',
    [ERROR_TYPES.NETWORK_ERROR]: 'خطأ في الاتصال بالشبكة',
    [ERROR_TYPES.STORAGE_ERROR]: 'خطأ في حفظ البيانات',
    [ERROR_TYPES.UNKNOWN]: 'حدث خطأ غير معروف'
  };

  /**
   * تحديد نوع الخطأ
   */
  function identifyErrorType(errorMessage) {
    const message = String(errorMessage).toLowerCase();

    if (message.includes('image') && message.includes('not found')) {
      return ERROR_TYPES.IMAGE_NOT_FOUND;
    }
    if (message.includes('type') || message.includes('format')) {
      return ERROR_TYPES.IMAGE_INVALID_TYPE;
    }
    if (message.includes('large') || message.includes('حجم')) {
      return ERROR_TYPES.IMAGE_TOO_LARGE;
    }
    if (message.includes('small') || message.includes('صغير')) {
      return ERROR_TYPES.IMAGE_TOO_SMALL;
    }
    if (message.includes('face') && message.includes('not')) {
      return ERROR_TYPES.FACE_NOT_DETECTED;
    }
    if (message.includes('multiple') || message.includes('أكثر من')) {
      return ERROR_TYPES.MULTIPLE_FACES;
    }
    if (message.includes('timeout')) {
      return ERROR_TYPES.PROCESSING_TIMEOUT;
    }
    if (message.includes('500') || message.includes('server')) {
      return ERROR_TYPES.SERVER_ERROR;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_TYPES.NETWORK_ERROR;
    }
    if (message.includes('storage')) {
      return ERROR_TYPES.STORAGE_ERROR;
    }

    return ERROR_TYPES.UNKNOWN;
  }

  /**
   * تحويل رسالة الخطأ إلى رسالة صديقة للمستخدم
   */
  function getUserFriendlyMessage(error) {
    if (typeof error === 'string') {
      const errorType = identifyErrorType(error);
      return ERROR_MESSAGES[errorType] || error;
    }

    if (error && error.message) {
      return getUserFriendlyMessage(error.message);
    }

    return ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
  }

  /**
   * تسجيل الخطأ
   */
  function logError(errorMessage, errorType = null, additionalInfo = {}) {
    const type = errorType || identifyErrorType(errorMessage);
    const timestamp = new Date().toISOString();

    const errorLog = {
      timestamp,
      message: errorMessage,
      type,
      userMessage: ERROR_MESSAGES[type],
      ...additionalInfo
    };

    console.error(`[${timestamp}] [${type}]`, errorMessage, additionalInfo);

    // حفظ الأخطاء في localStorage (آخر 20 خطأ)
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push(errorLog);
      
      if (logs.length > 20) {
        logs.shift();
      }
      
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (e) {
      console.warn('فشل حفظ سجل الأخطاء');
    }

    return errorLog;
  }

  /**
   * عرض رسالة خطأ للمستخدم
   */
  function showErrorMessage(error, options = {}) {
    const {
      duration = 5000,
      position = 'top',
      showInConsole = true
    } = options;

    const message = getUserFriendlyMessage(error);
    
    if (showInConsole) {
      logError(message);
    }

    // عرض Toast إذا كانت الدالة متاحة
    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast(message, 'error', duration);
    }

    return message;
  }

  /**
   * عرض رسالة نجاح
   */
  function showSuccessMessage(message, options = {}) {
    const { duration = 3000 } = options;

    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast(message, 'success', duration);
    }

    console.log('[SUCCESS]', message);
  }

  /**
   * عرض رسالة تحذير
   */
  function showWarningMessage(message, options = {}) {
    const { duration = 4000 } = options;

    if (typeof UI !== 'undefined' && UI.showToast) {
      UI.showToast(message, 'warning', duration);
    }

    console.warn('[WARNING]', message);
  }

  /**
   * استرجاع سجل الأخطاء
   */
  function getErrorLogs() {
    try {
      return JSON.parse(localStorage.getItem('error_logs') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * مسح سجل الأخطاء
   */
  function clearErrorLogs() {
    try {
      localStorage.removeItem('error_logs');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * معالج عام للأخطاء غير المتوقعة
   */
  function setupGlobalErrorHandler() {
    window.addEventListener('error', (event) => {
      logError(event.error?.message || event.message, null, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      logError(event.reason?.message || event.reason, null, {
        type: 'unhandledPromiseRejection'
      });
    });
  }

  return {
    ERROR_TYPES,
    ERROR_MESSAGES,
    identifyErrorType,
    getUserFriendlyMessage,
    logError,
    showErrorMessage,
    showSuccessMessage,
    showWarningMessage,
    getErrorLogs,
    clearErrorLogs,
    setupGlobalErrorHandler
  };
})();
