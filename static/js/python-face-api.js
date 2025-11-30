/**
 * Python Face Recognition API Client
 * يتواصل مع خدمة Python للمعالجة المتقدمة
 */

const PythonFaceAPI = {
    /**
     * استخراج بصمة الوجه باستخدام Python
     */
    async extractEmbedding(imageData) {
        try {
            console.log('جاري استخراج البصمة باستخدام Python...');

            const response = await fetch('/api/face/extract-embedding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: imageData
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log(`✓ تم استخراج البصمة: ${result.face_count} وجه`);
            } else {
                console.error('خطأ:', result.message);
            }

            return result;

        } catch (err) {
            console.error('خطأ في الاتصال:', err);
            return {
                success: false,
                message: 'خطأ في الاتصال بالخادم: ' + err.message
            };
        }
    },

    /**
     * مطابقة الوجه لتسجيل الحضور
     */
    async matchAttendance(imageData, students) {
        try {
            console.log('جاري مطابقة الوجه...');

            // تصفية الطلاب بشكل صحيح
            const studentsData = students.map(s => ({
                id: s.id,
                full_name: s.full_name,
                stage: s.stage,
                embedding: s.face_embedding || s.embedding
            }));

            const response = await fetch('/api/face/match-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: imageData,
                    students: studentsData
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log(`✓ تطابق وجد: ${result.student_name} (مسافة: ${result.distance.toFixed(3)})`);
            } else {
                console.log('لم يتم العثور على تطابق:', result.message);
            }

            return result;

        } catch (err) {
            console.error('خطأ في المطابقة:', err);
            return {
                success: false,
                message: 'خطأ في الاتصال بالخادم: ' + err.message
            };
        }
    },

    /**
     * مقارنة بصمتين مباشرة
     */
    async compareEmbeddings(embedding1, embedding2) {
        try {
            const response = await fetch('/api/face/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    embedding1: embedding1,
                    embedding2: embedding2
                })
            });

            return await response.json();

        } catch (err) {
            console.error('خطأ في المقارنة:', err);
            return {
                success: false,
                distance: null,
                similarity: 0,
                match: false
            };
        }
    }
};

window.PythonFaceAPI = PythonFaceAPI;
