# Enum API Documentation

## Overview
The Enum API provides endpoints to retrieve enumeration values defined in the application constants. This API is essential for frontend applications to dynamically populate dropdowns, select boxes, and other UI components with consistent data.

## Base URL
```
/api/enums
```

## Authentication
All enum endpoints are **public** and do not require authentication.

## Available Enums

The following enums are available in the system:

### 1. Role
User roles in the system
- `Admin` - Quản trị viên
- `Judge` - Giám khảo

### 2. QuestionType
Types of questions
- `multiple_choice` - Trắc nghiệm
- `essay` - Tự luận

### 3. Difficulty
Question difficulty levels
- `Alpha` - Alpha
- `Beta` - Beta  
- `Rc` - Rc
- `Gold` - Gold

### 4. ContestStatus
Contest status values
- `upcoming` - Sắp diễn ra
- `ongoing` - Đang diễn ra
- `finished` - Đã kết thúc

### 5. ContestantStatus
Contestant status in competition
- `compete` - Thi đấu
- `eliminate` - Bị loại
- `advanced` - Tiến tiếp

### 6. ContestantMatchStatus
Detailed match status for contestants
- `not_started` - Chưa bắt đầu
- `in_progress` - Đang tiến hành
- `confirmed1` - Xác nhận 1
- `confirmed2` - Xác nhận 2
- `eliminated` - Bị loại
- `rescued` - Được cứu
- `banned` - Bị cấm
- `completed` - Hoàn thành

### 7. RescueType
Types of rescue mechanisms
- `resurrected` - Hồi sinh
- `lifelineUsed` - Sử dụng cứu hộ

### 8. RescueStatus
Status of rescue usage
- `notUsed` - Chưa sử dụng
- `used` - Đã sử dụng
- `passed` - Đã qua

### 9. AwardType
Award categories
- `firstPrize` - Giải nhất
- `secondPrize` - Giải nhì
- `thirdPrize` - Giải ba
- `fourthPrize` - Giải tư
- `impressiveVideo` - Video ấn tượng
- `excellentVideo` - Video xuất sắc

### 10. ControlKey
Control keys for UI management
- `background` - Nền
- `question` - Câu hỏi
- `questionInfo` - Thông tin câu hỏi
- `answer` - Đáp án
- `matchDiagram` - Sơ đồ trận đấu
- `explanation` - Giải thích
- And more...

### 11. ControlValue
Control actions
- `start` - Bắt đầu
- `pause` - Tạm dừng
- `reset` - Đặt lại
- `zoomIn` - Phóng to
- `zoomOut` - Thu nhỏ

## API Endpoints

### Get All Enums
```http
GET /api/enums
```

Returns all available enums with their values and options.

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách enum thành công",
  "data": {
    "Role": {
      "name": "Role",
      "values": {
        "Admin": "Admin",
        "Judge": "Judge"
      },
      "options": [
        {
          "label": "Quản trị viên",
          "value": "Admin"
        },
        {
          "label": "Giám khảo", 
          "value": "Judge"
        }
      ]
    },
    "QuestionType": {
      "name": "QuestionType",
      "values": {
        "MultipleChoice": "multiple_choice",
        "Essay": "essay"
      },
      "options": [
        {
          "label": "Trắc nghiệm",
          "value": "multiple_choice"
        },
        {
          "label": "Tự luận",
          "value": "essay"
        }
      ]
    }
  },
  "timestamp": "2025-06-12T08:30:00.000Z"
}
```

### Get Enum Names
```http
GET /api/enums/names
```

Returns a list of all available enum names.

**Response:**
```json
{
  "success": true,
  "message": "Lấy danh sách tên enum thành công",
  "data": [
    "Role",
    "QuestionType", 
    "Difficulty",
    "ContestStatus",
    "ContestantStatus",
    "ContestantMatchStatus",
    "RescueType",
    "RescueStatus",
    "AwardType",
    "ControlKey",
    "ControlValue"
  ],
  "timestamp": "2025-06-12T08:30:00.000Z"
}
```

### Get Specific Enum
```http
GET /api/enums/:enumName
```

Returns a specific enum with its values and options.

**Parameters:**
- `enumName` (string, required) - The name of the enum

**Example:**
```http
GET /api/enums/QuestionType
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy enum QuestionType thành công",
  "data": {
    "name": "QuestionType",
    "values": {
      "MultipleChoice": "multiple_choice",
      "Essay": "essay"
    },
    "options": [
      {
        "label": "Trắc nghiệm",
        "value": "multiple_choice"
      },
      {
        "label": "Tự luận",
        "value": "essay"
      }
    ]
  },
  "timestamp": "2025-06-12T08:30:00.000Z"
}
```

### Get Enum Values
```http
GET /api/enums/:enumName/values
```

Returns enum values as an array.

**Example:**
```http
GET /api/enums/QuestionType/values
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy giá trị enum QuestionType thành công",
  "data": [
    "multiple_choice",
    "essay"
  ],
  "timestamp": "2025-06-12T08:30:00.000Z"
}
```

### Get Enum Options
```http
GET /api/enums/:enumName/options
```

Returns enum options formatted for dropdowns and select components.

**Example:**
```http
GET /api/enums/QuestionType/options
```

**Response:**
```json
{
  "success": true,
  "message": "Lấy tùy chọn enum QuestionType thành công",
  "data": [
    {
      "label": "Trắc nghiệm",
      "value": "multiple_choice"
    },
    {
      "label": "Tự luận",
      "value": "essay"
    }
  ],
  "timestamp": "2025-06-12T08:30:00.000Z"
}
```

## Error Responses

### Enum Not Found
```json
{
  "success": false,
  "message": "Không tìm thấy enum",
  "error": {
    "code": "RECORD_NOT_FOUND"
  },
  "timestamp": "2025-06-12T08:30:00.000Z"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Lỗi server khi lấy enum",
  "error": {
    "code": "INTERNAL_SERVER_ERROR"
  },
  "timestamp": "2025-06-12T08:30:00.000Z"
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `404 Not Found` - Enum not found
- `500 Internal Server Error` - Server error

## Usage Examples

### JavaScript/Frontend Integration

```javascript
// Get all enums for initialization
const getAllEnums = async () => {
  try {
    const response = await fetch('/api/enums');
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching enums:', error);
  }
};

// Get specific enum for dropdown
const getQuestionTypeOptions = async () => {
  try {
    const response = await fetch('/api/enums/QuestionType/options');
    const data = await response.json();
    return data.data; // Array of {label, value} objects
  } catch (error) {
    console.error('Error fetching question type options:', error);
  }
};

// Example usage in React component
const QuestionTypeSelect = () => {
  const [options, setOptions] = useState([]);
  
  useEffect(() => {
    getQuestionTypeOptions().then(setOptions);
  }, []);
  
  return (
    <select>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
```

### PowerShell Testing

```powershell
# Test all enums endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/enums" -Method GET

# Test specific enum
Invoke-RestMethod -Uri "http://localhost:3000/api/enums/QuestionType" -Method GET

# Test enum options
Invoke-RestMethod -Uri "http://localhost:3000/api/enums/QuestionType/options" -Method GET
```

## Benefits

1. **Centralized Enum Management** - All enums defined in one place
2. **Frontend Integration** - Easy integration with UI components
3. **Internationalization** - Vietnamese labels for better UX
4. **Type Safety** - Consistent enum values across frontend and backend
5. **Dynamic Updates** - Frontend automatically gets latest enum values
6. **Multiple Formats** - Raw values, labeled options, or complete enum data

## Notes

- All endpoints are public and don't require authentication
- Enum names are case-sensitive
- Labels are provided in Vietnamese for better user experience
- Options format is optimized for dropdown/select components
- All responses follow the standard API response format
