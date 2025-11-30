/**
 * Face Handler - معالجة عمليات تحليل الوجه
 */

const FaceHandler = (function() {

  const API_ENDPOINT = '/api/scan_face';
  const STORAGE_KEY = 'face_embeddings';

  /**
   * إرسال الصورة لتحليل الوجه
   */
  async function scanFace(base64Image, options = {}) {
    const {
      showProgress = true,
      timeout = 30000
    } = options;

    try {
      // التحقق من الصورة
      const validation = Validators.validateBase64Image(base64Image);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (showProgress) {
        console.log('[FaceHandler] بدء تحليل الوجه...');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64Image
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      // التحقق من الاستجابة
      const responseValidation = Validators.validateAPIResponse(data);
      if (!responseValidation.valid) {
        throw new Error(responseValidation.error);
      }

      // التحقق من البصمة
      const embeddingValidation = Validators.validateEmbedding(data.embedding);
      if (!embeddingValidation.valid) {
        throw new Error(embeddingValidation.error);
      }

      if (showProgress) {
        console.log(`[FaceHandler] اكتمل التحليل في ${data.processingTime}ms`);
      }

      return {
        success: true,
        embedding: data.embedding,
        image: data.image,
        processingTime: data.processingTime,
        message: data.message
      };

    } catch (error) {
      console.error('[FaceHandler] خطأ:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * معالجة صورة من ملف وتحليلها
   */
  async function processImageFile(file, options = {}) {
    const {
      compress = true,
      validate = true,
      maxSizeMB = 5,
      showProgress = true
    } = options;

    try {
      if (showProgress) {
        console.log('[FaceHandler] معالجة الملف...');
      }

      // التحقق من الصورة
      if (validate) {
        const validation = await Validators.validateImageComplete(file, { maxSizeMB });
        if (!validation.valid) {
          throw new Error(validation.error);
        }
      }

      // ضغط الصورة
      let base64Image;
      if (compress) {
        const compressed = await ImageUtils.compressImage(file);
        base64Image = compressed.base64;
        if (showProgress) {
          console.log(`[FaceHandler] تم ضغط الصورة: ${ImageUtils.formatFileSize(file.size)} → ${ImageUtils.formatFileSize(compressed.size)}`);
        }
      } else {
        base64Image = await ImageUtils.fileToBase64(file);
      }

      // تحليل الوجه
      const result = await scanFace(base64Image, { showProgress });

      if (result.success) {
        // تخزين النتيجة
        await storeFaceEmbedding({
          embedding: result.embedding,
          image: result.image,
          timestamp: new Date().toISOString(),
          processingTime: result.processingTime
        });
      }

      return result;

    } catch (error) {
      console.error('[FaceHandler] خطأ في معالجة الملف:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * معالجة صورة من كاميرا (Canvas)
   */
  async function processCameraImage(canvas, options = {}) {
    try {
      const base64Image = canvas.toDataURL('image/jpeg', 0.85);
      return await scanFace(base64Image, options);
    } catch (error) {
      console.error('[FaceHandler] خطأ في معالجة صورة الكاميرا:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * تخزين البصمة محلياً
   */
  async function storeFaceEmbedding(data) {
    try {
      if (typeof IndexedDB !== 'undefined' || window.indexedDB) {
        // استخدام IndexedDB للبيانات الكبيرة
        return await storeInIndexedDB(data);
      } else {
        // Fallback إلى localStorage
        return await storeInLocalStorage(data);
      }
    } catch (error) {
      console.error('[FaceHandler] خطأ في التخزين:', error.message);
      return false;
    }
  }

  /**
   * تخزين في LocalStorage
   */
  function storeInLocalStorage(data) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      existing.push(data);
      
      // الاحتفاظ بآخر 10 بصمات فقط
      if (existing.length > 10) {
        existing.shift();
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      console.log('[FaceHandler] تم تخزين البصمة في localStorage');
      return true;
    } catch (error) {
      console.error('[FaceHandler] خطأ في localStorage:', error.message);
      return false;
    }
  }

  /**
   * تخزين في IndexedDB
   */
  async function storeInIndexedDB(data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FaceDB', 1);

      request.onerror = () => {
        console.error('[FaceHandler] خطأ في فتح IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['embeddings'], 'readwrite');
        const store = transaction.objectStore('embeddings');
        store.add(data);

        transaction.oncomplete = () => {
          console.log('[FaceHandler] تم تخزين البصمة في IndexedDB');
          resolve(true);
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('embeddings')) {
          db.createObjectStore('embeddings', { autoIncrement: true });
        }
      };
    });
  }

  /**
   * استرجاع البصمات المخزنة
   */
  async function retrieveStoredEmbeddings() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[FaceHandler] خطأ في استرجاع البصمات:', error.message);
      return [];
    }
  }

  /**
   * حذف جميع البصمات المخزنة
   */
  function clearStoredEmbeddings() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[FaceHandler] تم حذف البصمات المخزنة');
      return true;
    } catch (error) {
      console.error('[FaceHandler] خطأ في حذف البصمات:', error.message);
      return false;
    }
  }

  /**
   * حساب التشابه بين بصمتين (Cosine Similarity)
   */
  function calculateSimilarity(embedding1, embedding2) {
    if (!Array.isArray(embedding1) || !Array.isArray(embedding2)) {
      return null;
    }

    if (embedding1.length !== embedding2.length) {
      return null;
    }

    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * مقارنة الوجه الحالي مع الوجوه المخزنة
   */
  async function matchCurrentFace(currentEmbedding, threshold = 0.6) {
    try {
      const stored = await retrieveStoredEmbeddings();
      
      if (stored.length === 0) {
        return {
          matched: false,
          message: 'لا توجد وجوه مخزنة للمقارنة'
        };
      }

      let bestMatch = null;
      let bestSimilarity = 0;

      for (const item of stored) {
        const similarity = calculateSimilarity(currentEmbedding, item.embedding);
        
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = item;
        }
      }

      return {
        matched: bestSimilarity >= threshold,
        similarity: bestSimilarity,
        matchedItem: bestMatch,
        message: bestSimilarity >= threshold 
          ? `تطابق بنسبة ${(bestSimilarity * 100).toFixed(2)}%` 
          : `لم يتم العثور على تطابق (النسبة: ${(bestSimilarity * 100).toFixed(2)}%)`
      };

    } catch (error) {
      console.error('[FaceHandler] خطأ في المقارنة:', error.message);
      return {
        matched: false,
        error: error.message
      };
    }
  }

  return {
    scanFace,
    processImageFile,
    processCameraImage,
    storeFaceEmbedding,
    retrieveStoredEmbeddings,
    clearStoredEmbeddings,
    calculateSimilarity,
    matchCurrentFace
  };
})();
