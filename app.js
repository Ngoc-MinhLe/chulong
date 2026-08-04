const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('hiddenVideo');

let uploadedImage = null;
let isVideo = false;
let mediaRecorder = null;
let recordedChunks = [];
let currentSessionId = null;
let animationFrameId = null;

// Icon "Khiên có dấu tích" SVG
const verifiedIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6L12 2zm-1.05 16.5L6.4 14.95l1.4-1.4 2.15 2.15 4.25-4.25 1.4 1.4L10.95 18.5z"/></svg>`;
const verifiedIcon = new Image();
verifiedIcon.src = 'data:image/svg+xml;base64,' + btoa(verifiedIconSVG);

function setCurrentDateTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('timeInput').value = `${hours}:${minutes}`;

  const day = String(now.getDate()).padStart(2, '0');
  const monthPadded = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

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

  currentSessionId = `session_${Date.now()}`;

  logAction('upload_file', {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size
  }, currentSessionId);

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
    drawDefaultFooter(scale);
  } else if (template === 'template2') {
    drawTemplate2(scale);
    drawDefaultFooter(scale);
  } else if (template === 'template3') {
    drawTemplate3(scale);
  } else if (template === 'template4') {
    drawTemplate4(scale);
  }

  // MÃ VERIFY DỌC (CHỈ IN TRÊN ẢNH)
  if (!isVideo) {
    drawVerticalVerifyCode(scale);
  }
}

function formatDateForCanvas(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day} Tháng ${parseInt(month, 10)}, ${year}`;
}

function getDayNameFromDate(isoDate) {
  if (!isoDate) return '';
  const dateObj = new Date(isoDate + 'T00:00:00');
  const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  return days[dateObj.getDay()];
}

function drawDefaultFooter(scale) {
  // VẼ DÒNG CAM KẾT (GÓC DƯỚI TRÁI)
  const commitmentText = " Cam kết ngày giờ chân thực bởi Timemark";
  const commitmentX = 35 * scale;
  const commitmentY = canvas.height - (30 * scale);
  const commitmentIconSize = 18 * scale;
  
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
  ctx.shadowBlur = 4 * scale;
  ctx.drawImage(verifiedIcon, commitmentX, commitmentY - commitmentIconSize * 0.85, commitmentIconSize, commitmentIconSize);
  ctx.font = `400 ${14 * scale}px 'Roboto', sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillText(commitmentText, commitmentX + commitmentIconSize, commitmentY);
  ctx.restore();

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
}

function drawVerticalVerifyCode(scale) {
  const verifyText = document.getElementById('verifyInput').value;
  ctx.save();
  const centerY = canvas.height / 2;
  ctx.translate(canvas.width - (12 * scale), centerY);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `400 ${12 * scale}px 'Roboto', sans-serif`;
  ctx.textAlign = "center";
  const textWidth = ctx.measureText(" " + verifyText).width;
  const iconSize = 14 * scale;
  ctx.drawImage(verifiedIcon, -textWidth/2 - iconSize, -iconSize/2, iconSize, iconSize);
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.fillText(" " + verifyText, 0, 0);
  ctx.restore();
}

// ================= MẪU 1: BADGE GIỜ TRẮNG/CAM =================
function drawTemplate1(scale) {
  const labelText = document.getElementById('labelInput').value;
  const timeText = document.getElementById('timeInput').value;
  const rawDate = document.getElementById('dateInput').value;
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
  const timeFontSize = 75 * scale;
  const addressFontSize = 23 * scale;
  
  let fullLocationStr = labelText ? `${labelText}, ${addressText}` : addressText;
  if (gpsText) fullLocationStr += ` (${gpsText})`;

  const startY = canvas.height - paddingBottom - (130 * scale);

  ctx.font = `700 ${timeFontSize}px 'Roboto Condensed', sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(timeText, paddingLeft, startY + (60 * scale));

  const timeWidth = ctx.measureText(timeText).width;
  const stripeX = paddingLeft + timeWidth + (15 * scale);

  ctx.fillStyle = "#f5a623";
  ctx.fillRect(stripeX, startY + (10 * scale), 4 * scale, 55 * scale);

  const dateX = stripeX + (15 * scale);
  ctx.fillStyle = "#ffffff";
  ctx.font = `500 ${23 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(dateText, dateX, startY + (30 * scale));

  ctx.font = `500 ${21 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(dayNameText, dateX, startY + (58 * scale));

  ctx.font = `400 ${addressFontSize}px 'Roboto Condensed', sans-serif`;
  wrapText(ctx, fullLocationStr, paddingLeft, startY + (100 * scale), 700 * scale, 30 * scale);

  ctx.restore();
}

// ================= MẪU 3: TIMEMARK VỊ TRÍ & ĐỊNH VỊ (ẢNH 1) =================
function drawTemplate3(scale) {
  const addressText = document.getElementById('addressInput').value || "Vịnh Vân Phong";
  const countryText = (document.getElementById('countryInput') && document.getElementById('countryInput').value) || "Việt Nam";
  const gpsText = document.getElementById('gpsInput').value || "12.642598°N, 109.403144°E";
  
  // Thông tin thời tiết & la bàn
  const weatherTemp = (document.getElementById('weatherInput') && document.getElementById('weatherInput').value) || "30°C";
  const weatherIconType = (document.getElementById('weatherIconSelect') && document.getElementById('weatherIconSelect').value) || "cloud";
  const compassText = (document.getElementById('compassInput') && document.getElementById('compassInput').value) || "317° NW";

  const rawDate = document.getElementById('dateInput').value;
  const timeText = document.getElementById('timeInput').value;
  const dayNameText = getDayNameFromDate(rawDate);
  const dateFormatted = formatDateForCanvas(rawDate);
  const fullDateTimeStr = `${dayNameText}, ${dateFormatted} ${timeText}`;

  ctx.save();

  // 1. DẢI NỀN MỜ PHỦ NGANG Ở ĐÁY ẢNH (DARK TRANSLUCENT OVERLAY)
  const overlayHeight = 210 * scale;
  const overlayY = canvas.height - overlayHeight;

  ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
  ctx.fillRect(0, overlayY, canvas.width, overlayHeight);

  // 2. LOGO TIMEMARK CAMERA (GÓC TRÊN PHẢI CỦA DẢI NỀN MỜ)
  const logoRightX = canvas.width - (220 * scale);
  const logoTopY = overlayY + (22 * scale);

  // Ô Camera vàng
  //ctx.fillStyle = "#f5a623";
 // drawRoundedRect(ctx, logoRightX, logoTopY, 32 * scale, 24 * scale, 5 * scale);
  // ctx.fill(); // Đã xóa lệnh fill() thừa

  // Chữ 'Time' bên trong ống kính camera
 // ctx.font = `bold ${10 * scale}px 'Roboto', sans-serif`;
  //ctx.fillStyle = "#000000";
  //ctx.textAlign = "center";
  //ctx.fillText("Time", logoRightX + (16 * scale), logoTopY + (15 * scale));

  // Nút bấm camera nhỏ bên trên
  //ctx.fillRect(logoRightX + (10 * scale), logoTopY - (3 * scale), 12 * scale, 3 * scale);

  // Chữ 'Timemark Camera' màu trắng bên cạnh
  ctx.font = `500 ${18 * scale}px 'Roboto', sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("Timemark Camera", logoRightX + (40 * scale), logoTopY + (18 * scale));

  // 3. NỘI DUNG VĂN BẢN BÊN TRÁI
  const paddingLeft = 35 * scale;
  const textBaseY = overlayY + (52 * scale);

  // - Tên Địa Điểm
  ctx.font = `700 ${34 * scale}px 'Roboto', sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(addressText, paddingLeft, textBaseY);

  // - Quốc Gia / Khu Vực
  ctx.font = `500 ${22 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(countryText, paddingLeft, textBaseY + (36 * scale));

  // - Tọa Độ GPS
  ctx.font = `400 ${22 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(gpsText, paddingLeft, textBaseY + (72 * scale));

  // - Ngày Giờ
  ctx.font = `500 ${22 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(fullDateTimeStr, paddingLeft, textBaseY + (108 * scale));

  // 4. KHU VỰC BÊN PHẢI: LA BÀN & THỜI TIẾT
  const rightInfoX = canvas.width - (180 * scale);
  const compassY = textBaseY + (70 * scale);

  // --- Vẽ Icon La Bàn (Vòng tròn trắng + Kim đỏ) ---
  const compassRadius = 13 * scale;
  const compassCenterX = rightInfoX + compassRadius;
  const compassCenterY = compassY - (6 * scale);

  ctx.beginPath();
  ctx.arc(compassCenterX, compassCenterY, compassRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Kim đỏ chỉ hướng
  ctx.beginPath();
  ctx.moveTo(compassCenterX, compassCenterY - (9 * scale));
  ctx.lineTo(compassCenterX + (4 * scale), compassCenterY + (3 * scale));
  ctx.lineTo(compassCenterX - (4 * scale), compassCenterY + (3 * scale));
  ctx.fillStyle = "#ef4444";
  ctx.fill();

  // Chữ Hướng La Bàn
  ctx.font = `500 ${22 * scale}px 'Roboto', sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(compassText, compassCenterX + compassRadius + (10 * scale), compassY);

  // --- Vẽ Thời Tiết ---
  const weatherY = compassY + (38 * scale);
  let weatherEmoji = "☁️";
  if (weatherIconType === "sun") weatherEmoji = "☀️";
  else if (weatherIconType === "sun_cloud") weatherEmoji = "⛅";
  else if (weatherIconType === "rain") weatherEmoji = "🌧️";

  ctx.font = `500 ${22 * scale}px 'Roboto', sans-serif`;
  ctx.fillText(`${weatherEmoji} ${weatherTemp}`, rightInfoX + (4 * scale), weatherY);

  // 5. VẠCH KẺ VÀNG DƯỚI CÙNG XUYÊN SUỐT
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - (4 * scale));
  ctx.lineTo(canvas.width, canvas.height - (4 * scale));
  ctx.strokeStyle = "#f5a623";
  ctx.lineWidth = 4 * scale;
  ctx.stroke();

  ctx.restore();
}

// ================= MẪU 4: BẢNG NHẬT KÝ CÔNG VIỆC (ẢNH 2) =================
function drawTemplate4(scale) {
  const titleText = document.getElementById('labelInput').value.trim() || "Nhật ký công việc";
  const addressText = document.getElementById('addressInput').value || "Vịnh Vân Phong";
  const gpsText = document.getElementById('gpsInput').value || "12.638405°N, 109.347044°E";
  const weatherText = (document.getElementById('weatherInput') && document.getElementById('weatherInput').value) || "Nhiều mây 30°C";
  
  const rawDate = document.getElementById('dateInput').value;
  const timeText = document.getElementById('timeInput').value;
  const dayNameText = getDayNameFromDate(rawDate);
  
  let formattedShortDate = "";
  if (rawDate) {
    const [y, m, d] = rawDate.split('-');
    formattedShortDate = `${d}/${m}/${y}`;
  }
  const timeStr = `${dayNameText}, ${formattedShortDate} ${timeText}`;

  ctx.save();

  const paddingLeft = 15 * scale;
  const paddingBottom = 25 * scale;
  const cardWidth = 480 * scale;
  
  const headerHeight = 46 * scale;
  const rowHeight = 36 * scale;
  const rowsCount = 4;
  const bodyHeight = rowHeight * rowsCount + (15 * scale);
  const totalCardHeight = headerHeight + bodyHeight;

  const startY = canvas.height - paddingBottom - totalCardHeight;

  // 1. Tiêu đề Card
  ctx.fillStyle = "#d97706";
  ctx.fillRect(paddingLeft, startY, cardWidth, headerHeight);

  ctx.font = `700 ${22 * scale}px 'Roboto', sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(titleText, paddingLeft + (18 * scale), startY + (31 * scale));

  // 2. Thân Card (Khung xám mờ Translucent)
  ctx.fillStyle = "rgba(209, 213, 219, 0.82)";
  ctx.fillRect(paddingLeft, startY + headerHeight, cardWidth, bodyHeight);

  // 3. Nội dung 4 hàng
  const labelX = paddingLeft + (18 * scale);
  const valueX = paddingLeft + (140 * scale);
  let currentY = startY + headerHeight + (28 * scale);

  const rows = [
    { label: "Thời gian", value: timeStr },
    { label: "Thời tiết", value: weatherText },
    { label: "Vị trí", value: addressText },
    { label: "Tọa độ", value: gpsText }
  ];

  rows.forEach(row => {
    ctx.font = `700 ${19 * scale}px 'Roboto', sans-serif`;
    ctx.fillStyle = "#374151";
    ctx.fillText(row.label, labelX, currentY);

    ctx.font = `500 ${19 * scale}px 'Roboto', sans-serif`;
    ctx.fillStyle = "#111827";
    ctx.fillText(row.value, valueX, currentY);

    currentY += rowHeight;
  });

  // 4. Logo Timemark (Góc Dưới Phải)
  const rightX = canvas.width - (160 * scale);
  const logoY = canvas.height - (45 * scale);

  ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
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
  let options = {}; // Khởi tạo rỗng, sẽ được điền sau
  let preferredMimeType = 'video/webm'; // Mặc định cho tên file nếu không tìm thấy gì tốt hơn
  
  // Ưu tiên MP4 nếu được hỗ trợ
  if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
    options = { mimeType: 'video/mp4;codecs=avc1' };
    preferredMimeType = 'video/mp4';
    console.log("Recording in MP4 (H.264) format.");
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
    options = { mimeType: 'video/webm;codecs=vp9' };
    preferredMimeType = 'video/webm';
    console.log("Recording in WebM (VP9) format.");
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
    options = { mimeType: 'video/webm;codecs=vp8' };
    preferredMimeType = 'video/webm';
    console.log("Recording in WebM (VP8) format.");
  } else {
    // Nếu không có codec cụ thể nào được hỗ trợ, thử với webm chung
    console.warn("No specific video codec supported, trying generic webm.");
    options = { mimeType: 'video/webm' };
    preferredMimeType = 'video/webm';
  }

  try {
    mediaRecorder = new MediaRecorder(stream, options);
  } catch (e) {
    console.error("Failed to create MediaRecorder with specified options, falling back to generic webm:", e);
    // Fallback nếu các tùy chọn cụ thể không hoạt động
    try { // Thử lại với tùy chọn webm chung nhất
        options = { mimeType: 'video/webm' };
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (fallbackError) {
        console.error("Failed to create MediaRecorder even with generic webm options:", fallbackError);
        alert("Trình duyệt của bạn không hỗ trợ ghi video. Vui lòng thử trình duyệt khác.");
        return; // Không thể ghi video
    }
  }

  mediaRecorder.ondataavailable = function(e) { // Đặt ondataavailable sau khi mediaRecorder được khởi tạo
    if (e.data.size > 0) recordedChunks.push(e.data);
  };
}

function downloadMedia() {
  const labelValue = document.getElementById('labelInput').value.trim();
  const addressValue = document.getElementById('addressInput').value.trim();

  if (!labelValue || !addressValue) {
    alert('Vui lòng nhập đầy đủ "Tên đơn vị" và "Địa chỉ / Vị trí" trước khi tải về.');
    return;
  }

  const now = new Date();
  const filename = `Timemark_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;

  if (!isVideo) {
    if (!uploadedImage) return alert("Vui lòng chọn ảnh!");

    const watermarkContent = {
        template: document.getElementById('templateSelect').options[document.getElementById('templateSelect').selectedIndex].text,
        label: document.getElementById('labelInput').value,
        time: document.getElementById('timeInput').value,
        date: document.getElementById('dateInput').value,
        gps: document.getElementById('gpsInput').value,
        address: document.getElementById('addressInput').value,
        verify_code: document.getElementById('verifyInput').value
    };
    logAction('download_media', { type: 'image', filename: `${filename}.png`, watermark_content: watermarkContent }, currentSessionId);

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } else {
    document.getElementById('status').innerText = "⏳ Đang trích xuất video...";
    
    const watermarkContent = {
        template: document.getElementById('templateSelect').options[document.getElementById('templateSelect').selectedIndex].text,
        label: document.getElementById('labelInput').value,
        time: document.getElementById('timeInput').value,
        date: document.getElementById('dateInput').value,
        gps: document.getElementById('gpsInput').value,
        address: document.getElementById('addressInput').value,
    };
    const fileExtension = mediaRecorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
    logAction('download_media', { type: 'video', filename: `${filename}.${fileExtension}`, duration: video.duration, mimeType: mediaRecorder.mimeType, watermark_content: watermarkContent }, currentSessionId);

    recordedChunks = [];
    mediaRecorder.start();

    setTimeout(() => {
      mediaRecorder.stop();
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType }); // Sử dụng mimeType thực tế
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.${fileExtension}`;
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