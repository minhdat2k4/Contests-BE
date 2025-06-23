# 🧪 Hướng dẫn Test API - Contest System

## 📋 Mục lục
- [Chuẩn bị](#chuẩn-bị)
- [Authentication APIs](#authentication-apis)
- [Student Answer APIs](#student-answer-apis)
- [Match Control APIs](#match-control-apis)
- [Socket Events Testing](#socket-events-testing)
- [Database Verification](#database-verification)
- [Troubleshooting](#troubleshooting)

---

## 🛠️ Chuẩn bị

### Environment
- Backend server: `http://localhost:3000`
- Database: PostgreSQL
- Tool: Postman hoặc Thunder Client

### Import Postman Collection
```json
{
  "info": {
    "name": "Contest System API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "type": "string"
    },
    {
      "key": "access_token",
      "value": "",
      "type": "string"
    }
  ]
}
```

---

## 🔐 Authentication APIs

### 1. Student Login
**Endpoint:** `POST {{base_url}}/api/auth/student/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "identifier": "student01",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "role": "Student",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "contestantInfo": {
      "id": 1,
      "status": "compete",
      "student": {
        "id": 1,
        "fullName": "Nguyễn Văn A",
        "studentCode": "SV001"
      },
      "contest": {
        "id": 1,
        "name": "Cuộc thi ABC",
        "slug": "cuoc-thi-abc",
        "status": "active"
      },
      "round": {
        "id": 1,
        "name": "Vòng loại"
      },
      "activeMatches": [
        {
          "id": 26,
          "name": "Trận đấu 1",
          "status": "ongoing",
          "currentQuestion": 1,
          "remainingTime": 60
        }
      ]
    },
    "socketInfo": {
      "namespace": "/student",
      "instructions": "Kết nối tới namespace /student"
    }
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

**Action:** Copy `accessToken` và set vào variable `access_token` trong Postman

---

## 📝 Student Answer APIs

### 2. Submit Answer (Main API)
**Endpoint:** `POST {{base_url}}/api/student/answer`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Test Case 1: Đáp án đúng**
```json
{
  "matchId": 26,
  "questionOrder": 1,
  "answer": "A",
  "submittedAt": "2024-01-15T10:30:00.000Z"
}
```

**Expected Response (Correct Answer):**
```json
{
  "success": true,
  "message": "Đáp án đã được ghi nhận thành công",
  "result": {
    "isCorrect": true,
    "questionOrder": 1,
    "submittedAt": "2024-01-15T10:30:00.000Z",
    "correctAnswer": "A",
    "explanation": "Đây là câu trả lời đúng vì...",
    "score": 10,
    "eliminated": false
  }
}
```

**Test Case 2: Đáp án sai (với elimination)**
```json
{
  "matchId": 26,
  "questionOrder": 1,
  "answer": "C",
  "submittedAt": "2024-01-15T10:30:00.000Z"
}
```

**Expected Response (Wrong Answer with Elimination):**
```json
{
  "success": true,
  "message": "Đáp án đã được ghi nhận thành công",
  "result": {
    "isCorrect": false,
    "questionOrder": 1,
    "submittedAt": "2024-01-15T10:30:00.000Z",
    "correctAnswer": "A",
    "explanation": "Câu trả lời đúng là A vì...",
    "score": 0,
    "eliminated": true
  }
}
```

**Test Case 3: Error Cases**

*Match không tồn tại:*
```json
{
  "matchId": 999,
  "questionOrder": 1,
  "answer": "A",
  "submittedAt": "2024-01-15T10:30:00.000Z"
}
```

*Expected Error Response:*
```json
{
  "success": false,
  "message": "Match not found"
}
```

*Thiếu dữ liệu bắt buộc:*
```json
{
  "matchId": 26,
  "answer": "A"
}
```

*Expected Validation Error:*
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "questionOrder",
      "message": "Question order is required"
    }
  ]
}
```

---

## 🎮 Match Control APIs

### 3. Start Match
**Endpoint:** `POST {{base_url}}/api/match/start`

**Headers:**
```
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "matchId": 26
}
```

### 4. Next Question
**Endpoint:** `POST {{base_url}}/api/match/next-question`

**Headers:**
```
Authorization: Bearer {{admin_access_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "matchId": 26
}
```

### 5. Get Match Status
**Endpoint:** `GET {{base_url}}/api/match/status?matchId=26`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "match": {
      "id": 26,
      "name": "Trận đấu 1",
      "status": "ongoing",
      "currentQuestion": 1,
      "remainingTime": 45,
      "contestName": "Cuộc thi ABC",
      "questionPackageName": "Gói câu hỏi toán học"
    },
    "currentQuestion": {
      "order": 1,
      "question": {
        "id": 1,
        "content": "2 + 2 = ?",
        "questionType": "multiple_choice",
        "difficulty": "alpha",
        "score": 10,
        "defaultTime": 60,
        "options": ["2", "3", "4", "5"]
      }
    },
    "statistics": {
      "totalQuestions": 10,
      "connectedStudents": 5
    }
  }
}
```

---

## 🔌 Socket Events Testing

### Setup Socket Connection
```javascript
// Trong browser console hoặc Node.js script
const io = require('socket.io-client');

const socket = io('http://localhost:3000/student', {
  auth: {
    token: 'YOUR_ACCESS_TOKEN'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to /student namespace');
  console.log('Socket ID:', socket.id);
});

// Join match room
socket.emit('joinMatchRoom', 26, (response) => {
  console.log('Join room response:', response);
});
```

### Events to Monitor
```javascript
// Listen for question changes
socket.on('match:questionChanged', (data) => {
  console.log('📝 Question changed:', data);
});

// Listen for timer updates
socket.on('match:timerUpdated', (data) => {
  console.log('⏱️ Timer updated:', data);
});

// Listen for answer submissions
socket.on('student:answerSubmitted', (data) => {
  console.log('📤 Answer submitted:', data);
});

// Listen for eliminations
socket.on('contestant:eliminated', (data) => {
  console.log('🚫 Contestant eliminated:', data);
});

// Listen for match end
socket.on('match:ended', (data) => {
  console.log('🏁 Match ended:', data);
});
```

---

## 🗃️ Database Verification

### Kiểm tra kết quả submit
```sql
-- Xem kết quả mới nhất
SELECT 
  r.*,
  c.id as contestant_id,
  s.fullName as student_name,
  s.studentCode as student_code,
  m.name as match_name
FROM Result r
JOIN Contestant c ON r.contestantId = c.id
JOIN Student s ON c.studentId = s.id
JOIN Match m ON r.matchId = m.id
WHERE r.matchId = 26
ORDER BY r.createdAt DESC
LIMIT 10;
```

### Kiểm tra trạng thái contestant
```sql
-- Xem trạng thái thí sinh
SELECT 
  c.*,
  s.fullName,
  s.studentCode,
  co.name as contest_name
FROM Contestant c
JOIN Student s ON c.studentId = s.id
JOIN Contest co ON c.contestId = co.id
WHERE c.id = 1;
```

### Kiểm tra match state
```sql
-- Xem trạng thái trận đấu
SELECT 
  m.*,
  r.name as round_name,
  c.name as contest_name,
  qp.name as question_package_name
FROM Match m
JOIN Round r ON m.roundId = r.id
JOIN Contest c ON r.contestId = c.id
JOIN QuestionPackage qp ON m.questionPackageId = qp.id
WHERE m.id = 26;
```

### Thống kê trận đấu
```sql
-- Thống kê theo trận đấu
SELECT 
  m.name as match_name,
  COUNT(DISTINCT r.contestantId) as total_participants,
  COUNT(r.id) as total_answers,
  SUM(CASE WHEN r.isCorrect THEN 1 ELSE 0 END) as correct_answers,
  ROUND(
    (SUM(CASE WHEN r.isCorrect THEN 1 ELSE 0 END) * 100.0) / COUNT(r.id), 
    2
  ) as accuracy_percentage
FROM Match m
LEFT JOIN Result r ON m.id = r.matchId
WHERE m.id = 26
GROUP BY m.id, m.name;
```

---

## 🔧 Troubleshooting

### Common Issues

**1. Authentication Error**
```
Error: 401 Unauthorized
```
*Solution:* Kiểm tra access_token có đúng và chưa hết hạn không

**2. Match Not Found**
```
Error: Match not found
```
*Solution:* Kiểm tra matchId có tồn tại trong database không

**3. Socket Connection Failed**
```
Error: Socket connection failed
```
*Solution:* 
- Kiểm tra server có chạy không
- Kiểm tra CORS settings
- Kiểm tra authentication token

**4. Validation Errors**
```
Error: Validation failed
```
*Solution:* Kiểm tra format của request body theo schema

### Debug Commands

**Check server logs:**
```bash
# Backend logs
cd Contests-BE
npm run dev

# Check specific logs
tail -f logs/app.log | grep "student:answer"
```

**Check database connection:**
```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d contest_db

# Check tables
\dt
```

**Reset test data:**
```sql
-- Reset results for testing
DELETE FROM Result WHERE matchId = 26;

-- Reset contestant status
UPDATE Contestant SET status = 'compete', eliminatedAt = NULL WHERE id = 1;

-- Reset match state
UPDATE Match SET currentQuestion = 0, remainingTime = 0, status = 'upcoming' WHERE id = 26;
```

---

## 📊 Performance Testing

### Load Testing with multiple requests
```javascript
// Script to test multiple submissions
const submitAnswers = async () => {
  const promises = [];
  
  for (let i = 1; i <= 10; i++) {
    promises.push(
      fetch('http://localhost:3000/api/student/answer', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          matchId: 26,
          questionOrder: i,
          answer: 'A',
          submittedAt: new Date().toISOString()
        })
      })
    );
  }
  
  const results = await Promise.all(promises);
  console.log('All submissions completed:', results.length);
};
```

---

## 📝 Test Checklist

### Basic Functionality
- [ ] Student login successful
- [ ] Submit correct answer
- [ ] Submit wrong answer
- [ ] Receive elimination when wrong
- [ ] Socket events working
- [ ] Database records created

### Edge Cases
- [ ] Submit answer twice for same question
- [ ] Submit answer for non-existent match
- [ ] Submit answer for non-existent question
- [ ] Submit answer when match not started
- [ ] Submit answer when time is up

### Performance
- [ ] Multiple simultaneous submissions
- [ ] Large number of students in same match
- [ ] Network latency simulation
- [ ] Database connection pool limits

---

*Created: 2024-01-15*  
*Last Updated: 2024-01-15*  
*Version: 1.0* 