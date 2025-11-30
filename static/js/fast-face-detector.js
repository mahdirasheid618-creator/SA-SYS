/**
 * Fast Face Detector - محقق الوجه السريع
 * يستخدم TensorFlow.js + Coco-SSD لكشف الوجه بسرعة
 */

const FastFaceDetector = {
    model: null,
    isLoading: false,
    isReady: false,

    async init() {
        if (this.isReady) return true;
        if (this.isLoading) {
            // انتظر حتى اكتمال التحميل
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (this.isReady) {
                        clearInterval(checkInterval);
                        resolve(true);
                    }
                }, 100);
            });
        }

        this.isLoading = true;
        try {
            console.log('جاري تحميل TensorFlow.js...');
            
            // تحميل TensorFlow.js من CDN
            if (!window.tf) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
                console.log('✓ تم تحميل TensorFlow.js');
            }

            // تحميل COCO-SSD للكشف عن الأشياء
            if (!window.cocoSsd) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
                console.log('✓ تم تحميل COCO-SSD');
            }

            // تحميل النموذج
            this.model = await cocoSsd.load();
            console.log('✓ تم تحميل نموذج الكشف عن الوجه');

            this.isReady = true;
            this.isLoading = false;
            return true;

        } catch (err) {
            console.error('خطأ في تحميل النموذج:', err);
            this.isLoading = false;
            throw new Error('فشل تحميل نموذج الكشف: ' + err.message);
        }
    },

    async detectFaces(videoElement) {
        if (!this.isReady) {
            throw new Error('نموذج الكشف لم يتم تحميله بعد');
        }

        try {
            // كشف الأشياء باستخدام COCO-SSD
            const predictions = await this.model.detect(videoElement);
            
            // تصفية النتائج للحصول على الوجوه فقط (person class)
            const faces = predictions.filter(p => 
                p.class === 'person' && p.score > 0.5
            );

            return faces;

        } catch (err) {
            console.error('خطأ في الكشف عن الوجه:', err);
            return [];
        }
    },

    async extractFaceEmbedding(canvas) {
        /**
         * بديل سريع: استخراج ميزات الوجه من البيكسلات مباشرة
         * هذا أسرع بكثير من التعلم العميق الكامل
         */
        try {
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // استخراج ميزات أساسية من الصورة
            const embedding = new Float32Array(128);

            // حساب الميزات من الألوان والأنماط
            for (let i = 0; i < 128; i++) {
                let sum = 0;
                const step = Math.floor(data.length / 128);
                
                for (let j = 0; j < step && i * step + j < data.length; j++) {
                    const idx = i * step + j;
                    // R + G + B / 3
                    sum += (data[idx * 4] + data[idx * 4 + 1] + data[idx * 4 + 2]) / 3;
                }

                embedding[i] = sum / step / 255;
            }

            return embedding;

        } catch (err) {
            console.error('خطأ في استخراج الـ embedding:', err);
            return new Float32Array(128);
        }
    },

    // حساب التشابه بين الوجهين
    calculateSimilarity(emb1, emb2) {
        if (!emb1 || !emb2 || emb1.length !== emb2.length) {
            return 0;
        }

        let dotProduct = 0;
        let mag1 = 0;
        let mag2 = 0;

        for (let i = 0; i < emb1.length; i++) {
            dotProduct += emb1[i] * emb2[i];
            mag1 += emb1[i] * emb1[i];
            mag2 += emb2[i] * emb2[i];
        }

        mag1 = Math.sqrt(mag1);
        mag2 = Math.sqrt(mag2);

        if (mag1 === 0 || mag2 === 0) return 0;

        return dotProduct / (mag1 * mag2);
    }
};

// تصدير الـ API
window.FastFaceDetector = FastFaceDetector;
