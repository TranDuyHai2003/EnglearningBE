# Dashboard APIs Implementation Summary

## Student Dashboard APIs

### 1. GET /api/learning/resumecourse
Returns the most recently accessed course for the logged-in student.

**Authentication:** Required (student role)

**Response:**
```json
{
  "success": true,
  "data": {
    "enrollment": {
      "enrollment_id": 1,
      "course": { ... },
      "completion_percentage": 45.5,
      "lessonProgress": [ ... ]
    },
    "last_accessed_at": "2025-01-15T10:30:00Z"
  }
}
```

### 2. GET /api/learning/my-stats
Returns overall statistics for the student.

**Authentication:** Required (student role)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_courses_enrolled": 5,
    "total_courses_completed": 2,
    "total_hours_learned": 12.5,
    "total_minutes_learned": 750,
    "total_spent": 299.99,
    "average_progress": "45.50",
    "certificates_earned": 2
  }
}
```

### 3. GET /api/learning/my-activity-feed
Returns recent activities (lessons completed, quizzes submitted, courses enrolled).

**Authentication:** Required (student role)

**Query Parameters:**
- `limit` (optional, default: 10) - Number of activities to return

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "lesson_completed",
      "title": "Completed lesson: Introduction to React",
      "course_id": 1,
      "course_title": "React Fundamentals",
      "lesson_id": 5,
      "timestamp": "2025-01-15T10:30:00Z"
    },
    {
      "type": "quiz_submitted",
      "title": "Scored 85% on quiz: Chapter 1 Quiz",
      "course_id": 1,
      "course_title": "React Fundamentals",
      "quiz_id": 3,
      "score": 85,
      "passed": true,
      "timestamp": "2025-01-14T15:20:00Z"
    }
  ]
}
```

---

## Instructor Dashboard APIs

### 1. GET /api/instructors/dashboard/summary
Returns comprehensive dashboard statistics for the instructor.

**Authentication:** Required (instructor role)

**Response:**
```json
{
  "success": true,
  "data": {
    "total_students": 150,
    "total_revenue": 15000.00,
    "average_rating": 4.5,
    "pending_questions_count": 3,
    "total_courses": 5,
    "total_enrollments": 150,
    "revenue_over_time": [
      { "month": "2024-12", "revenue": 5000 },
      { "month": "2025-01", "revenue": 7000 }
    ],
    "enrollments_over_time": [
      { "month": "2024-12", "enrollments": 50 },
      { "month": "2025-01", "enrollments": 60 }
    ]
  }
}
```

### 2. GET /api/instructors/dashboard/action-items
Returns pending questions and recent reviews for the instructor's courses.

**Authentication:** Required (instructor role)

**Response:**
```json
{
  "success": true,
  "data": {
    "pending_questions": [
      {
        "discussion_id": 1,
        "course": { "course_id": 1, "title": "React Fundamentals" },
        "user": { "user_id": 10, "full_name": "John Doe", "avatar_url": "..." },
        "question_text": "How do I use useState?",
        "created_at": "2025-01-15T10:00:00Z"
      }
    ],
    "recent_reviews": [
      {
        "review_id": 1,
        "course": { "course_id": 1, "title": "React Fundamentals" },
        "student": { "user_id": 10, "full_name": "Jane Doe", "avatar_url": "..." },
        "rating": 5,
        "comment": "Great course!",
        "created_at": "2025-01-14T15:00:00Z"
      }
    ]
  }
}
```

---

## Admin Dashboard APIs

### 1. GET /api/admin/action-items
Returns pending courses and instructor profiles awaiting approval.

**Authentication:** Required (support_admin or system_admin role)

**Response:**
```json
{
  "success": true,
  "data": {
    "pending_courses": [
      {
        "course_id": 10,
        "title": "Advanced Node.js",
        "instructor": {
          "user_id": 5,
          "full_name": "John Instructor",
          "email": "john@example.com",
          "avatar_url": "..."
        },
        "created_at": "2025-01-15T10:00:00Z"
      }
    ],
    "pending_instructors": [
      {
        "profile_id": 3,
        "user": {
          "user_id": 8,
          "full_name": "Jane Applicant",
          "email": "jane@example.com",
          "avatar_url": "..."
        },
        "bio": "...",
        "education": "...",
        "created_at": "2025-01-14T09:00:00Z"
      }
    ]
  }
}
```

### 2. GET /api/admin/metrics/timeseries
Returns time-series data for system-wide metrics.

**Authentication:** Required (support_admin or system_admin role)

**Query Parameters:**
- `metric` (optional, default: "revenue") - Options: revenue, users, enrollments, courses, transactions
- `period` (optional, default: "month") - Options: day, week, month

**Response:**
```json
{
  "success": true,
  "data": {
    "metric": "revenue",
    "period": "month",
    "timeseries": [
      { "period": "2024-11", "value": 10000 },
      { "period": "2024-12", "value": 15000 },
      { "period": "2025-01", "value": 20000 }
    ]
  }
}
```

**Example Requests:**
```bash
# Get monthly revenue for last 12 months
GET /api/admin/metrics/timeseries?metric=revenue&period=month

# Get daily user registrations for last 30 days
GET /api/admin/metrics/timeseries?metric=users&period=day

# Get weekly enrollments for last 12 weeks
GET /api/admin/metrics/timeseries?metric=enrollments&period=week
```

---

## Implementation Details

### Files Modified:

**Controllers:**
- `src/controllers/learningController.js` - Added student dashboard functions
- `src/controllers/instructorController.js` - Added instructor dashboard functions
- `src/controllers/adminController.js` - Added admin dashboard functions

**Routes:**
- `src/routes/learning.js` - Added student dashboard routes
- `src/routes/instructors.js` - Added instructor dashboard routes
- `src/routes/admin.js` - Added admin dashboard routes

### Key Features:

1. **Efficient Queries:** All endpoints use `Promise.all()` for parallel database queries
2. **Time-series Data:** Revenue and enrollment data uses PostgreSQL date functions for aggregation
3. **Role-based Access:** Proper middleware ensures only authorized users can access each endpoint
4. **Pending Questions Logic:** Uses SQL subqueries to find unanswered Q&A discussions
5. **Activity Feed:** Combines multiple activity types and sorts by timestamp
6. **Flexible Metrics:** Admin timeseries API supports multiple metrics and time periods

### Notes:

- All endpoints require authentication via JWT token
- Student endpoints are accessible by students and system admins
- Instructor endpoints are accessible by instructors and system admins
- Admin endpoints require support_admin or system_admin role
- Time-series data defaults to last 12 months/weeks or 30 days depending on period
