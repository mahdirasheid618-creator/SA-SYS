/**
 * Face Scanning Module using Human.js
 * Handles face detection, embedding extraction, and image capture
 * يتعامل مع الكشف عن الوجه واستخراج التضمينات والتقط الصور
 */

const FaceScanModule = (function() {
  let video = null;
  let canvas = null;
  let ctx = null;
  let currentFaceEmbedding = null;
  let isScanning = false;
  let detectionInterval = null;

  /**
   * Initialize the face scanning module
   * @param {HTMLVideoElement} videoElement - Video element for camera stream
   * @param {HTMLCanvasElement} canvasElement - Canvas for drawing detections
   */
  async function init(videoElement, canvasElement) {
    try {
      video = videoElement;
      canvas = canvasElement;
      ctx = canvas ? canvas.getContext('2d') : null;

      console.log('جاري تهيئة Face Scan Module...');
      let initialized = false;
      
      // حاول الخيارات بالترتيب:
      // 1. Human.js
      // 2. Face-API
      // 3. SimpleFaceDetector (fallback)
      
      console.log('محاولة 1/3: Human.js...');
      try {
        if (window.HumanWrapper && window.HumanWrapper.init) {
          await HumanWrapper.init();
          console.log('✓ تم استخدام Human.js');
          initialized = true;
        }
      } catch (err) {
        console.warn('فشل Human.js:', err.message);
      }

      if (!initialized) {
        console.log('محاولة 2/3: Face-API...');
        try {
          if (window.FaceAPIWrapper && window.FaceAPIWrapper.init) {
            const result = await FaceAPIWrapper.init();
            if (result) {
              console.log('✓ تم استخدام Face-API');
              // استبدل الكشف لاستخدام Face-API
              if (window.HumanWrapper) {
                window.HumanWrapper.detectEmbedding = window.FaceAPIWrapper.detectEmbedding;
              }
              initialized = true;
            }
          }
        } catch (err) {
          console.warn('فشل Face-API:', err.message);
        }
      }

      if (!initialized) {
        console.log('محاولة 3/3: SimpleFaceDetector (fallback)...');
        try {
          if (window.SimpleFaceDetector && window.SimpleFaceDetector.init) {
            await SimpleFaceDetector.init();
            console.log('✓ تم استخدام SimpleFaceDetector (محاكاة)');
            // استبدل الكشف لاستخدام SimpleFaceDetector
            if (window.HumanWrapper) {
              window.HumanWrapper.detectEmbedding = window.SimpleFaceDetector.detectEmbedding;
            }
            initialized = true;
          }
        } catch (err) {
          console.warn('فشل SimpleFaceDetector:', err.message);
        }
      }
      
      if (!initialized) {
        throw new Error('فشل تحميل جميع مكتبات الكشف عن الوجه');
      }
      
      console.log('✓ Face Scan Module جاهز');
      return true;
    } catch (err) {
      console.error('خطأ في تهيئة Face Scan Module:', err);
      return false;
    }
  }

  /**
   * Start camera stream
   */
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
        };
      }
      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      throw new Error('تعذر الوصول للكاميرا. يرجى التحقق من الأذونات.');
    }
  }

  /**
   * Stop camera stream
   */
  function stopCamera() {
    if (video && video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      video.srcObject = null;
    }
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
  }

  /**
   * Start real-time face detection with drawing
   */
  function startLiveDetection() {
    if (!canvas || !ctx || !video) return;

    isScanning = true;
    
    detectionInterval = setInterval(async () => {
      if (!isScanning || !video || video.paused) return;

      try {
        // Draw video frame to canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Detect faces
        const embedding = await HumanWrapper.detectEmbedding(canvas);
        
        if (embedding) {
          // Draw detection box and indicator
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#00ff00';
          ctx.fillText('وجه مكتشف ✓', 20, 40);
          
          // Draw a border around the center (approximation)
          const padding = 50;
          ctx.strokeRect(padding, padding, canvas.width - (padding * 2), canvas.height - (padding * 2));
        } else {
          // Show search message
          ctx.strokeStyle = '#ff6b6b';
          ctx.lineWidth = 2;
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#ff6b6b';
          ctx.fillText('ابحث عن وجه...', 20, 40);
          
          const padding = 50;
          ctx.strokeRect(padding, padding, canvas.width - (padding * 2), canvas.height - (padding * 2));
        }
      } catch (err) {
        console.warn('Detection error:', err);
      }
    }, 300); // Update every 300ms
  }

  /**
   * Stop live detection
   */
  function stopLiveDetection() {
    isScanning = false;
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
  }

  /**
   * Capture face from video and extract embedding
   * @returns {Promise<{embedding: Float32Array, imageData: string}>}
   */
  async function captureFace() {
    if (!video || !canvas || !ctx) {
      throw new Error('Video or canvas elements not initialized');
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Detect face and extract embedding
      const embedding = await HumanWrapper.detectEmbedding(canvas);

      if (!embedding) {
        throw new Error('لم يتم الكشف عن وجه. يرجى المحاولة مرة أخرى.');
      }

      // Get image as base64
      const imageData = canvas.toDataURL('image/jpeg', 0.9);

      // Store embedding
      currentFaceEmbedding = embedding;

      console.log('✓ Face captured successfully');
      console.log('Embedding length:', embedding.length);

      return {
        success: true,
        embedding: embedding,
        imageData: imageData,
        message: 'تم التقاط الوجه بنجاح'
      };
    } catch (err) {
      console.error('Face capture error:', err);
      throw err;
    }
  }

  /**
   * Get current face embedding
   */
  function getEmbedding() {
    return currentFaceEmbedding;
  }

  /**
   * Clear current embedding
   */
  function clearEmbedding() {
    currentFaceEmbedding = null;
  }

  /**
   * Convert embedding to JSON-serializable format
   */
  function serializeEmbedding(embedding) {
    if (!embedding) return null;
    
    // Convert Float32Array to regular array for JSON serialization
    if (embedding instanceof Float32Array || embedding instanceof Array) {
      return Array.from(embedding);
    }
    return embedding;
  }

  /**
   * Draw face detection with rectangle and info
   */
  function drawDetectionBox(context, canvas, hasDetection = false) {
    if (!context || !canvas) return;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const padding = 40;
    const x = padding;
    const y = padding;
    const width = canvas.width - (padding * 2);
    const height = canvas.height - (padding * 2);

    if (hasDetection) {
      context.strokeStyle = '#2ecc71';
      context.fillStyle = 'rgba(46, 204, 113, 0.1)';
      context.lineWidth = 3;
    } else {
      context.strokeStyle = '#e74c3c';
      context.fillStyle = 'rgba(231, 76, 60, 0.05)';
      context.lineWidth = 2;
    }

    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);

    // Draw corner markers
    const cornerSize = 15;
    context.fillStyle = hasDetection ? '#2ecc71' : '#e74c3c';

    // Top-left
    context.fillRect(x, y, cornerSize, 3);
    context.fillRect(x, y, 3, cornerSize);

    // Top-right
    context.fillRect(x + width - cornerSize, y, cornerSize, 3);
    context.fillRect(x + width - 3, y, 3, cornerSize);

    // Bottom-left
    context.fillRect(x, y + height - 3, cornerSize, 3);
    context.fillRect(x, y + height - cornerSize, 3, cornerSize);

    // Bottom-right
    context.fillRect(x + width - cornerSize, y + height - 3, cornerSize, 3);
    context.fillRect(x + width - 3, y + height - cornerSize, 3, cornerSize);

    // Draw text
    context.font = 'bold 18px Arial, sans-serif';
    context.fillStyle = hasDetection ? '#2ecc71' : '#e74c3c';
    const text = hasDetection ? '✓ وجه مكتشف' : '◯ ابحث عن وجه';
    context.fillText(text, x + 20, y + 40);
  }

  // Public API
  return {
    init,
    startCamera,
    stopCamera,
    startLiveDetection,
    stopLiveDetection,
    captureFace,
    getEmbedding,
    clearEmbedding,
    serializeEmbedding,
    drawDetectionBox
  };
})();

// Make it globally accessible
window.FaceScanModule = FaceScanModule;
