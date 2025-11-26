# Week 5 API Testing Guide

## Prerequisites
- Backend running on `http://localhost:5000`
- Valid JWT token (login as student/instructor/admin)
- Use Postman, Thunder Client, or curl

---

## 1. Notification APIs

### Get All Notifications
```http
GET http://localhost:5000/api/notifications
Authorization: Bearer YOUR_JWT_TOKEN

Query Parameters:
- page: 1 (optional)
- limit: 20 (optional)
- is_read: true/false (optional)
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "notification_id": 1,
      "user_id": 3,
      "type": "discussion",
      "title": "Câu hỏi mới",
      "message": "John Doe đã đặt câu hỏi trong bài...",
      "link": "/instructor/courses/1/lessons/5",
      "is_read": false,
      "created_at": "2025-11-25T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "total_pages": 1
  }
}
```

### Mark Notification as Read
```http
PATCH http://localhost:5000/api/notifications/1/read
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "notification_id": 1,
    "is_read": true,
    ...
  }
}
```

### Mark All as Read
```http
PATCH http://localhost:5000/api/notifications/mark-all-read
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Marked 5 notifications as read",
  "count": 5
}
```

### Delete Notification
```http
DELETE http://localhost:5000/api/notifications/1
Authorization: Bearer YOUR_JWT_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## 2. Discussion (Q&A) APIs

### Get Discussions for a Lesson
```http
GET http://localhost:5000/api/learning/lessons/5/discussions
Authorization: Bearer YOUR_JWT_TOKEN

Query Parameters:
- page: 1
- limit: 20
```

### Create Discussion
```http
POST http://localhost:5000/api/learning/lessons/5/discussions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Làm thế nào để sử dụng async/await?",
  "content": "Em chưa hiểu rõ về cách sử dụng async/await trong JavaScript. Thầy có thể giải thích chi tiết hơn không ạ?"
}
```

**Expected:** Giảng viên nhận notification

### Create Reply
```http
POST http://localhost:5000/api/learning/discussions/1/replies
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "content": "Async/await là cú pháp giúp viết code bất đồng bộ dễ đọc hơn..."
}
```

**Expected:** Người hỏi nhận notification

### Mark Reply as Helpful
```http
PATCH http://localhost:5000/api/learning/replies/1/helpful
Authorization: Bearer YOUR_JWT_TOKEN (must be question owner)
```

### Resolve Discussion
```http
PATCH http://localhost:5000/api/learning/discussions/1/resolve
Authorization: Bearer YOUR_JWT_TOKEN (question owner or instructor)
```

### Delete Discussion
```http
DELETE http://localhost:5000/api/learning/discussions/1
Authorization: Bearer YOUR_JWT_TOKEN (owner or admin)
```

---

## 3. Review APIs

### Get Course Reviews
```http
GET http://localhost:5000/api/courses/1/reviews

Query Parameters:
- page: 1
- limit: 20
- rating: 5 (optional, filter by rating)
```

### Get My Review
```http
GET http://localhost:5000/api/courses/1/reviews/me
Authorization: Bearer YOUR_JWT_TOKEN
```

### Create/Update Review
```http
POST http://localhost:5000/api/courses/1/reviews
Authorization: Bearer YOUR_JWT_TOKEN (must be enrolled)
Content-Type: application/json

{
  "rating": 5,
  "comment": "Khóa học rất hay, giảng viên nhiệt tình!"
}
```

**Expected:** Course `average_rating` auto-updates

### Delete My Review
```http
DELETE http://localhost:5000/api/courses/1/reviews
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 4. Moderation APIs

### Report Content
```http
POST http://localhost:5000/api/reports
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "content_type": "discussion",
  "content_id": 1,
  "reason": "Spam hoặc quảng cáo: Nội dung chứa link quảng cáo không liên quan"
}
```

### Get Reports (Admin Only)
```http
GET http://localhost:5000/api/admin/reports
Authorization: Bearer ADMIN_JWT_TOKEN

Query Parameters:
- page: 1
- limit: 20
- status: pending/reviewed/resolved
- content_type: discussion/reply/review
```

### Update Report Status (Admin Only)
```http
PATCH http://localhost:5000/api/admin/reports/1
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "status": "reviewed",
  "admin_note": "Đã xem xét, nội dung vi phạm"
}
```

### Delete Reported Content (Admin Only)
```http
DELETE http://localhost:5000/api/admin/content/discussion/1
Authorization: Bearer ADMIN_JWT_TOKEN
```

**Expected:** All reports for this content auto-resolved

---

## Testing Flow

### Flow 1: Q&A with Notifications
1. **Student** creates discussion → Check instructor notifications
2. **Instructor** replies → Check student notifications
3. **Student** marks reply helpful
4. **Instructor** resolves discussion
5. Verify all notifications are created

### Flow 2: Review System
1. **Student** (enrolled) creates review with rating 5
2. Check course `average_rating` updated
3. **Student** edits review to rating 4
4. Check `average_rating` recalculated
5. **Student** deletes review
6. Check `average_rating` updated again

### Flow 3: Moderation
1. **User A** reports a discussion
2. **Admin** views reports list
3. **Admin** adds note and marks as "reviewed"
4. **Admin** deletes the violating content
5. Check report status auto-changed to "resolved"

### Flow 4: Notification Management
1. Create some notifications (via Q&A)
2. **GET** `/api/notifications?is_read=false` → See unread
3. **PATCH** `/api/notifications/1/read` → Mark one as read
4. **PATCH** `/api/notifications/mark-all-read` → Mark all
5. **DELETE** `/api/notifications/1` → Delete one
6. **GET** `/api/notifications` → Verify changes

---

## Common Issues & Solutions

### 403 Forbidden
- Check JWT token is valid
- Check user has correct role/permissions
- For reviews: User must be enrolled in course

### 404 Not Found
- Check IDs are correct
- Check content exists in database
- For "my review": User may not have reviewed yet

### 400 Bad Request
- Check request body format
- For reports: May have already reported this content
- For reviews: Check rating is 1-5

### 500 Internal Server Error
- Check backend logs
- Check database connection
- Check model associations are correct

---

## Success Criteria

✅ All notification APIs return correct data
✅ Notifications created automatically on Q&A actions
✅ Reviews update course average_rating
✅ Reports can be created and managed by admin
✅ Permissions enforced correctly
✅ Pagination works on all list endpoints
✅ Filters work correctly (is_read, rating, status, etc.)

---

## Next Steps After Testing

1. ✅ Verify all APIs work
2. 📱 Integrate frontend components
3. 🎨 Test UI flows
4. 📝 Document any bugs
5. 🚀 Deploy to staging
