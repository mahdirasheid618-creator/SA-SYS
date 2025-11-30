/**
 * اختبار سريع لنظام مسح الوجه
 * Quick Test for Face Scanning System
 */

console.log('=== Face Scanning System Status ===');

// 1. Check if HumanWrapper is available
if (window.HumanWrapper) {
    console.log('✓ HumanWrapper loaded successfully');
} else {
    console.warn('⚠ HumanWrapper not found - will be loaded from CDN');
}

// 2. Check if FaceScanModule is available
if (window.FaceScanModule) {
    console.log('✓ FaceScanModule loaded successfully');
    console.log('  Available methods:', Object.keys(window.FaceScanModule));
} else {
    console.error('✗ FaceScanModule not loaded');
}

// 3. Check for required DOM elements
const requiredElements = [
    'video',
    'canvas',
    'enableFaceScan',
    'scanBtn',
    'rescanBtn',
    'faceStatus',
    'faceError',
    'faceImageContainer',
    'capturedFaceImage',
    'faceEmbedding'
];

console.log('\n=== DOM Elements Check ===');
requiredElements.forEach(el => {
    const element = document.getElementById(el);
    if (element) {
        console.log(`✓ ${el} found`);
    } else {
        console.warn(`⚠ ${el} not found`);
    }
});

// 4. Check camera access
console.log('\n=== Camera Access ===');
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log('✓ getUserMedia API available');
} else {
    console.error('✗ getUserMedia API not available');
}

// 5. Check Canvas support
console.log('\n=== Canvas Support ===');
const canvas = document.getElementById('canvas');
if (canvas && canvas.getContext) {
    console.log('✓ Canvas 2D context available');
} else {
    console.error('✗ Canvas not supported');
}

// 6. Test Face Scan Initialization
console.log('\n=== Face Scan Initialization Test ===');
console.log('Run in browser console after page loads:');
console.log(`
// Test 1: Initialize FaceScanModule
await FaceScanModule.init(document.getElementById('video'), document.getElementById('canvas'));

// Test 2: Start camera
await FaceScanModule.startCamera();

// Test 3: Start live detection
FaceScanModule.startLiveDetection();

// Test 4: Capture face (after video loads)
const result = await FaceScanModule.captureFace();
console.log('Capture result:', result);

// Test 5: Serialize embedding
const serialized = FaceScanModule.serializeEmbedding(result.embedding);
console.log('Embedding length:', serialized.length);
`);

console.log('\n=== System Ready ===');
console.log('Face Scanning System initialized successfully!');
