# PLAN: Chức năng Thí sinh Trả lời Realtime (Chỉ Đúng/Sai)

## 📋 Tổng quan
Bổ sung chức năng cho phép thí sinh trả lời câu hỏi trực tiếp qua hệ thống realtime, chỉ xác định đúng/sai mà không tính điểm số. Hệ thống sẽ tự động phản hồi kết quả ngay lập tức cho thí sinh và có thể tự động loại thí sinh dựa trên câu trả lời sai.

## ✅ Phân tích hiện trạng dự án

### Đã có sẵn:
- [x] **Socket.IO Integration**: Hệ thống socket đã được setup với namespace `/match-control`
- [x] **JWT Authentication**: Xác thực cho socket connections
- [x] **Database Models**: 
  - `Result` model để lưu kết quả trả lời với trường `isCorrect: boolean`
  - `Contestant` model với status management
  - `Match` model với thông tin trận đấu
  - `Question` và `QuestionDetail` models
- [x] **Result Service**: CRUD operations cho kết quả trả lời
- [x] **Match Control System**: Events cho hiển thị câu hỏi (`currentQuestion:get`)
- [x] **Room Management**: Hệ thống room theo `match-{matchId}`
- [x] **Validation Layer**: Zod schemas cho data validation
- [x] **Logging System**: Winston logger cho audit trail
- [x] **Role-based Access**: Admin, Judge, Student roles

### Đã hoàn thành (Phase 1-2):
- [x] **Student Socket Authentication**: ✅ Thí sinh đã có quyền connect socket
- [x] **Answer Submission Events**: ✅ Events cho việc nộp bài realtime đã được tạo
- [x] **Answer Validation System**: ✅ Kiểm tra đáp án đúng/sai realtime cơ bản
- [x] **Answer History Tracking**: ✅ Lưu vết lịch sử trả lời trong Result table
- [x] **Realtime Match Control**: ✅ Bắt đầu trận đấu, chuyển câu hỏi realtime
- [x] **Timer System**: ✅ Countdown timer cho từng câu hỏi với pause/resume
- [x] **Match Status Management**: ✅ Theo dõi trạng thái trận đấu realtime
- [x] **Auto Timer Updates**: ✅ Cập nhật thời gian còn lại mỗi giây

### Còn thiếu (Phases tiếp theo):
- [ ] **Auto Elimination Logic**: Logic tự động loại thí sinh (nếu cần)
- [ ] **Contestant Status Updates**: Cập nhật trạng thái thí sinh realtime
- [ ] **Enhanced UI/UX**: Cải thiện giao diện phản hồi
- [ ] **Performance Optimization**: Tối ưu hóa cho nhiều người dùng

## 🎯 Yêu cầu chức năng

### 1. Student Authentication for Socket ✅ HOÀN THÀNH
- [x] Thí sinh có thể connect vào socket với JWT token
- [x] Validate contestant tồn tại và đang tham gia match
- [x] Join room theo matchId của contestant

### 2. Realtime Answer Submission ✅ HOÀN THÀNH
- [x] Event `submitAnswer` từ student client
- [x] Validate câu trả lời (format, timing)
- [x] Lưu kết quả vào database với `isCorrect: boolean`
- [x] Broadcast kết quả đến các client khác

### 3. Instant Answer Validation & Feedback ✅ HOÀN THÀNH
- [x] Kiểm tra đáp án với question details ngay lập tức
- [x] Realtime feedback cho thí sinh (ĐÚNG/SAI)
- [x] Log chi tiết quá trình trả lời
- [x] Không tính điểm số - chỉ đúng/sai

### 4. Realtime Match Control ✅ HOÀN THÀNH
- [x] Bắt đầu trận đấu (`match:start`)
- [x] Chuyển câu hỏi realtime (`match:nextQuestion`)
- [x] Timer countdown tự động (`match:timerUpdated`)
- [x] Pause/Resume timer (`match:pauseTimer`, `match:resumeTimer`)
- [x] Kết thúc trận đấu (`match:end`)
- [x] Lấy trạng thái trận đấu (`match:getStatus`)

### 5. Auto Elimination System (Optional) 🔄 TÙY CHỌN
- [ ] Logic tự động loại thí sinh khi trả lời sai (nếu cần)
- [ ] Tự động cập nhật contestant status thành `eliminated`
- [ ] Thông báo realtime cho tất cả clients
- [ ] Xử lý trường hợp hết thời gian không trả lời

## 🏗️ Thiết kế Architecture

### Database Changes Needed:
```sql
-- Sử dụng các trường hiện có, KHÔNG CẦN thêm điểm số:
-- Result.isCorrect: true/false ✅ ĐÃ SỬ DỤNG (CORE REQUIREMENT)
-- Result.questionOrder: thứ tự câu hỏi ✅ ĐÃ SỬ DỤNG
-- Result.name: lưu câu trả lời của thí sinh ✅ ĐÃ SỬ DỤNG
-- Match.currentQuestion: câu hỏi hiện tại ✅ ĐÃ SỬ DỤNG
-- Match.remainingTime: thời gian còn lại ✅ ĐÃ SỬ DỤNG
-- Match.status: trạng thái trận đấu ✅ ĐÃ SỬ DỤNG
-- Contestant.status: sử dụng ContestantStatus enum (cho elimination - optional)
-- KHÔNG CẦN: Trường điểm số, ranking, leaderboard phức tạp
```

### Core Socket Events:
```typescript
// Client -> Server ✅ ĐÃ IMPLEMENT
'student:joinMatch' - Thí sinh join vào match ✅
'student:submitAnswer' - Nộp câu trả lời ✅
'student:getMatchStatus' - Lấy trạng thái match ✅
'student:getQuestion' - Lấy chi tiết câu hỏi ✅

// Admin/Judge -> Server ✅ ĐÃ IMPLEMENT
'match:start' - Bắt đầu trận đấu ✅
'match:nextQuestion' - Chuyển câu hỏi tiếp theo ✅
'match:pauseTimer' - Tạm dừng timer ✅
'match:resumeTimer' - Tiếp tục timer ✅
'match:end' - Kết thúc trận đấu ✅
'match:getStatus' - Lấy trạng thái trận đấu ✅

// Server -> Client ✅ ĐÃ IMPLEMENT
'student:joinedMatch' - Thông báo thí sinh đã join ✅
'match:answerSubmitted' - Kết quả trả lời (ĐÚNG/SAI) ✅
'match:started' - Trận đấu bắt đầu ✅
'match:questionChanged' - Câu hỏi được thay đổi ✅
'match:timerUpdated' - Cập nhật thời gian còn lại ✅
'match:timerWarning' - Cảnh báo thời gian sắp hết ✅
'match:timeUp' - Hết thời gian ✅
'match:timerPaused' - Timer bị tạm dừng ✅
'match:timerResumed' - Timer được tiếp tục ✅
'match:ended' - Trận đấu kết thúc ✅

// Optional Events (cho elimination)
'match:eliminationUpdate' - Cập nhật loại thí sinh (chưa có)
'match:contestantStatus' - Trạng thái thí sinh realtime (chưa có)
```

### Core Service Methods:
```typescript
// AnswerService (trong student.events.ts) ✅ ĐÃ CÓ
- validateAnswer(questionId, answer, type) ✅ ĐÃ CÓ TRONG EVENT
- processStudentAnswer(contestantId, matchId, questionOrder, answer) ✅ ĐÃ CÓ
- getAnswerResult(resultId) -> {isCorrect: boolean, answer: string} ✅

// TimerService (mới) ✅ ĐÃ CÓ
- startTimer(matchId, initialTime) ✅ ĐÃ CÓ
- stopTimer(matchId) ✅ ĐÃ CÓ
- pauseTimer(matchId) ✅ ĐÃ CÓ
- resumeTimer(matchId) ✅ ĐÃ CÓ
- getTimerStatus(matchId) ✅ ĐÃ CÓ

// MatchControlService (trong match.events.ts) ✅ ĐÃ CÓ
- startMatch(matchId) ✅ ĐÃ CÓ
- nextQuestion(matchId, questionOrder) ✅ ĐÃ CÓ
- endMatch(matchId) ✅ ĐÃ CÓ
- getMatchStatus(matchId) ✅ ĐÃ CÓ

// Optional Services
- eliminateContestant(contestantId, reason) (nếu cần elimination)
- updateContestantStatus(contestantId, status) (nếu cần elimination)
```

## 📝 Implementation Plan

### Phase 1: Core Realtime Answer System ✅ HOÀN THÀNH
- [x] Socket authentication cho students
- [x] Basic answer submission events
- [x] Instant answer validation (đúng/sai)
- [x] Realtime feedback cho thí sinh

### Phase 2: Enhanced Match Control ✅ HOÀN THÀNH
- [x] Realtime match start/end controls
- [x] Question navigation controls
- [x] Timer system với countdown
- [x] Pause/Resume timer functionality
- [x] Match status tracking

### Phase 3: Optional Auto Elimination 🔄 TÙY CHỌN
- [ ] Logic tự động loại thí sinh (nếu cần)
- [ ] Status updates realtime
- [ ] Notification system cho elimination
- [ ] Admin controls cho elimination rules

### Phase 4: Production Ready
- [ ] Load testing với nhiều thí sinh
- [ ] Security hardening
- [ ] Monitoring và analytics
- [ ] Documentation và deployment

## 🔧 Technical Implementation

### File Structure:
```
src/socket/
├── index.ts                          ✅ Updated - Socket initialization
├── SocketService.ts                  ✅ Existing - Singleton service
├── services/
│   └── timer.service.ts              ✅ NEW - Timer management
├── events/
│   ├── student.events.ts             ✅ Existing - Student answer events
│   ├── match.events.ts               ✅ NEW - Match control events
│   ├── question.events.ts            ✅ Existing - Question display
│   ├── screen.events.ts              ✅ Existing - Screen control
│   └── test.events.ts                ✅ Existing - Test events
└── namespaces/
    └── matchControl.namespace.ts     ✅ Existing - Match namespace
```

### Security Considerations:
- [x] Rate limiting cho answer submissions
- [x] Validate contestant có quyền trả lời câu hỏi hiện tại
- [x] Prevent replay attacks
- [x] Audit logging cho tất cả actions
- [x] Role-based access cho match controls

### Performance Focus:
- [x] Fast answer validation (< 100ms)
- [x] Instant feedback delivery
- [x] Efficient database queries (chỉ lưu isCorrect)
- [x] Optimized socket broadcasting
- [x] Timer service với minimal database updates

## 🧪 Testing Strategy

### Core Tests:
- [x] Answer submission flow
- [x] Đúng/sai validation accuracy
- [x] Realtime feedback delivery
- [x] Multiple students simultaneously
- [x] Match control flow
- [x] Timer accuracy

### Load Tests:
- [ ] 100+ students answering simultaneously
- [ ] Answer validation response time
- [ ] Socket connection stability
- [ ] Timer performance under load

## 📊 Monitoring

### Key Metrics:
- [ ] Answer submission response time (target: < 100ms)
- [ ] Validation accuracy (100% correct đúng/sai)
- [ ] Socket connection stability
- [ ] Student engagement (answers per minute)
- [ ] Timer accuracy (±1 second tolerance)

### Essential Logging:
- [x] All answer submissions với timestamps
- [x] Validation results (đúng/sai)
- [x] Match control actions
- [x] Timer events
- [x] Error tracking
- [x] Performance metrics

## 🚀 Deployment Plan

### Production Requirements:
- [ ] Socket.IO setup for production
- [ ] Database indexing cho fast queries
- [ ] Load balancer configuration
- [ ] Basic monitoring setup
- [ ] Timer service reliability

---

## 📋 Success Criteria

### Core Requirements:
- [x] Thí sinh có thể kết nối và trả lời câu hỏi realtime
- [x] Hệ thống phản hồi ngay lập tức ĐÚNG/SAI
- [x] Lưu trữ kết quả với `isCorrect: boolean`
- [x] Admin/Judge có thể điều khiển trận đấu realtime
- [x] Timer countdown chính xác cho từng câu hỏi
- [ ] Hiệu suất tốt với 100+ thí sinh đồng thời
- [x] Ghi log đầy đủ cho audit
- [x] Hệ thống ổn định và đáng tin cậy

### Optional Goals:
- [ ] Auto elimination cho thí sinh trả lời sai (nếu cần)
- [ ] Advanced admin controls
- [ ] Real-time status dashboard

---

## 📚 API Documentation cho Frontend

### 🔐 Authentication & Connection

#### 1. Student Login
```javascript
// POST /auth/login
const loginResponse = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: "khoa2",  // username hoặc email
    password: "Khoa12345"
  })
});

const data = await loginResponse.json();
// Response cho Student:
{
  "success": true,
  "message": "Đăng nhập thí sinh thành công",
  "data": {
    "role": "Student",
    "accessToken": "jwt-token-here",
    "contestantInfo": {
      "id": 123,
      "status": "active",
      "student": { "id": 456, "fullName": "Nguyễn Văn A", "studentCode": "SV001" },
      "contest": { "id": 1, "name": "Cuộc thi ABC", "status": "active" },
      "round": { "id": 1, "name": "Vòng 1" },
      "activeMatches": [
        { "id": 1, "name": "Trận 1", "status": "active", "currentQuestion": 1, "remainingTime": 60 }
      ]
    },
    "socketInfo": {
      "namespace": "/match-control",
      "instructions": "Use this token to connect to Socket.IO"
    }
  }
}
```

#### 2. Socket.IO Connection
```javascript
import { io } from "socket.io-client";

// Kết nối với JWT token từ cookie (tự động gửi)
const socket = io("/match-control", {
  withCredentials: true  // Quan trọng: gửi cookie
});

socket.on("connect", () => {
  console.log("✅ Connected to socket:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection failed:", error.message);
});
```

### 👨‍🎓 Student Events

#### 1. Join Match
```javascript
// Student tham gia vào một trận đấu
socket.emit("student:joinMatch", { matchId: 1 }, (response) => {
  if (response.success) {
    console.log("✅ Joined match:", response.matchId);
  } else {
    console.error("❌ Failed to join:", response.message);
  }
});

// Lắng nghe khi có student khác join
socket.on("student:joinedMatch", (data) => {
  console.log("👋 Student joined:", data.studentName);
  // { contestantId: 123, studentName: "Nguyễn Văn A", matchId: 1, timestamp: "2024-..." }
});
```

#### 2. Submit Answer
```javascript
// Nộp câu trả lời
socket.emit("student:submitAnswer", {
  matchId: 1,
  questionOrder: 1,
  answer: "A"  // hoặc câu trả lời text
}, (response) => {
  if (response.success) {
    console.log("✅ Answer submitted:", response.result.isCorrect ? "ĐÚNG" : "SAI");
    // response.result: { isCorrect: true, questionOrder: 1, submittedAt: "2024-..." }
  } else {
    console.error("❌ Submit failed:", response.message);
  }
});

// Lắng nghe kết quả trả lời của các student khác
socket.on("match:answerSubmitted", (data) => {
  console.log(`📝 ${data.studentName} answered question ${data.questionOrder}: ${data.isCorrect ? "ĐÚNG" : "SAI"}`);
  // { contestantId: 123, studentName: "...", questionOrder: 1, isCorrect: true, submittedAt: "...", matchId: 1 }
});
```

#### 3. Get Question Details
```javascript
// Lấy chi tiết câu hỏi
socket.emit("student:getQuestion", {
  matchId: 1,
  questionOrder: 1
}, (response) => {
  if (response.success) {
    const { contest, match, question, studentStatus } = response.data;
    console.log("📋 Question:", question.content);
    console.log("⏰ Time remaining:", match.remainingTime);
    console.log("✅ Already answered:", studentStatus.hasAnswered);
  }
});
```

#### 4. Get Match Status
```javascript
// Lấy trạng thái trận đấu hiện tại
socket.emit("student:getMatchStatus", (response) => {
  if (response.success) {
    const { matchId, currentQuestion, remainingTime, results } = response.data;
    console.log(`📊 Match ${matchId} - Question ${currentQuestion} - Time: ${remainingTime}s`);
    console.log("📈 My results:", results);
  }
});
```

### 👨‍💼 Admin/Judge Events

#### 1. Start Match
```javascript
// Bắt đầu trận đấu (chỉ Admin/Judge)
socket.emit("match:start", { matchId: 1 }, (response) => {
  if (response.success) {
    console.log("🚀 Match started successfully");
  }
});

// Lắng nghe khi trận đấu bắt đầu
socket.on("match:started", (data) => {
  console.log(`🚀 Match "${data.matchName}" started by ${data.startedBy}`);
  // { matchId: 1, matchName: "Trận 1", contestName: "Cuộc thi ABC", status: "active", startedBy: "admin", startedAt: "..." }
});
```

#### 2. Change Question
```javascript
// Chuyển sang câu hỏi tiếp theo
socket.emit("match:nextQuestion", {
  matchId: 1,
  questionOrder: 2
}, (response) => {
  if (response.success) {
    console.log(`➡️ Moved to question ${response.data.questionOrder}`);
  }
});

// Lắng nghe khi câu hỏi thay đổi
socket.on("match:questionChanged", (data) => {
  console.log(`📝 Question ${data.questionOrder} - Time: ${data.remainingTime}s`);
  console.log("📋 Question:", data.question.content);
  // { matchId: 1, questionOrder: 2, remainingTime: 60, question: {...}, changedBy: "admin", changedAt: "..." }
});
```

#### 3. Timer Controls
```javascript
// Tạm dừng timer
socket.emit("match:pauseTimer", { matchId: 1 }, (response) => {
  console.log("⏸️ Timer paused");
});

// Tiếp tục timer
socket.emit("match:resumeTimer", { matchId: 1 }, (response) => {
  console.log("▶️ Timer resumed");
});

// Lắng nghe timer events
socket.on("match:timerPaused", (data) => {
  console.log(`⏸️ Timer paused by ${data.pausedBy}`);
});

socket.on("match:timerResumed", (data) => {
  console.log(`▶️ Timer resumed by ${data.resumedBy}`);
});
```

#### 4. End Match
```javascript
// Kết thúc trận đấu
socket.emit("match:end", { matchId: 1 }, (response) => {
  if (response.success) {
    console.log("🏁 Match ended:", response.data.summary);
  }
});

// Lắng nghe khi trận đấu kết thúc
socket.on("match:ended", (data) => {
  console.log(`🏁 Match ended by ${data.endedBy}`);
  console.log("📊 Summary:", data.summary);
  // { matchId: 1, status: "completed", endedBy: "admin", summary: { totalQuestions: 10, totalContestants: 5, contestantStats: [...] } }
});
```

### ⏰ Timer Events (All Users)

```javascript
// Cập nhật thời gian mỗi giây
socket.on("match:timerUpdated", (data) => {
  console.log(`⏰ Time remaining: ${data.remainingTime}s`);
  // Update UI countdown
  updateTimerDisplay(data.remainingTime);
});

// Cảnh báo thời gian sắp hết
socket.on("match:timerWarning", (data) => {
  console.warn(`⚠️ Warning: ${data.message}`);
  // Show warning UI: "⚠️ 30 giây còn lại!"
  showTimerWarning(data.remainingTime);
});

// Hết thời gian
socket.on("match:timeUp", (data) => {
  console.log("⏰ Time's up!");
  // Disable answer submission, show timeout message
  disableAnswerInput();
  showTimeUpMessage();
});
```

### 📊 Complete Frontend Example

```javascript
class MatchController {
  constructor() {
    this.socket = null;
    this.currentMatch = null;
    this.isStudent = false;
  }

  async login(identifier, password) {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    
    const data = await response.json();
    if (data.success) {
      this.isStudent = data.data.role === "Student";
      if (this.isStudent) {
        this.contestantInfo = data.data.contestantInfo;
      }
      this.connectSocket();
    }
    return data;
  }

  connectSocket() {
    this.socket = io("/match-control", { withCredentials: true });
    
    this.socket.on("connect", () => {
      console.log("✅ Connected to socket");
      if (this.isStudent && this.contestantInfo.activeMatches.length > 0) {
        this.joinMatch(this.contestantInfo.activeMatches[0].id);
      }
    });

    // Student events
    if (this.isStudent) {
      this.socket.on("match:questionChanged", (data) => {
        this.displayQuestion(data);
        this.startTimerDisplay(data.remainingTime);
      });

      this.socket.on("match:timerUpdated", (data) => {
        this.updateTimer(data.remainingTime);
      });

      this.socket.on("match:timeUp", () => {
        this.disableAnswerInput();
        this.showMessage("⏰ Hết thời gian!");
      });
    }

    // Admin events
    if (["Admin", "Judge"].includes(this.userRole)) {
      this.socket.on("match:started", (data) => {
        this.showMessage(`🚀 Trận đấu bắt đầu: ${data.matchName}`);
      });
    }
  }

  joinMatch(matchId) {
    this.socket.emit("student:joinMatch", { matchId }, (response) => {
      if (response.success) {
        this.currentMatch = matchId;
        this.loadCurrentQuestion();
      }
    });
  }

  submitAnswer(answer) {
    if (!this.currentMatch) return;
    
    this.socket.emit("student:submitAnswer", {
      matchId: this.currentMatch,
      questionOrder: this.currentQuestionOrder,
      answer: answer
    }, (response) => {
      if (response.success) {
        const isCorrect = response.result.isCorrect;
        this.showAnswerResult(isCorrect);
        this.disableAnswerInput();
      }
    });
  }

  // Admin functions
  startMatch(matchId) {
    this.socket.emit("match:start", { matchId });
  }

  nextQuestion(matchId, questionOrder) {
    this.socket.emit("match:nextQuestion", { matchId, questionOrder });
  }

  pauseTimer(matchId) {
    this.socket.emit("match:pauseTimer", { matchId });
  }
}

// Usage
const matchController = new MatchController();
await matchController.login("khoa2", "Khoa12345");
```

---
*Plan cập nhật: Realtime Answer System với Match Control*
*Đã hoàn thành: Authentication, Answer Submission, Match Control, Timer System*
*Ước tính thời gian hoàn thành: 2 tuần*
*Người tạo: Development Team* 

## 📊 Tình Trạng Triển Khai (Implementation Status)

### ✅ HOÀN THÀNH (Completed):
1. **Authentication System**
   - ✅ Student/Admin login với JWT
   - ✅ Socket.IO authentication middleware
   - ✅ Auto-detect user role và permissions

2. **Real-time Match Control**
   - ✅ Admin có thể start/pause/resume/end matches
   - ✅ Change questions với timer reset
   - ✅ Broadcasting events to all participants
   - ✅ Match room management

3. **Student Answer System**
   - ✅ Real-time answer submission
   - ✅ Immediate feedback (ĐÚNG/SAI)
   - ✅ Answer validation và duplicate prevention
   - ✅ Auto-save answers to database

4. **Timer System**
   - ✅ Real-time countdown per question
   - ✅ Timer pause/resume functionality
   - ✅ Auto time-up notifications
   - ✅ Warning alerts (30s, 10s remaining)

5. **Frontend Components**
   - ✅ StudentWaitingRoom với real-time updates
   - ✅ QuestionAnswer component với options display
   - ✅ Admin ControlsOnline dashboard
   - ✅ CurrentQuestion display với HTML content
   - ✅ Timer display và status indicators

6. **Socket Events Infrastructure**
   - ✅ All essential events implemented
   - ✅ Error handling và logging
   - ✅ Room-based broadcasting
   - ✅ Event acknowledgments

### 🔄 ĐANG TRIỂN KHAI (In Progress):
1. **Auto-Elimination System** 🚧
   - ⚠️ Enum đã có: `ContestantStatus.Eliminate`
   - ⚠️ Database schema support: `ContestantMatchStatus.Eliminated`
   - ❌ **THIẾU**: Logic xử lý loại thí sinh khi trả lời sai
   - ❌ **THIẾU**: Broadcast elimination events
   - ❌ **THIẾU**: Frontend UI for eliminated contestants
   - ❌ **THIẾU**: Match progression logic

2. **Performance Optimization**
   - ⚠️ Current: Tested với ~10 students
   - ❌ **CẦN**: Load testing với 100+ students
   - ❌ **CẦN**: Database query optimization
   - ❌ **CẦN**: Socket connection pooling

### ❌ CHƯA TRIỂN KHAI (TODO - Phase 3):

#### 1. **Auto-Elimination Logic** (HIGH PRIORITY)
```javascript
// CẦN THÊM VÀO: Contests-BE/src/socket/events/student.events.ts
async function handleStudentSubmitAnswer(socket, data, callback) {
  // ... existing validation code ...
  
  if (!isCorrect) {
    // 🚧 TODO: Implement elimination logic
    await eliminateContestant(contestantId, matchId, {
      reason: "Wrong answer",
      questionOrder: data.questionOrder,
      submittedAnswer: data.answer,
      correctAnswer: question.correctAnswer
    });
    
    // Broadcast elimination event
    socket.to(`match:${matchId}`).emit("contestant:eliminated", {
      contestantId,
      studentName: contestant.student.fullName,
      questionOrder: data.questionOrder,
      eliminatedAt: new Date(),
      remainingContestants: await getRemainingContestants(matchId)
    });
  }
}

async function eliminateContestant(contestantId, matchId, eliminationData) {
  // Update contestant status
  await updateContestantMatchStatus(contestantId, matchId, "Eliminated");
  
  // Log elimination
  await logEliminationEvent(contestantId, matchId, eliminationData);
  
  // Check if match should end (only 1 contestant left)
  const remaining = await getRemainingContestants(matchId);
  if (remaining.length <= 1) {
    await endMatchAutomatically(matchId, "elimination_complete");
  }
}
```

#### 2. **Frontend Elimination UI**
```javascript
// CẦN THÊM VÀO: QuestionAnswer component
socket.on("contestant:eliminated", (data) => {
  if (data.contestantId === myContestantId) {
    // Show elimination screen
    showEliminationScreen({
      message: "Bạn đã bị loại khỏi cuộc thi",
      questionNumber: data.questionOrder,
      wrongAnswer: data.submittedAnswer,
      correctAnswer: data.correctAnswer
    });
  } else {
    // Show notification
    showNotification(`${data.studentName} đã bị loại`);
  }
});
```

#### 3. **Admin Elimination Dashboard**
```javascript
// CẦN THÊM: Admin view for elimination status
const EliminationTracker = () => {
  const [eliminatedContestants, setEliminatedContestants] = useState([]);
  const [remainingContestants, setRemainingContestants] = useState([]);
  
  return (
    <div className="elimination-tracker">
      <div className="remaining-count">
        Còn lại: {remainingContestants.length} thí sinh
      </div>
      <div className="elimination-log">
        {eliminatedContestants.map(contestant => (
          <div key={contestant.id} className="eliminated-item">
            {contestant.name} - Câu {contestant.eliminatedAtQuestion}
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 4. **Match Progression Logic**
```javascript
// CẦN THÊM: Logic for automatic match progression
async function checkMatchProgression(matchId) {
  const remaining = await getRemainingContestants(matchId);
  
  if (remaining.length === 1) {
    // Winner found
    await declareWinner(matchId, remaining[0]);
    await endMatch(matchId, "winner_decided");
  } else if (remaining.length === 0) {
    // No survivors
    await endMatch(matchId, "all_eliminated");
  }
}
```

### 🎯 CẦN TRIỂN KHAI NGAY (Immediate TODO):

1. **Implement `eliminateContestant()` function**
2. **Add elimination events to socket handlers**
3. **Create elimination UI components**
4. **Add elimination status to admin dashboard**
5. **Test elimination logic với multiple students**
6. **Add elimination audit logs**

### 📊 Database Schema Support:
```sql
-- ✅ SẴN CÓ:
enum ContestantStatus { Compete, Eliminate, Advanced }
enum ContestantMatchStatus { 
  NotStarted, InProgress, Confirmed1, Confirmed2, 
  Eliminated, Rescued, Banned, Completed 
}

-- ❌ CẦN THÊM:
table EliminationLogs {
  id: int
  contestantId: int  
  matchId: int
  questionOrder: int
  eliminatedAt: datetime
  reason: string
  eliminationData: json
}
``` 