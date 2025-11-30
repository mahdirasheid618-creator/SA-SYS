/**
 * Image Utilities - معالجة الصور والتحويلات
 */

const ImageUtils = (function() {
  
  /**
   * تحويل صورة إلى Base64
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * قراءة حجم الصورة من ملف
   */
  function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            width: img.width,
            height: img.height,
            size: file.size,
            type: file.type
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * ضغط الصورة قبل الإرسال
   */
  function compressImage(file, maxWidth = 640, maxHeight = 480, quality = 0.85) {
    // For animated formats (GIF, animated WebP) we should NOT draw to canvas
    // because that flattens the animation. In those cases return the original
    // base64 and the original file blob so the animation is preserved.
    return new Promise((resolve, reject) => {
      try {
        const lowerType = (file && file.type || '').toLowerCase();
        const isAnimatedCandidate = lowerType === 'image/gif' || lowerType === 'image/webp';
        if (isAnimatedCandidate) {
          // Get dimensions and base64 without touching canvas
          getImageDimensions(file).then(dim => {
            fileToBase64(file).then(base64 => {
              resolve({ blob: file, base64: base64, width: dim.width, height: dim.height, size: file.size });
            }).catch(err => reject(err));
          }).catch(err => {
            // fallback: still return base64
            fileToBase64(file).then(base64 => {
              resolve({ blob: file, base64: base64, width: null, height: null, size: file.size });
            }).catch(e => reject(e));
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // حساب الحجم الجديد مع الحفاظ على النسبة
            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                resolve({
                  blob: blob,
                  base64: canvas.toDataURL('image/jpeg', quality),
                  width: width,
                  height: height,
                  size: blob.size
                });
              },
              'image/jpeg',
              quality
            );
          };
          img.onerror = () => reject(new Error('فشل تحميل الصورة'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('فشل قراءة الملف'));
        reader.readAsDataURL(file);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * تحويل Base64 إلى Blob
   */
  function base64ToBlob(base64String, mimeType = 'image/jpeg') {
    const byteCharacters = atob(base64String.split(',')[1] || base64String);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * رسم مربع حول الوجه على الصورة (في Canvas)
   */
  function drawFaceBox(imageSrc, bbox, canvasElement) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = canvasElement || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // رسم مربع أزرق حول الوجه
        const [x1, y1, x2, y2] = bbox;
        ctx.strokeStyle = '#0000FF';
        ctx.lineWidth = 3;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      
      img.onerror = () => reject(new Error('فشل تحميل الصورة للرسم'));
      img.src = imageSrc;
    });
  }

  /**
   * رسم نقاط الميزات على الصورة
   */
  function drawKeypoints(imageSrc, keypoints, canvasElement) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        const canvas = canvasElement || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // رسم نقاط زرقاء
        ctx.fillStyle = '#0000FF';
        keypoints.forEach(kp => {
          const [x, y] = kp;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, 2 * Math.PI);
          ctx.fill();
        });
        
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      
      img.onerror = () => reject(new Error('فشل تحميل الصورة للرسم'));
      img.src = imageSrc;
    });
  }

  /**
   * حساب حجم الملف بصيغة مقروءة
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * التحقق من صيغة الصورة المدعومة
   */
  function isSupportedImageFormat(mimeType) {
    // include animated-friendly formats (GIF, WebP) in supported list
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    return supportedFormats.includes((mimeType||'').toLowerCase());
  }

  /**
   * التحقق من أن الملف عبارة عن صورة
   */
  function isImageFile(file) {
    return file.type.startsWith('image/');
  }

  return {
    fileToBase64,
    getImageDimensions,
    compressImage,
    base64ToBlob,
    drawFaceBox,
    drawKeypoints,
    formatFileSize,
    isSupportedImageFormat,
    isImageFile
  };
})();
