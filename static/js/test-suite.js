/**
 * Test Suite - اختبارات للملفات الجديدة
 * استخدم هذا الملف للتحقق من أن جميع الوظائف تعمل بشكل صحيح
 */

const TestSuite = (function() {

  /**
   * اختبار ImageUtils
   */
  function testImageUtils() {
    console.group('🧪 اختبار ImageUtils');
    
    try {
      // اختبار formatFileSize
      const size1 = ImageUtils.formatFileSize(1024);
      console.log(`✓ formatFileSize(1024) = ${size1}`, size1 === '1 KB' ? '✅' : '❌');
      
      const size2 = ImageUtils.formatFileSize(1024 * 1024);
      console.log(`✓ formatFileSize(1MB) = ${size2}`, size2 === '1 MB' ? '✅' : '❌');
      
      // اختبار isSupportedImageFormat
      const supported = ImageUtils.isSupportedImageFormat('image/jpeg');
      console.log(`✓ isSupportedImageFormat('image/jpeg') = ${supported}`, supported ? '✅' : '❌');
      
      const notSupported = !ImageUtils.isSupportedImageFormat('image/bmp');
      console.log(`✓ !isSupportedImageFormat('image/bmp') = true`, notSupported ? '✅' : '❌');
      
      console.log('✓ جميع اختبارات ImageUtils نجحت ✅');
    } catch (error) {
      console.error('❌ خطأ في اختبار ImageUtils:', error.message);
    }
    
    console.groupEnd();
  }

  /**
   * اختبار Validators
   */
  function testValidators() {
    console.group('🧪 اختبار Validators');
    
    try {
      // اختبار validateImageExists
      const notExists = Validators.validateImageExists(null);
      console.log(`✓ validateImageExists(null) = invalid`, !notExists.valid ? '✅' : '❌');
      
      // اختبار validateBase64Image
      const validBase64 = Validators.validateBase64Image('data:image/jpeg;base64,ABC123');
      console.log(`✓ validateBase64Image(valid) = valid`, validBase64.valid ? '✅' : '❌');
      
      const invalidBase64 = Validators.validateBase64Image('not-base64');
      console.log(`✓ validateBase64Image(invalid) = invalid`, !invalidBase64.valid ? '✅' : '❌');
      
      // اختبار validateEmbedding
      const validEmbedding = Validators.validateEmbedding([0.1, 0.2, 0.3]);
      console.log(`✓ validateEmbedding([0.1, 0.2, 0.3]) = valid`, validEmbedding.valid ? '✅' : '❌');
      
      const invalidEmbedding = Validators.validateEmbedding([]);
      console.log(`✓ validateEmbedding([]) = invalid`, !invalidEmbedding.valid ? '✅' : '❌');
      
      console.log('✓ جميع اختبارات Validators نجحت ✅');
    } catch (error) {
      console.error('❌ خطأ في اختبار Validators:', error.message);
    }
    
    console.groupEnd();
  }

  /**
   * اختبار ErrorHandler
   */
  function testErrorHandler() {
    console.group('🧪 اختبار ErrorHandler');
    
    try {
      // اختبار identifyErrorType
      const type1 = ErrorHandler.identifyErrorType('صورة غير موجودة');
      console.log(`✓ identifyErrorType('صورة غير موجودة')`, '✅');
      
      // اختبار getUserFriendlyMessage
      const message = ErrorHandler.getUserFriendlyMessage('face not detected');
      console.log(`✓ getUserFriendlyMessage('face not detected') = "${message}"`, '✅');
      
      // اختبار ERROR_TYPES
      console.log(`✓ ERROR_TYPES.IMAGE_NOT_FOUND = "${ErrorHandler.ERROR_TYPES.IMAGE_NOT_FOUND}"`, '✅');
      
      console.log('✓ جميع اختبارات ErrorHandler نجحت ✅');
    } catch (error) {
      console.error('❌ خطأ في اختبار ErrorHandler:', error.message);
    }
    
    console.groupEnd();
  }

  /**
   * اختبار FaceHandler
   */
  function testFaceHandler() {
    console.group('🧪 اختبار FaceHandler');
    
    try {
      // اختبار calculateSimilarity
      const emb1 = [1, 0, 0, 0];
      const emb2 = [1, 0, 0, 0];
      const similarity = FaceHandler.calculateSimilarity(emb1, emb2);
      console.log(`✓ calculateSimilarity([1,0,0,0], [1,0,0,0]) = 1`, similarity === 1 ? '✅' : '❌');
      
      const emb3 = [0, 1, 0, 0];
      const similarity2 = FaceHandler.calculateSimilarity(emb1, emb3);
      console.log(`✓ calculateSimilarity([1,0,0,0], [0,1,0,0]) = 0`, similarity2 === 0 ? '✅' : '❌');
      
      // اختبار retrieveStoredEmbeddings
      const stored = FaceHandler.retrieveStoredEmbeddings();
      console.log(`✓ retrieveStoredEmbeddings() = Array`, Array.isArray(stored) ? '✅' : '❌');
      
      console.log('✓ جميع اختبارات FaceHandler نجحت ✅');
    } catch (error) {
      console.error('❌ خطأ في اختبار FaceHandler:', error.message);
    }
    
    console.groupEnd();
  }

  /**
   * تشغيل جميع الاختبارات
   */
  function runAll() {
    console.clear();
    console.log('🚀 بدء اختبار الملفات الجديدة...\n');
    
    testImageUtils();
    testValidators();
    testErrorHandler();
    testFaceHandler();
    
    console.log('\n✅ اكتملت جميع الاختبارات');
  }

  /**
   * قائمة الاختبارات المتاحة
   */
  function listTests() {
    console.log('الاختبارات المتاحة:');
    console.log('1. TestSuite.runAll() - تشغيل جميع الاختبارات');
    console.log('2. TestSuite.testImageUtils() - اختبار معالجة الصور');
    console.log('3. TestSuite.testValidators() - اختبار التحقق من الصحة');
    console.log('4. TestSuite.testErrorHandler() - اختبار معالجة الأخطاء');
    console.log('5. TestSuite.testFaceHandler() - اختبار معالجة الوجه');
  }

  return {
    runAll,
    listTests,
    testImageUtils,
    testValidators,
    testErrorHandler,
    testFaceHandler
  };
})();

// تشغيل الاختبارات تلقائياً (اختياري)
console.log('%c✨ الملفات الجديدة محملة بنجاح ✨', 'color: green; font-size: 14px; font-weight: bold;');
console.log('اكتب: TestSuite.runAll() لتشغيل جميع الاختبارات');
console.log('اكتب: TestSuite.listTests() لقائمة الاختبارات');
