# File Upload API Documentation

This document describes the CV and profile upload endpoints added to the E-Learning platform.

## Overview

The application now supports file uploads for:
- **User avatars** (images)
- **User CVs** (PDF, DOC, DOCX)
- **Instructor CVs** (PDF, DOC, DOCX)
- **Instructor certificates** (PDF, DOC, DOCX - multiple files)

## Storage Configuration

- **Storage Type**: Local file system
- **Upload Directory**: `uploads/`
  - `uploads/avatars/` - User avatar images
  - `uploads/cvs/` - User and instructor CV documents
  - `uploads/certificates/` - Instructor certificates
- **Access URL**: `http://localhost:{PORT}/uploads/{subdirectory}/{filename}`

## Database Schema Changes

### Users Table
New fields added:
- `cv_url` (STRING) - Path to CV file
- `cv_file_name` (STRING) - Original filename
- `cv_uploaded_at` (DATE) - Upload timestamp

### Instructor Profiles Table
New fields added:
- `certificate_files` (JSON) - Array of certificate metadata
- `cv_url` (STRING) - Path to CV file
- `cv_file_name` (STRING) - Original filename
- `cv_uploaded_at` (DATE) - Upload timestamp

## API Endpoints

### 1. Upload User Avatar

**Endpoint**: `POST /api/users/:id/upload-avatar`

**Authentication**: Required (JWT)

**Authorization**: User can upload their own avatar, or admins can upload for any user

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with field name `avatar`

**File Requirements**:
- Allowed types: JPEG, JPG, PNG, GIF, WEBP
- Max size: 5MB

**Example (cURL)**:
```bash
curl -X POST \
  http://localhost:3000/api/users/123/upload-avatar \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "avatar=@/path/to/image.jpg"
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Avatar uploaded successfully",
  "data": {
    "avatar_url": "/uploads/avatars/123_1234567890_image.jpg",
    "file_name": "image.jpg",
    "file_size": 102400
  }
}
```

---

### 2. Upload User CV

**Endpoint**: `POST /api/users/:id/upload-cv`

**Authentication**: Required (JWT)

**Authorization**: User can upload their own CV, or admins can upload for any user

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with field name `cv`

**File Requirements**:
- Allowed types: PDF, DOC, DOCX
- Max size: 10MB

**Example (cURL)**:
```bash
curl -X POST \
  http://localhost:3000/api/users/123/upload-cv \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "cv=@/path/to/resume.pdf"
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "CV uploaded successfully",
  "data": {
    "cv_url": "/uploads/cvs/123_1234567890_resume.pdf",
    "cv_file_name": "resume.pdf",
    "cv_uploaded_at": "2025-11-19T10:30:00.000Z",
    "file_size": 512000
  }
}
```

---

### 3. Upload Instructor CV

**Endpoint**: `POST /api/instructors/upload-cv`

**Authentication**: Required (JWT)

**Authorization**: Instructor or student (creating instructor profile)

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with field name `cv`

**File Requirements**:
- Allowed types: PDF, DOC, DOCX
- Max size: 10MB

**Note**: Instructor profile must exist before uploading CV

**Example (cURL)**:
```bash
curl -X POST \
  http://localhost:3000/api/instructors/upload-cv \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "cv=@/path/to/instructor-cv.pdf"
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "CV uploaded successfully",
  "data": {
    "cv_url": "/uploads/cvs/456_1234567890_instructor-cv.pdf",
    "cv_file_name": "instructor-cv.pdf",
    "cv_uploaded_at": "2025-11-19T10:35:00.000Z",
    "file_size": 768000
  }
}
```

---

### 4. Upload Instructor Certificates

**Endpoint**: `POST /api/instructors/upload-certificates`

**Authentication**: Required (JWT)

**Authorization**: Instructor or student (creating instructor profile)

**Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with field name `certificates` (can be multiple files)

**File Requirements**:
- Allowed types: PDF, DOC, DOCX
- Max size per file: 10MB
- Max files per request: 5

**Note**:
- Instructor profile must exist before uploading certificates
- New uploads are appended to existing certificates

**Example (cURL)**:
```bash
curl -X POST \
  http://localhost:3000/api/instructors/upload-certificates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "certificates=@/path/to/cert1.pdf" \
  -F "certificates=@/path/to/cert2.pdf"
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "2 certificate(s) uploaded successfully",
  "data": {
    "uploaded_certificates": [
      {
        "url": "/uploads/certificates/456_1234567890_cert1.pdf",
        "file_name": "cert1.pdf",
        "file_size": 256000,
        "uploaded_at": "2025-11-19T10:40:00.000Z"
      },
      {
        "url": "/uploads/certificates/456_1234567891_cert2.pdf",
        "file_name": "cert2.pdf",
        "file_size": 312000,
        "uploaded_at": "2025-11-19T10:40:00.000Z"
      }
    ],
    "total_certificates": 2
  }
}
```

---

### 5. Delete Instructor Certificate

**Endpoint**: `DELETE /api/instructors/delete-certificate`

**Authentication**: Required (JWT)

**Authorization**: Instructor or student (owning the profile)

**Request**:
- Method: `DELETE`
- Content-Type: `application/json`
- Body:
```json
{
  "certificateUrl": "/uploads/certificates/456_1234567890_cert1.pdf"
}
```

**Example (cURL)**:
```bash
curl -X DELETE \
  http://localhost:3000/api/instructors/delete-certificate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"certificateUrl": "/uploads/certificates/456_1234567890_cert1.pdf"}'
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Certificate deleted successfully",
  "data": {
    "remaining_certificates": 1
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "No file uploaded"
}
```

```json
{
  "success": false,
  "message": "File size exceeds the limit"
}
```

```json
{
  "success": false,
  "message": "Only PDF and Word documents are allowed"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "User not found"
}
```

```json
{
  "success": false,
  "message": "Instructor profile not found. Please create a profile first."
}
```

---

## File Naming Convention

Uploaded files are renamed using the pattern:
```
{userId}_{timestamp}_{sanitizedOriginalFilename}
```

Example: `123_1699876543210_my_resume.pdf`

This ensures:
- Unique filenames
- Traceability to users
- No filename conflicts

---

## Security Features

1. **Authentication**: All upload endpoints require JWT authentication
2. **Authorization**: Users can only upload files for their own profiles (unless admin)
3. **File Type Validation**: Only allowed file types are accepted
4. **File Size Limits**:
   - Images: 5MB max
   - Documents: 10MB max
5. **Filename Sanitization**: Special characters removed from filenames
6. **Old File Cleanup**: Previous files are deleted when uploading new ones (for avatars and CVs)

---

## Frontend Integration

### JavaScript/Fetch Example

```javascript
// Upload avatar
async function uploadAvatar(userId, file) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await fetch(`/api/users/${userId}/upload-avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  return await response.json();
}

// Upload CV
async function uploadCV(userId, file) {
  const formData = new FormData();
  formData.append('cv', file);

  const response = await fetch(`/api/users/${userId}/upload-cv`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  return await response.json();
}

// Upload instructor certificates
async function uploadCertificates(files) {
  const formData = new FormData();
  files.forEach(file => formData.append('certificates', file));

  const response = await fetch('/api/instructors/upload-certificates', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  return await response.json();
}
```

### HTML Form Example

```html
<!-- Avatar Upload -->
<form id="avatarForm">
  <input type="file" name="avatar" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp">
  <button type="submit">Upload Avatar</button>
</form>

<!-- CV Upload -->
<form id="cvForm">
  <input type="file" name="cv" accept=".pdf,.doc,.docx">
  <button type="submit">Upload CV</button>
</form>

<!-- Certificate Upload (Multiple) -->
<form id="certificateForm">
  <input type="file" name="certificates" accept=".pdf,.doc,.docx" multiple>
  <button type="submit">Upload Certificates</button>
</form>
```

---

## Database Migration

After deploying these changes, ensure your database is synchronized with the new schema:

```bash
# If using Sequelize migrations
npx sequelize-cli db:migrate

# Or sync models (development only)
# Set sync: true in database config
```

**Note**: The upload middleware automatically creates the required directories (`uploads/avatars`, `uploads/cvs`, `uploads/certificates`) on first run.

---

## Deployment Considerations

1. **Production Storage**: Consider using cloud storage (AWS S3, Cloudinary, etc.) for production instead of local storage
2. **File Backup**: Ensure uploads directory is backed up regularly
3. **CDN**: Use a CDN to serve uploaded files efficiently
4. **Permissions**: Ensure proper file system permissions for the uploads directory
5. **Disk Space**: Monitor disk space usage in production

---

## Testing

You can test the endpoints using tools like:
- Postman
- Insomnia
- cURL
- Thunder Client (VS Code extension)

Ensure you have:
1. A valid JWT token
2. Files that meet the type and size requirements
3. Proper user permissions
