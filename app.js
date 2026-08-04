const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('hiddenVideo');

let uploadedImage = null;
let isVideo = false;
let mediaRecorder = null;
let recordedChunks = [];
let animationFrameId = null;

function setCurrentDateTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('timeInput').value = `${hours}:${minutes}`;

  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const day = String(now.getDate()).padStart(2, '0');
  const month = now.getMonth() + 1;
  const monthPadded = String(month).padStart(2, '0');
  const year = now.getFullYear();

  // Định dạng YYYY-MM-DD cho input type="date"
  document.getElementById('dateInput').value = `${year}-${monthPadded}-${day}`;
}

function generateRandomVerifyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 14; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result + ' Timemark Verified';
}

function getCurrentGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude.toFixed(6);
      const lng = position.coords.longitude.toFixed(6);
      document.getElementById('gpsInput').value = `${lat}°N, ${lng}°E`;
      applyWatermark();
    }, () => {
      alert("Không thể lấy vị trí GPS hiện tại!");
    });
  }
}

function regenerateCode() {
  document.getElementById('verifyInput').value = generateRandomVerifyCode();
  applyWatermark();
}

document.getElementById('mediaInput').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  video.pause();

  if (file.type.startsWith('video/')) {
    isVideo = true;
    uploadedImage = null;
    const videoURL = URL.createObjectURL(file);
    video.src = videoURL;
    video.onloadedmetadata = function() {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      video.play();
      renderVideoLoop();
      setupVideoRecorder();
    };
  } else {
    isVideo = false;
    const reader = new FileReader();
    reader.onload = function(event) {
      uploadedImage = new Image();
      uploadedImage.onload = function() {
        canvas.width = uploadedImage.width;
        canvas.height = uploadedImage.height;
        drawOverlay();
      };
      uploadedImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
  document.getElementById('verifyInput').value = generateRandomVerifyCode();
});

function renderVideoLoop() {
  if (!isVideo) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  drawOverlay();
  animationFrameId = requestAnimationFrame(renderVideoLoop);
}

function applyWatermark() {
  if (!isVideo && uploadedImage) {
    drawOverlay();
  }
}

function drawOverlay() {
  if (!uploadedImage && !isVideo) {
    canvas.width = 900;
    canvas.height = 1200;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "20px 'Roboto', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Vui lòng chọn Ảnh hoặc Video...", canvas.width/2, canvas.height/2);
    ctx.textAlign = "left";
    return;
  }

  if (!isVideo && uploadedImage) {
    ctx.drawImage(uploadedImage, 0, 0);
  }

  const scale = canvas.width / 1000; 
  const template = document.getElementById('templateSelect').value;

  if (template === 'template1') {
    drawTemplate1(scale);
  } else {
    drawTemplate2(scale);
  }

  // VẼ LOGO TIMEMARK (GÓC DƯỚI PHẢI)
  const rightX = canvas.width - (160 * scale);
  const logoY = canvas.height - (55 * scale);

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 4 * scale;

  ctx.font = `bold ${22 * scale}px 'Roboto', sans-serif`;
  ctx.fillStyle = "#f5a623";
  ctx.fillText("Time", rightX, logoY);

  const timeWordWidth = ctx.measureText("Time").width;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("mark", rightX + timeWordWidth, logoY);

  ctx.font = `400 ${13 * scale}px 'Roboto', sans-serif`;
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("100% Chân thực", rightX, logoY + (18 * scale));
  ctx.restore();

  // MÃ VERIFY DỌC (CHỈ IN TRÊN ẢNH)
  if (!isVideo) {
    const verifyText = document.getElementById('verifyInput').value;
    ctx.save();
    const centerY = canvas.height / 2;
    ctx.translate(canvas.width - (12 * scale), centerY);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `400 ${12 * scale}px 'Roboto', sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.textAlign = "center";
    ctx.fillText("🛡 " + verifyText, 0, 0);
    ctx.restore();
  }
}

function formatDateForCanvas(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day} Tháng ${parseInt(month, 10)},${year}`;
}

function getDayNameFromDate(isoDate) {
  if (!isoDate) return '';
  const dateObj = new Date(isoDate + 'T00:00:00'); // Tránh lỗi timezone
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return days[dateObj.getDay()];
}

// ================= MẪU 1: BADGE GIỜ TRẮNG/CAM =================
function drawTemplate1(scale) {
  const labelText = document.getElementById('labelInput').value;
  const timeText = document.getElementById('timeInput').value;
  
  const rawDate = document.getElementById('dateInput').value;
  // Tự động lấy "Thứ" từ "Ngày"
  const dateText = formatDateForCanvas(rawDate);
  const dayNameText = getDayNameFromDate(rawDate);

  const fullDateStr = `${dayNameText}, ${dateText}`;
  const addressText = document.getElementById('addressInput').value;
  const gpsText = document.getElementById('gpsInput').value;

  ctx.save();
  const paddingLeft = 35 * scale;
  const paddingBottom = 45 * scale;
  const badgeHeight = 48 * scale;
  
  let textLines = 1;
  if (gpsText) textLines++;
  if (addressText) textLines++;
  
  const addressBlockHeight = (30 + textLines * 26) * scale;
  const totalWatermarkHeight = badgeHeight + addressBlockHeight;
  const startY = canvas.height - paddingBottom - totalWatermarkHeight;

  ctx.font = `bold ${19 * scale}px 'Roboto', sans-serif`;
  const labelWidth = ctx.measureText(labelText).width + (28 * scale);
  ctx.font = `bold ${32 * scale}px 'Roboto Condensed', sans-serif`;
  const timeWidth = ctx.measureText(timeText).width + (28 * scale);
  const totalBadgeWidth = labelWidth + timeWidth;

  ctx.fillStyle = "#ffffff";
  drawRoundedRect(ctx, paddingLeft, startY, totalBadgeWidth, badgeHeight, 6 * scale);
  ctx.fill();

  ctx.fillStyle = "#f5a623";
  drawRoundedRect(ctx, paddingLeft + (3 * scale), startY + (3 * scale), labelWidth - (5 * scale), badgeHeight - (6 * scale), 4 * scale);
  ctx.fill();

  ctx.fillStyle = "#000000";
  ctx.font = `bold ${18 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(labelText, paddingLeft + (12 * scale), startY + (31 * scale));

  ctx.fillStyle = "#091e35";
  ctx.font = `bold ${32 * scale}px 'Roboto Condensed', sans-serif`;
  ctx.fillText(timeText, paddingLeft + labelWidth + (10 * scale), startY + (34 * scale));

  const infoStartY = startY + badgeHeight + (20 * scale);
  let currentY = infoStartY + (18 * scale);

  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 4 * scale;

  const stripeHeight = (textLines * 26) * scale;
  ctx.fillStyle = "#f5a623";
  ctx.fillRect(paddingLeft, infoStartY, 3.5 * scale, stripeHeight);

  ctx.fillStyle = "#ffffff";
  ctx.font = `500 ${22 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(fullDateStr, paddingLeft + (15 * scale), currentY);

  if (addressText) {
    currentY += 28 * scale;
    ctx.font = `400 ${20 * scale}px 'Roboto Condensed', sans-serif`;
    wrapText(ctx, addressText, paddingLeft + (15 * scale), currentY, 650 * scale, 26 * scale);
  }
  if (gpsText) {
    currentY += 28 * scale;
    ctx.font = `400 ${20 * scale}px 'Roboto Condensed', sans-serif`;
    ctx.fillText(gpsText, paddingLeft + (15 * scale), currentY);
  }

  ctx.restore();
}

// ================= MẪU 2: GIỜ KHỔ LỚN + VẠCH ĐỨNG =================
function drawTemplate2(scale) {
  const labelText = document.getElementById('labelInput').value;
  const timeText = document.getElementById('timeInput').value;

  const rawDate = document.getElementById('dateInput').value;
  // Tự động lấy "Thứ" từ "Ngày"
  const dateText = formatDateForCanvas(rawDate);
  const dayNameText = getDayNameFromDate(rawDate);
  
  const gpsText = document.getElementById('gpsInput').value;
  const addressText = document.getElementById('addressInput').value;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 5 * scale;
  ctx.shadowOffsetX = 1 * scale;
  ctx.shadowOffsetY = 1 * scale;

  const paddingLeft = 35 * scale;
  const paddingBottom = 50 * scale;

  // Tính tổng chiều cao của cụm tem Mẫu 2 để đẩy vị trí Y từ dưới lên
  const timeFontSize = 75 * scale;
  const addressFontSize = 23 * scale;
  
  let fullLocationStr = labelText ? `${labelText}, ${addressText}` : addressText;
  if (gpsText) fullLocationStr += ` (${gpsText})`;

  const startY = canvas.height - paddingBottom - (130 * scale);

  // 1. In Giờ khổ lớn (Màu Trắng)
  ctx.font = `700 ${timeFontSize}px 'Roboto Condensed', sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(timeText, paddingLeft, startY + (60 * scale));

  const timeWidth = ctx.measureText(timeText).width;

  // 2. Vạch đứng ngăn cách màu vàng cam
  const stripeX = paddingLeft + timeWidth + (15 * scale);
  ctx.fillStyle = "#f5a623";
  ctx.fillRect(stripeX, startY + (10 * scale), 4 * scale, 55 * scale);

  // 3. Ngày tháng & Thứ
  const dateX = stripeX + (15 * scale);
  ctx.fillStyle = "#ffffff";
  ctx.font = `500 ${23 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(dateText, dateX, startY + (30 * scale));

  ctx.font = `500 ${21 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(dayNameText, dateX, startY + (58 * scale));

  // 4. Địa chỉ / Tên cửa hàng
  ctx.font = `400 ${addressFontSize}px 'Roboto Condensed', sans-serif`;
  wrapText(ctx, fullLocationStr, paddingLeft, startY + (100 * scale), 700 * scale, 30 * scale);

  ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    let testLine = line + words[n] + ' ';
    let metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function setupVideoRecorder() {
  const stream = canvas.captureStream(30);
  recordedChunks = [];
  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream);
  }

  mediaRecorder.ondataavailable = function(e) {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
}

function downloadMedia() {
  const now = new Date();
  const filename = `Timemark_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

  if (!isVideo) {
    if (!uploadedImage) return alert("Vui lòng chọn ảnh!");
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } else {
    document.getElementById('status').innerText = "⏳ Đang trích xuất video...";
    recordedChunks = [];
    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.webm`;
        a.click();
        document.getElementById('status').innerText = "✅ Tải video thành công!";
      };
    }, video.duration * 1000 || 5000);
  }
}

// Khởi tạo các giá trị ban đầu khi script được tải
setCurrentDateTime();
document.getElementById('verifyInput').value = generateRandomVerifyCode();
drawOverlay();