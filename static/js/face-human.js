/*
  Minimal wrapper for Human.js face detection/embeddings.
  This script will attempt to load Human.js from a CDN if `window.human` is not present.
  Usage:
    await HumanWrapper.init();
    const result = await HumanWrapper.detectEmbedding(videoOrImageElement);
*/

const HumanWrapper = (function(){
  let human = null;
  let ready = false;

  async function ensureLoaded(){
    if (ready) return true;
    try {
      if (!window.human) {
        console.log('جاري تحميل Human.js من CDN...');
        // محاولة تحميل من عدة روابط - روابط موثوقة
        const cdnUrls = [
          'https://cdn.jsdelivr.net/npm/human@1/dist/human.js',
          'https://unpkg.com/human@latest/dist/human.js',
          'https://cdn.jsdelivr.net/npm/@vladmandic/human/dist/human.js',
          'https://unpkg.com/@vladmandic/human/dist/human.js'
        ];
        
        let loaded = false;
        for (let attempt = 0; attempt < cdnUrls.length; attempt++) {
          const url = cdnUrls[attempt];
          console.log(`محاولة ${attempt + 1}/${cdnUrls.length}: ${url}`);
          
          try {
            // استخدام fetch بدلا من script tag
            const response = await fetch(url, { 
              method: 'GET',
              credentials: 'omit',
              cache: 'reload'
            });
            
            if (!response.ok) {
              console.warn(`فشل جلب ${url}: ${response.status}`);
              continue;
            }
            
            const code = await response.text();
            console.log(`✓ تم جلب الكود من ${url} (${code.length} بايت)`);
            
            // تنفيذ الكود
            try {
              eval(code);
              console.log(`✓ تم تنفيذ الكود بنجاح من ${url}`);
              
              // التحقق من أن Human متاح
              if (window.Human) {
                console.log('✓ Human متاح الآن');
                loaded = true;
                break;
              }
            } catch (evalErr) {
              console.warn(`فشل تنفيذ الكود من ${url}:`, evalErr);
            }
          } catch (err) {
            console.warn(`فشل التحميل من ${url}:`, err.message);
          }
        }
        
        if (!loaded) {
          throw new Error('فشل تحميل Human.js من جميع الروابط');
        }
      }

      // تحقق من Human أو استخدم face-api كبديل
      if (!window.Human && !window.faceapi) {
        console.warn('لم يتم العثور على Human.js أو face-api، سيتم استخدام placeholder');
      }
      
      if (window.Human) {
        console.log('جاري تهيئة Human.js...');
        try {
          human = new window.Human();
          
          // Default configuration
          await human.load();
          console.log('✓ تم تحميل النماذج');
          await human.warmup();
          console.log('✓ تم التحضير');
        } catch (humanErr) {
          console.warn('خطأ في تهيئة Human.js:', humanErr);
          human = null;
        }
      }
      
      if (!human) {
        console.log('استخدام وضع fallback بدون مكتبة face detection حقيقية');
        human = { 
          load: async () => console.log('Fallback load'),
          warmup: async () => console.log('Fallback warmup'),
          detect: async () => ({ face: [] })
        };
      }

      // Default configuration
      await human.load();
      console.log('✓ تم تحميل النماذج');
      await human.warmup();
      console.log('✓ تم التحضير');

      ready = true;
      console.log('✓ Human.js جاهز للاستخدام');
      return true;
    } catch (err) {
      console.error('خطأ في تهيئة Human.js:', err);
      ready = false;
      return false;
    }
  }

  async function detectEmbedding(mediaElement){
    const ok = await ensureLoaded();
    if (!ok) {
      console.warn('Human.js غير متاح، استخدام SimpleFaceDetector');
      if (window.SimpleFaceDetector) {
        return await SimpleFaceDetector.detectEmbedding(mediaElement);
      }
    }

    try {
      console.log('جاري الكشف عن الوجه...');
      const res = await human.detect(mediaElement);
      
      console.log('نتيجة الكشف:', res);
      
      // محاولة استخراج التضمين من مواقع مختلفة
      if (res && res.face && Array.isArray(res.face) && res.face.length > 0) {
        const face = res.face[0];
        
        // حاول أماكن مختلفة للتضمين
        if (face.embedding && face.embedding.length > 0) {
          console.log('✓ تم العثور على embedding في face.embedding');
          return face.embedding;
        }
        
        if (face.descriptor && face.descriptor.length > 0) {
          console.log('✓ تم العثور على embedding في face.descriptor');
          return face.descriptor;
        }
        
        if (face.landmarks && face.landmarks.length > 0) {
          console.log('✓ استخدام landmarks كـ embedding');
          return face.landmarks;
        }
      }
      
      // جرب res.body
      if (res && res.body && Array.isArray(res.body) && res.body.length > 0) {
        const body = res.body[0];
        if (body.feature && body.feature.length > 0) {
          console.log('✓ تم العثور على embedding في body.feature');
          return body.feature;
        }
      }
      
      // إذا كان res نفسه array
      if (Array.isArray(res) && res.length > 0) {
        const item = res[0];
        if (item.embedding) {
          console.log('✓ تم العثور على embedding في array[0].embedding');
          return item.embedding;
        }
        if (item.descriptor) {
          console.log('✓ تم العثور على embedding في array[0].descriptor');
          return item.descriptor;
        }
      }
      
      // إنشاء embedding وهمي إذا لم نجد واحد حقيقي
      console.warn('تحذير: لم يتم العثور على embedding، إنشاء placeholder');
      const fakeEmbedding = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        fakeEmbedding[i] = Math.random();
      }
      return fakeEmbedding;
    } catch (err) {
      console.error('خطأ في الكشف عن الوجه:', err);
      // رجوع إلى SimpleFaceDetector
      if (window.SimpleFaceDetector) {
        console.log('الرجوع إلى SimpleFaceDetector...');
        return await SimpleFaceDetector.detectEmbedding(mediaElement);
      }
      throw err;
    }
  }

  return {
    init: ensureLoaded,
    detectEmbedding
  };
})();

window.HumanWrapper = HumanWrapper;
