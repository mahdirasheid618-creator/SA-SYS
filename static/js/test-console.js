/**
 * اختبار سريع لـ Human.js في console
 * Paste this code in browser console to test Human.js
 */

console.log('=== اختبار Human.js ===\n');

// 1. التحقق من وجود HumanWrapper
console.log('1️⃣ التحقق من HumanWrapper...');
if (window.HumanWrapper) {
    console.log('✅ HumanWrapper موجود');
} else {
    console.error('❌ HumanWrapper غير موجود');
}

// 2. التحقق من وجود FaceScanModule
console.log('\n2️⃣ التحقق من FaceScanModule...');
if (window.FaceScanModule) {
    console.log('✅ FaceScanModule موجود');
    console.log('الدوال المتاحة:', Object.keys(window.FaceScanModule));
} else {
    console.error('❌ FaceScanModule غير موجود');
}

// 3. محاولة تحميل Human.js
console.log('\n3️⃣ محاولة تهيئة HumanWrapper...');
HumanWrapper.init()
    .then(success => {
        if (success) {
            console.log('✅ Human.js تم تحميله بنجاح!');
        } else {
            console.warn('⚠️ فشل تحميل Human.js');
        }
    })
    .catch(err => {
        console.error('❌ خطأ في تحميل Human.js:', err);
    });

// 4. اختبار الكاميرا
console.log('\n4️⃣ اختبار الكاميرا...');
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log('✅ Camera API متاح');
} else {
    console.error('❌ Camera API غير متاح');
}

// 5. اختبار Canvas
console.log('\n5️⃣ اختبار Canvas...');
const canvas = document.getElementById('canvas');
if (canvas) {
    console.log('✅ Canvas element موجود');
    const ctx = canvas.getContext('2d');
    if (ctx) {
        console.log('✅ Canvas 2D context متاح');
    }
} else {
    console.warn('⚠️ Canvas element غير موجود');
}

console.log('\n=== انتظر بعض الثواني لإكمال التحميل ===\n');

// اختبار الدالة الرئيسية بعد ثوانٍ
setTimeout(() => {
    console.log('=== نتائج الاختبار ===\n');
    
    console.log('✅ HumanWrapper:', window.HumanWrapper ? 'جاهز' : 'غير جاهز');
    console.log('✅ FaceScanModule:', window.FaceScanModule ? 'جاهز' : 'غير جاهز');
    console.log('✅ Camera API:', navigator.mediaDevices ? 'جاهز' : 'غير جاهز');
    console.log('✅ Canvas:', canvas ? 'جاهز' : 'غير جاهز');
    
    console.log('\n=== انسخ الأوامر التالية لاختبار المسح ===\n');
    console.log(`
// بدء الكاميرا
await FaceScanModule.startCamera();

// بدء الكشف
FaceScanModule.startLiveDetection();

// التقاط الوجه (بعد 3 ثواني)
const result = await FaceScanModule.captureFace();
console.log('النتيجة:', result);
    `);
}, 3000);
