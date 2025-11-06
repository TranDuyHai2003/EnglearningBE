# EngLearning Backend API Reference

Base URL: `/api`

All endpoints respond with JSON in the following envelope unless stated otherwise:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {...} // payload varies by endpoint
}
```

## Authentication

- Scheme: Bearer JWT
- Header: `Authorization: Bearer <token>`
- Tokens are issued during login/register and encode `id`, `email`, `role`.
- Use the `/api/auth/me` endpoint to validate and fetch the current profile.

### Endpoints

| Method | Path            | Description                                   | Auth | Roles        |
| ------ | --------------- | --------------------------------------------- | ---- | ------------ |
| POST   | `/auth/login`   | Authenticate with `email` + `password`.       | No   | Any          |
| POST   | `/auth/register`| Create a student/instructor account.          | No   | Any          |
| GET    | `/auth/me`      | Return current user profile.                  | Yes  | Any (logged) |

#### Login request

```json
{
  "email": "sysadmin@englearning.test",
  "password": "Password123!"
}
```

#### Login response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "sysadmin@englearning.test",
      "full_name": "System Admin",
      "role": "system_admin",
      "status": "active",
      "avatar_url": "https://..."
    },
    "token": "jwt-token"
  }
}
```

---

## Users

| Method | Path                      | Description                               | Auth | Roles                           |
| ------ | ------------------------- | ----------------------------------------- | ---- | ------------------------------- |
| GET    | `/users`                  | Paginated list (`page`, `limit`) with filters: `role`, `status`, `keyword`. | Yes  | `support_admin+`                |
| GET    | `/users/:id`              | Fetch profile (self or admin/support).    | Yes  | Self, `support_admin+`          |
| PATCH  | `/users/:id`              | Update `full_name`, `phone`, `avatar_url`, `status` (self or support/admin). | Yes | Self, `support_admin+`          |
| PATCH  | `/users/:id/role`         | Update role (`student`, `instructor`, `support_admin`, `system_admin`). | Yes | `support_admin+`                |
| PATCH  | `/users/:id/password`     | Change password. Self supplies `current_password`; admins/support may omit. | Yes | Self, `support_admin+`          |
| GET    | `/users/:id/courses`      | For instructors → their courses; for students/admin → enrollment summaries. | Yes | Self, `support_admin+`          |

---

## Instructor

| Method | Path                                   | Description                                                                      | Auth | Roles                     |
| ------ | -------------------------------------- | -------------------------------------------------------------------------------- | ---- | ------------------------- |
| POST   | `/instructors/profiles`                | Create profile (bio, education, experience, certificates).                      | Yes  | `student`, `instructor`   |
| PATCH  | `/instructors/profiles`                | Update own profile (resets status to `pending`).                                | Yes  | `student`, `instructor`   |
| GET    | `/instructors/profiles`                | List profiles (`status`, pagination).                                           | Yes  | `support_admin+`          |
| PATCH  | `/instructors/profiles/:id/review`     | Approve/reject: body `{ "status": "approved"|"rejected", "reason": "..." }`.    | Yes  | `support_admin+`          |
| GET    | `/instructors/:id/courses`             | Courses owned by instructor.                                                    | Yes  | Any logged-in             |

---

## Courses

### Metadata

| Method | Path                 | Description                                                        | Auth | Roles          |
| ------ | -------------------- | ------------------------------------------------------------------ | ---- | -------------- |
| GET    | `/courses/meta/categories` | List categories sorted by `display_order`.                    | Yes  | Any            |
| POST   | `/courses/meta/categories`| Create category `{ name, slug?, description, parent_id?, display_order? }`. | Yes | `support_admin+` |
| PATCH  | `/courses/meta/categories/:id` | Update category fields (same payload).                         | Yes | `support_admin+` |
| DELETE | `/courses/meta/categories/:id` | Delete category.                                                | Yes | `support_admin+` |
| GET    | `/courses/meta/tags` | List all tags.                                                     | Yes  | Any            |
| POST   | `/courses/meta/tags` | Create tag `{ name, slug? }`.                                      | Yes  | `support_admin+` |
| PATCH  | `/courses/meta/tags/:id` | Update tag.                                                   | Yes  | `support_admin+` |
| DELETE | `/courses/meta/tags/:id` | Delete tag.                                                   | Yes  | `support_admin+` |

### Course CRUD

| Method | Path              | Description                                                                                                                  | Auth | Roles                                    |
| ------ | ----------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- |
| GET    | `/courses`        | Paginated list (`page`, `limit`). Filters: `status`, `approval_status`, `instructor_id`, `category_id`, `search`. Students only see published+approved, instructors see own. | Yes  | Any                                      |
| POST   | `/courses`        | Create course. Requires body fields: `title`, `category_id`, `description`, `level`, `language`, `price`, `discount_price?`, `duration_hours`, optional `tag_ids[]`, `thumbnail_url`, `slug`. | Yes  | `instructor`, `system_admin`              |
| GET    | `/courses/:id`    | Full detail including sections/lessons/resources/tags. Students only if course is published & approved.                     | Yes  | Any                                      |
| PATCH  | `/courses/:id`    | Update general info (same fields as create).                                          | Yes  | Owner instructor, `support_admin`, `system_admin` |
| PATCH  | `/courses/:id/status` | Update workflow: body can include `status`, `approval_status`, `rejection_reason`. Approval changes stamp reviewer/time. | Yes  | Owner instructor (status only) or `support_admin+` |
| DELETE | `/courses/:id`    | Remove course.                                                                        | Yes  | Owner instructor, `system_admin`         |

### Sections & Lessons

| Method | Path                                             | Description                                                                         | Auth | Roles                          |
| ------ | ------------------------------------------------ | ----------------------------------------------------------------------------------- | ---- | ------------------------------ |
| POST   | `/courses/:courseId/sections`                    | Create section `{ title, description?, display_order? }`.                           | Yes  | Course owner, `system_admin`   |
| PATCH  | `/courses/:courseId/sections/:sectionId`         | Update section fields.                                                              | Yes  | Course owner, `system_admin`   |
| DELETE | `/courses/:courseId/sections/:sectionId`         | Delete section.                                                                     | Yes  | Course owner, `system_admin`   |
| POST   | `/courses/sections/:sectionId/lessons`           | Create lesson (fields: `title`, `description`, `lesson_type` (`video`, `document`, `quiz`, `assignment`), `video_url`, `video_duration`, `content`, `allow_preview`, `display_order`). | Yes | Course owner, `system_admin` |
| PATCH  | `/courses/sections/:sectionId/lessons/:lessonId` | Update lesson.                                                                      | Yes  | Course owner, `system_admin`   |
| DELETE | `/courses/sections/:sectionId/lessons/:lessonId` | Delete lesson.                                                                      | Yes  | Course owner, `system_admin`   |
| POST   | `/courses/lessons/:lessonId/resources`           | Add resource `{ title, file_url, file_type?, file_size? }`.                         | Yes  | Course owner, `system_admin`   |
| DELETE | `/courses/lessons/:lessonId/resources/:resourceId` | Delete resource.                                                                  | Yes  | Course owner, `system_admin`   |

---

## Learning (Enrollments, Progress, Quizzes)

| Method | Path                            | Description                                                                              | Auth | Roles                                   |
| ------ | ------------------------------- | ---------------------------------------------------------------------------------------- | ---- | --------------------------------------- |
| POST   | `/learning/enrollments`         | Enroll in course `{ course_id }` (course must be published & approved).                 | Yes  | `student`, `system_admin`               |
| GET    | `/learning/enrollments`         | Paginated list (`page`, `limit`, `student_id`, `course_id`, `status`). Students: own, instructors: courses they teach. | Yes | Any |
| GET    | `/learning/enrollments/:id`     | Enrollment detail with course structure & progress. Self, instructor of course, or support/system admin. | Yes | Any (subject to ownership) |
| POST   | `/learning/progress`            | Update lesson progress `{ lesson_id, status?, video_progress? }`.                       | Yes  | `student`, `system_admin`               |
| GET    | `/learning/progress/course/:courseId` | Current student’s enrollment + lesson progress.                                      | Yes  | `student`, `system_admin`               |
| GET    | `/learning/quizzes/:quizId`     | Retrieve quiz with questions/options.                                                   | Yes  | Any (must be enrolled)                  |
| POST   | `/learning/quizzes`             | Create/update quiz for lesson. Body fields: `lesson_id`, `title`, `description`, `time_limit`, `passing_score`, `max_attempts`, `shuffle_questions`, `show_correct_answers`. | Yes | `instructor`, `system_admin` |
| POST   | `/learning/quizzes/:quizId/questions` | Add question to quiz. Body: `question_text`, `question_type`, `points`, `display_order`, `explanation`, `options[]`. | Yes | `instructor`, `system_admin` |
| PUT    | `/learning/quizzes/:quizId/questions/:questionId` | Update question (same payload).                                                        | Yes | `instructor`, `system_admin`            |
| DELETE | `/learning/quizzes/:quizId/questions/:questionId` | Remove question.                                                                       | Yes | `instructor`, `system_admin`            |
| POST   | `/learning/quizzes/:quizId/attempts` | Start quiz attempt.                                                                    | Yes  | `student`, `system_admin`               |
| POST   | `/learning/attempts/:attemptId/submit` | Submit attempt with payload `{ answers: [{ question_id, selected_option_id?, answer_text?, time_taken? }] }`. | Yes | `student`, `system_admin` |
| GET    | `/learning/quizzes/:quizId/attempts` | List attempts. Students only see own; admins/instructors view all.                     | Yes  | Any                                     |

---

## Interaction (Q&A, Reviews, Notifications, Messages)

| Method | Path                                            | Description                                                         | Auth | Roles                                                    |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------- | ---- | -------------------------------------------------------- |
| POST   | `/interaction/discussions`                      | Create lesson discussion `{ lesson_id, question }`.                 | Yes  | `student`, `instructor`, `system_admin`                  |
| GET    | `/interaction/discussions`                      | List discussions. Filters: `lesson_id`, `course_id`.                | Yes  | Any                                                      |
| POST   | `/interaction/discussions/:id/replies`          | Reply to discussion `{ reply_text }`.                              | Yes  | `student`, `instructor`, `support_admin`, `system_admin` |
| DELETE | `/interaction/discussions/:id`                  | Delete discussion (owner/support/system).                          | Yes  | Owner, `support_admin`, `system_admin`                   |
| DELETE | `/interaction/discussions/:id/replies/:replyId` | Delete reply (owner/support/system).                               | Yes  | Owner, `support_admin`, `system_admin`                   |
| POST   | `/interaction/reviews`                          | Submit review `{ course_id, rating, comment }` (one per enrollment).| Yes  | `student`, `system_admin`                                |
| GET    | `/interaction/reviews`                          | List reviews (`status`, `course_id`, pagination). Students see own; instructors see reviews on their courses. | Yes | Any |
| PATCH  | `/interaction/reviews/:id`                      | Update review status/comment (moderation).                          | Yes  | `instructor`, `support_admin`, `system_admin`            |
| GET    | `/interaction/notifications`                    | List notifications for current user.                               | Yes  | Any                                                      |
| PATCH  | `/interaction/notifications/:id`                | Mark notification read `{ is_read? }`.                              | Yes  | Owner                                                    |
| POST   | `/interaction/notifications`                    | Create notification `{ user_id, type, title, content }`.            | Yes  | `support_admin+`                                         |
| GET    | `/interaction/messages`                         | List direct messages (filters: `course_id`).                        | Yes  | Any                                                      |
| POST   | `/interaction/messages`                         | Send message `{ receiver_id, course_id?, message_text }`.           | Yes  | `student`, `instructor`, `support_admin`, `system_admin` |
| PATCH  | `/interaction/messages/:id/read`                | Mark message as read.                                              | Yes  | Receiver                                                 |

---

## Payment

| Method | Path                                   | Description                                                                                  | Auth | Roles                                      |
| ------ | -------------------------------------- | -------------------------------------------------------------------------------------------- | ---- | ------------------------------------------ |
| POST   | `/payments/cart`                       | Create pending transaction draft from course IDs `{ course_ids: [] }`. Returns transaction + details. | Yes  | `student`, `system_admin`                  |
| GET    | `/payments/transactions`               | List transactions (`page`, `limit`, `status`, `student_id`). Students see own.               | Yes  | Any                                         |
| POST   | `/payments/checkout`                   | Finalize transaction `{ transaction_id, payment_method, payment_gateway }`. Creates enrollments. | Yes | `student`, `system_admin`                   |
| POST   | `/payments/transactions/:id/refund`    | Mark transaction refunded.                                                                   | Yes  | Owner student, `support_admin+`            |
| POST   | `/payments/webhook`                    | Generic webhook `{ transaction_code, status }`.                                              | Yes  | `support_admin+`                           |

---

## Admin Tools

| Method | Path                          | Description                                         | Auth | Roles             |
| ------ | ----------------------------- | --------------------------------------------------- | ---- | ----------------- |
| GET    | `/admin/dashboard/summary`    | KPIs: total users/courses/enrollments, revenue, pending counts. | Yes  | `support_admin+` |
| GET    | `/admin/settings`             | List system settings.                               | Yes  | `support_admin+` |
| POST   | `/admin/settings`             | Upsert setting `{ key, value, description? }`.      | Yes  | `support_admin+` |
| PUT    | `/admin/settings/:key`        | Same as POST (idempotent).                          | Yes  | `support_admin+` |
| DELETE | `/admin/settings/:key`        | Remove setting.                                     | Yes  | `support_admin+` |
| GET    | `/admin/support/tickets`      | List tickets (`status`, pagination). Students/instructors only see their own tickets. | Yes | Any |
| POST   | `/admin/support/tickets`      | Create ticket `{ category, subject, description, priority? }`. | Yes | Any |
| PATCH  | `/admin/support/tickets/:id`  | Update status/priority/assignee (auto sets `resolved_at`). | Yes | `support_admin+` |
| POST   | `/admin/support/tickets/:id/replies` | Add reply `{ reply_text }` (author may be support or owner). | Yes | Owner or `support_admin+` |

---

## System & Monitoring

| Method | Path           | Description                                      | Auth | Roles            |
| ------ | -------------- | ------------------------------------------------ | ---- | ---------------- |
| GET    | `/healthz`     | Liveness + DB connectivity summary.             | No   | Public           |
| GET    | `/metrics`     | Quick counters (courses, users, enrollments, revenue). | Yes | `support_admin+` |
| GET    | `/health`      | Application-level heartbeat (from Express root).| No   | Public           |

---

## Validation & Error Handling

- Missing/invalid JWT → `401 { success:false, message:"No token provided"|"Invalid token" }`
- Role violations → `403 { success:false, message:"Forbidden"|"Insufficient role" }`
- Validation errors (e.g., missing body fields) → `400` with message.
- Not found resources → `404 { success:false, message:"... not found" }`
- Server errors pass through `errorHandler` middleware and return `500`.

---

## Pagination Metadata

Endpoints using pagination include `meta` block:

```json
{
  "meta": {
    "total": 120,
    "page": 2,
    "limit": 20,
    "total_pages": 6
  }
}
```

---

## Roles Recap

| Role           | Capabilities (high level)                                                                |
| -------------- | ---------------------------------------------------------------------------------------- |
| `student`      | Enroll in courses, track progress, attempt quizzes, create reviews/discussions, request support. |
| `instructor`   | Manage own courses/content, moderate reviews on own courses, interact with students.     |
| `support_admin`| Manage users, instructors, categories/tags, review requests, handle payments/support, view metrics. |
| `system_admin` | Full access including destructive actions, course publishing, settings, payments, seeding. |

Use the seed script (`npm run seed -- --fresh`) for a rich dataset with test users for each role.
