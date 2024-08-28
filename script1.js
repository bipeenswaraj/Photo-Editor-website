// JavaScript for Enhanced Photo Editor with Realistic Cropping

// Variables for canvas and context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
let originalImage = null;
let history = [];
let currentIndex = -1;

// Variables for cropping
let cropping = false;
let cropRect = { x: 0, y: 0, width: 0, height: 0 };
let isDragging = false; // True if we are dragging the entire crop area
let isResizing = false; // True if we are resizing the crop area
let cropHandle = ''; // Which handle is being dragged

// Load image onto the canvas
upload.addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
            saveState(); // Save the initial state
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// Apply filter function
// Apply filter function
function applyFilter(filter) {
    if (!originalImage) return;

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    if (filter === 'blur') {
        data = applyBlur(data, imageData.width, imageData.height);
    } else if (filter === 'sharpen') {
        data = applySharpen(data, imageData.width, imageData.height);
    } else {
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            if (filter === 'grayscale') {
                let gray = (r + g + b) / 3;
                data[i] = data[i + 1] = data[i + 2] = gray;
            } else if (filter === 'sepia') {
                data[i] = r * 0.393 + g * 0.769 + b * 0.189;
                data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
                data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
            } else if (filter === 'invert') {
                data[i] = 255 - r;
                data[i + 1] = 255 - g;
                data[i + 2] = 255 - b;
            } else if (filter === 'ai-enhance') {
                data[i] = clamp(r * 1.1 + 10);
                data[i + 1] = clamp(g * 1.1 + 10);
                data[i + 2] = clamp(b * 1.1 + 10);
            } else if (filter === 'pixelate') {
                const blockSize = 10;
                const startX = Math.floor(i / 4 / canvas.width) * blockSize;
                const startY = (i / 4) % canvas.width * blockSize;
                for (let x = startX; x < startX + blockSize && x < canvas.width; x++) {
                    for (let y = startY; y < startY + blockSize && y < canvas.height; y++) {
                        const index = (x + y * canvas.width) * 4;
                        data[index] = r;
                        data[index + 1] = g;
                        data[index + 2] = b;
                    }
                }
            } else if (filter === 'noise') {
                const noise = 50;
                data[i] += Math.random() * noise - noise / 2;
                data[i + 1] += Math.random() * noise - noise / 2;
                data[i + 2] += Math.random() * noise - noise / 2;
            } else if (filter === 'sepia') {
                data[i] = r * 0.393 + g * 0.769 + b * 0.189;
                data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168;
                data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131;
            } else if (filter === 'brightness') {
                data[i] += 50; // Example: Increase brightness by 50
                data[i + 1] += 50; // Example: Increase brightness by 50
                data[i + 2] += 50; // Example: Increase brightness by 50
            } else if (filter === 'invert') {
                data[i] = 255 - r;
                data[i + 1] = 255 - g;
                data[i + 2] = 255 - b;
            } else if (filter === 'reset') {
                ctx.putImageData(originalImage, 0, 0);
                return;
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
    saveState();
}
// Function to convert canvas to GIF
function convertToGIF(delay = 200) {
	console.log('Convert to GIF button clicked');
    const gif = new GIF({
        workers: 2,
        quality: 10,
        background: '#ffffff',
        transparent: 'rgba(0, 0, 0, 0)'
    });

    gif.addFrame(canvas, { delay });

    gif.on('finished', function(blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'animated.gif';
        link.click();
        URL.revokeObjectURL(url);
    });

    gif.render();
}



// Brightness adjustment function
function adjustBrightness(value) {
    if (!originalImage) return;

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i] + value);
        data[i + 1] = clamp(data[i + 1] + value);
        data[i + 2] = clamp(data[i + 2] + value);
    }

    ctx.putImageData(imageData, 0, 0);
}

// Clamp function to keep color values within the valid range
function clamp(value) {
    return Math.max(0, Math.min(255, value));
}

// Advanced filters: blur and sharpen
function applyBlur(data, width, height) {
    const kernel = [1/16, 1/8, 1/16, 1/8, 1/4, 1/8, 1/16, 1/8, 1/16];
    return applyConvolution(data, width, height, kernel);
}

function applySharpen(data, width, height) {
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    return applyConvolution(data, width, height, kernel);
}

function applyConvolution(data, width, height, kernel) {
    const half = Math.floor(Math.sqrt(kernel.length) / 2);
    const newData = new Uint8ClampedArray(data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;

            for (let ky = -half; ky <= half; ky++) {
                for (let kx = -half; kx <= half; kx++) {
                    const xPos = Math.min(width - 1, Math.max(0, x + kx));
                    const yPos = Math.min(height - 1, Math.max(0, y + ky));
                    const index = (yPos * width + xPos) * 4;
                    const k = kernel[(ky + half) * (half * 2 + 1) + (kx + half)];

                    r += data[index] * k;
                    g += data[index + 1] * k;
                    b += data[index + 2] * k;
                    a += data[index + 3] * k;
                }
            }

            const i = (y * width + x) * 4;
            newData[i] = clamp(r);
            newData[i + 1] = clamp(g);
            newData[i + 2] = clamp(b);
            newData[i + 3] = clamp(a);
        }
    }

    for (let i = 0; i < data.length; i++) {
        data[i] = newData[i];
    }
    return data;
}

// Undo and redo functions
function saveState() {
    if (currentIndex < history.length - 1) {
        history = history.slice(0, currentIndex + 1);
    }
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    currentIndex++;
}

function undo() {
    if (currentIndex > 0) {
        currentIndex--;
        ctx.putImageData(history[currentIndex], 0, 0);
    }
}

function redo() {
    if (currentIndex < history.length - 1) {
        currentIndex++;
        ctx.putImageData(history[currentIndex], 0, 0);
    }
}

// Export the edited image
function exportImage() {
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = canvas.toDataURL();
    link.click();
}

// Add text to the canvas
function addText() {
    const text = document.getElementById('text-input').value;
    const font = document.getElementById('font-select').value;
    const color = document.getElementById('text-color').value;

    if (text) {
        ctx.font = `30px ${font}`;
        ctx.fillStyle = color;
        ctx.fillText(text, canvas.width / 2 - ctx.measureText(text).width / 2, canvas.height / 2);
        saveState();
    }
}

// Start cropping with draggable handles
function startCrop() {
    cropping = true;
    canvas.style.cursor = 'crosshair';

    // Initialize crop area to the center of the image with default size
    cropRect.x = canvas.width / 4;
    cropRect.y = canvas.height / 4;
    cropRect.width = canvas.width / 2;
    cropRect.height = canvas.height / 2;

    drawCropOverlay();
}

// Apply the cropping to the canvas
function applyCrop() {
    if (!cropping || cropRect.width <= 0 || cropRect.height <= 0) return;

    cropping = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = cropRect.width;
    canvas.height = cropRect.height;

    ctx.putImageData(ctx.getImageData(cropRect.x, cropRect.y, cropRect.width, cropRect.height), 0, 0);
    saveState();
}

// Draw the cropping area with handles
function drawCropOverlay() {
    ctx.putImageData(originalImage, 0, 0); // Redraw the original image
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([6]);
    ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height);
    drawHandles();
}

// Draw handles for resizing the crop area
function drawHandles() {
    const size = 8;
    ctx.fillStyle = 'red';
    ctx.setLineDash([]);
    
    // Top-left
    ctx.fillRect(cropRect.x - size / 2, cropRect.y - size / 2, size, size);
    // Top-right
    ctx.fillRect(cropRect.x + cropRect.width - size / 2, cropRect.y - size / 2, size, size);
    // Bottom-left
    ctx.fillRect(cropRect.x - size / 2, cropRect.y + cropRect.height - size / 2, size, size);
    // Bottom-right
    ctx.fillRect(cropRect.x + cropRect.width - size / 2, cropRect.y + cropRect.height - size / 2, size, size);
}

// Mouse interactions during cropping
canvas.addEventListener('mousedown', (event) => {
    if (cropping) {
        const { offsetX, offsetY } = event;
        cropStartX = offsetX;
        cropStartY = offsetY;

        // Check if the click is near the handles
        cropHandle = getCropHandle(offsetX, offsetY);

        if (!cropHandle) {
            // If not clicking on a handle, check if we are within the crop area
            if (isInsideCropArea(offsetX, offsetY)) {
                isDragging = true;
                canvas.style.cursor = 'move';
            }
        } else {
            isResizing = true;
            canvas.style.cursor = getCursorStyle(cropHandle);
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    if (cropping) {
        const { offsetX, offsetY } = event;

        if (isDragging) {
            moveCropArea(offsetX, offsetY);
            drawCropOverlay();
        } else if (isResizing && cropHandle) {
            resizeCropArea(offsetX, offsetY);
            drawCropOverlay();
        } else {
            // Change cursor style based on position
            const handle = getCropHandle(offsetX, offsetY);
            canvas.style.cursor = handle ? getCursorStyle(handle) : 'crosshair';
        }
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
    cropHandle = '';
    canvas.style.cursor = 'crosshair';
});

function getCropHandle(x, y) {
    const size = 8;
    const { x: cx, y: cy, width, height } = cropRect;

    if (Math.abs(x - cx) < size && Math.abs(y - cy) < size) return 'tl';
    if (Math.abs(x - (cx + width)) < size && Math.abs(y - cy) < size) return 'tr';
    if (Math.abs(x - cx) < size && Math.abs(y - (cy + height)) < size) return 'bl';
    if (Math.abs(x - (cx + width)) < size && Math.abs(y - (cy + height)) < size) return 'br';
    return null;
}

function isInsideCropArea(x, y) {
    const { x: cx, y: cy, width, height } = cropRect;
    return x > cx && x < cx + width && y > cy && y < cy + height;
}

function moveCropArea(x, y) {
    const dx = x - cropStartX;
    const dy = y - cropStartY;
    cropRect.x += dx;
    cropRect.y += dy;
    cropStartX = x;
    cropStartY = y;
}

function resizeCropArea(x, y) {
    const { x: cx, y: cy, width, height } = cropRect;

    switch (cropHandle) {
        case 'tl':
            cropRect.width += cropRect.x - x;
            cropRect.height += cropRect.y - y;
            cropRect.x = x;
            cropRect.y = y;
            break;
        case 'tr':
            cropRect.width = x - cropRect.x;
            cropRect.height += cropRect.y - y;
            cropRect.y = y;
            break;
        case 'bl':
            cropRect.width += cropRect.x - x;
            cropRect.height = y - cropRect.y;
            cropRect.x = x;
            break;
        case 'br':
            cropRect.width = x - cropRect.x;
            cropRect.height = y - cropRect.y;
            break;
    }
}

function getCursorStyle(handle) {
    switch (handle) {
        case 'tl':
        case 'br':
            return 'nwse-resize';
        case 'tr':
        case 'bl':
            return 'nesw-resize';
        default:
            return 'crosshair';
    }
}

// Enable drag-and-drop functionality
canvas.addEventListener('dragover', (event) => {
    event.preventDefault();
});

canvas.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
        const reader = new FileReader();

        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
                saveState(); // Save the initial state after drag-and-drop
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
});
