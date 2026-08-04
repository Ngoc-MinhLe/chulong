// Sử dụng cú pháp của Firebase v8 (compat)
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRz-WubZ9tsp_bfaiGpu5Iz_kOgC68vbQ",
  authDomain: "lengocminh-74a9e.firebaseapp.com",
  projectId: "lengocminh-74a9e",
  storageBucket: "lengocminh-74a9e.appspot.com", // Sửa lại tên bucket cho đúng chuẩn
  messagingSenderId: "528797008471",
  appId: "1:528797008471:web:d2c169aa256980a7645912",
  measurementId: "G-BSG9SQDGJR"
};

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// **GIẢI PHÁP KỸ THUẬT CHO LỖI MẠNG**
// Thêm cài đặt này để thử khắc phục các lỗi như "Could not reach Cloud Firestore backend".
// Nó sẽ buộc Firestore sử dụng một phương thức kết nối ổn định hơn (Long-Polling)
// thay vì WebSockets, vốn có thể bị chặn bởi một số cấu hình mạng hoặc phần mềm.
db.settings({ experimentalForceLongPolling: true });

// --- GLOBAL LOGGING FUNCTION ---
// Hàm này sẽ được gọi từ app.js để ghi log
async function logAction(actionType, details, sessionId) {
  try {
    const docRef = await db.collection("edit_logs").add({
      action: actionType,
      details: details,
      sessionId: sessionId, // Thêm sessionId vào log
      timestamp: firebase.firestore.FieldValue.serverTimestamp() // Tự động lấy thời gian của server
    });
    console.log("Log saved with ID: ", docRef.id);
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}