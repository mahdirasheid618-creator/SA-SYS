/**
 * Fast Face Matching Module - نموذج المطابقة السريعة
 * يوفر كشف ومطابقة وجه سريع جداً
 */

const FastFaceMatchingModule = {
    video: null,
    canvas: null,
    detectionTimer: null,
    isProcessing: false,

    init(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;

        if (this.canvas) {
            this.canvas.width = videoElement.videoWidth || 640;
            this.canvas.height = videoElement.videoHeight || 480;
        }

        return FastFaceDetector.init();
    },

    async startFastDetection(onFaceDetected) {
        if (this.detectionTimer) {
            clearInterval(this.detectionTimer);
        }

        // الكشف كل 200ms بدلاً من 300ms
        this.detectionTimer = setInterval(async () => {
            if (this.isProcessing || !this.video) return;

            this.isProcessing = true;

            try {
                // كشف سريع عن الوجه
                const faces = await FastFaceDetector.detectFaces(this.video);

                if (faces && faces.length > 0) {
                    // يوجد وجه
                    if (this.canvas) {
                        const ctx = this.canvas.getContext('2d');
                        ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

                        // استخراج الـ embedding بسرعة
                        const embedding = await FastFaceDetector.extractFaceEmbedding(this.canvas);

                        onFaceDetected({
                            success: true,
                            embedding: embedding,
                            faceCount: faces.length,
                            imageData: this.canvas.toDataURL('image/jpeg', 0.8)
                        });
                    }
                } else {
                    // لا يوجد وجه
                    onFaceDetected({
                        success: false,
                        faceCount: 0
                    });
                }

            } catch (err) {
                console.error('خطأ في الكشف السريع:', err);
                onFaceDetected({
                    success: false,
                    error: err.message
                });
            }

            this.isProcessing = false;
        }, 200); // فترة أقصر = أسرع
    },

    stopDetection() {
        if (this.detectionTimer) {
            clearInterval(this.detectionTimer);
            this.detectionTimer = null;
        }
    },

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });

            this.video.srcObject = stream;

            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    // تحديث حجم الـ canvas
                    if (this.canvas) {
                        this.canvas.width = this.video.videoWidth;
                        this.canvas.height = this.video.videoHeight;
                    }
                    resolve();
                };
            });

        } catch (err) {
            throw new Error('فشل الوصول للكاميرا: ' + err.message);
        }
    },

    stopCamera() {
        if (this.video && this.video.srcObject) {
            this.video.srcObject.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
        }
        this.stopDetection();
    }
};

window.FastFaceMatchingModule = FastFaceMatchingModule;
