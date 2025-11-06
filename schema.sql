-- Tạo database
CREATE DATABASE elearning_db
    WITH OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

\c elearning_db;

-- =====================
-- ENUM definitions
-- =====================
CREATE TYPE user_role AS ENUM ('student', 'instructor', 'support_admin', 'system_admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'locked');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE course_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE course_status AS ENUM ('draft', 'pending', 'published', 'rejected', 'archived');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE lesson_type AS ENUM ('video', 'document', 'quiz', 'assignment');
CREATE TYPE progress_status AS ENUM ('not_started', 'in_progress', 'completed');
CREATE TYPE payment_method AS ENUM ('bank_card', 'e_wallet', 'bank_transfer');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE notification_type AS ENUM ('course', 'payment', 'message', 'system');
CREATE TYPE support_category AS ENUM ('technical', 'payment', 'content', 'other');
CREATE TYPE support_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'fill_blank');

-- =====================
-- Bảng Users
-- =====================
CREATE TABLE users (
    user_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    role user_role NOT NULL,
    status user_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- =====================
-- Bảng Instructor_Profiles
-- =====================
CREATE TABLE instructor_profiles (
    profile_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bio TEXT,
    education TEXT,
    experience TEXT,
    certificates TEXT,
    approval_status approval_status DEFAULT 'pending',
    approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);

-- =====================
-- Bảng Categories
-- =====================
CREATE TABLE categories (
    category_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT REFERENCES categories(category_id) ON DELETE SET NULL,
    display_order INT DEFAULT 0
);

-- =====================
-- Bảng Courses
-- =====================
CREATE TABLE courses (
    course_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    instructor_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(category_id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    level course_level DEFAULT 'beginner',
    language VARCHAR(50) DEFAULT 'Vietnamese',
    price NUMERIC(10,2) DEFAULT 0,
    discount_price NUMERIC(10,2),
    duration_hours INT DEFAULT 0,
    status course_status DEFAULT 'draft',
    approval_status approval_status DEFAULT 'pending',
    reviewed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    total_students INT DEFAULT 0,
    average_rating NUMERIC(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- =====================
-- Bảng Course_Tags
-- =====================
CREATE TABLE course_tags (
    tag_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL
);

-- =====================
-- Bảng Course_Tag_Mapping
-- =====================
CREATE TABLE course_tag_mapping (
    course_id INT REFERENCES courses(course_id) ON DELETE CASCADE,
    tag_id INT REFERENCES course_tags(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);

-- =====================
-- Bảng Sections
-- =====================
CREATE TABLE sections (
    section_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng Lessons
-- =====================
CREATE TABLE lessons (
    lesson_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    section_id INT NOT NULL REFERENCES sections(section_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    lesson_type lesson_type NOT NULL,
    video_url VARCHAR(500),
    video_duration INT DEFAULT 0,
    content TEXT,
    allow_preview BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng Lesson_Resources
-- =====================
CREATE TABLE lesson_resources (
    resource_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lesson_id INT NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng Quizzes
-- =====================
CREATE TABLE quizzes (
    quiz_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lesson_id INT NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    time_limit INT,
    passing_score NUMERIC(5,2) DEFAULT 70.00,
    max_attempts INT DEFAULT 3,
    shuffle_questions BOOLEAN DEFAULT TRUE,
    show_correct_answers BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng Questions
-- =====================
CREATE TABLE questions (
    question_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id INT NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type question_type NOT NULL,
    points NUMERIC(5,2) DEFAULT 1.00,
    display_order INT DEFAULT 0,
    explanation TEXT
);

-- =====================
-- Bảng Answer_Options
-- =====================
CREATE TABLE answer_options (
    option_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id INT NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0
);

-- =====================
-- Bảng Enrollments
-- =====================
CREATE TABLE enrollments (
    enrollment_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completion_percentage NUMERIC(5,2) DEFAULT 0,
    status enrollment_status DEFAULT 'active',
    completed_at TIMESTAMP WITH TIME ZONE,
    certificate_issued BOOLEAN DEFAULT FALSE,
    UNIQUE (student_id, course_id)
);

-- =====================
-- Bảng Lesson_Progress
-- =====================
CREATE TABLE lesson_progress (
    progress_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    enrollment_id INT NOT NULL REFERENCES enrollments(enrollment_id) ON DELETE CASCADE,
    lesson_id INT NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    status progress_status DEFAULT 'not_started',
    video_progress INT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (enrollment_id, lesson_id)
);

-- =====================
-- Bảng Quiz_Attempts
-- =====================
CREATE TABLE quiz_attempts (
    attempt_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    quiz_id INT NOT NULL REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    score NUMERIC(5,2),
    passed BOOLEAN,
    time_taken INT
);

-- =====================
-- Bảng Student_Answers
-- =====================
CREATE TABLE student_answers (
    answer_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attempt_id INT NOT NULL REFERENCES quiz_attempts(attempt_id) ON DELETE CASCADE,
    question_id INT NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    selected_option_id INT REFERENCES answer_options(option_id) ON DELETE SET NULL,
    answer_text TEXT,
    is_correct BOOLEAN,
    points_earned NUMERIC(5,2) DEFAULT 0
);

-- =====================
-- Bảng Transactions
-- =====================
CREATE TABLE transactions (
    transaction_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    transaction_code VARCHAR(100) UNIQUE NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    final_amount NUMERIC(10,2) NOT NULL,
    payment_method payment_method,
    payment_gateway VARCHAR(100),
    status transaction_status DEFAULT 'pending',
    payment_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng Transaction_Details
-- =====================
CREATE TABLE transaction_details (
    detail_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    transaction_id INT NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    price NUMERIC(10,2) NOT NULL,
    discount NUMERIC(10,2) DEFAULT 0,
    final_price NUMERIC(10,2) NOT NULL
);

-- =====================
-- Bảng Reviews
-- =====================
CREATE TABLE reviews (
    review_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status approval_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (course_id, student_id)
);

-- =====================
-- Bảng QA_Discussions
-- =====================
CREATE TABLE qa_discussions (
    discussion_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lesson_id INT NOT NULL REFERENCES lessons(lesson_id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng QA_Replies
-- =====================
CREATE TABLE qa_replies (
    reply_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    discussion_id INT NOT NULL REFERENCES qa_discussions(discussion_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng Messages
-- =====================
CREATE TABLE messages (
    message_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    course_id INT REFERENCES courses(course_id) ON DELETE SET NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng Notifications
-- =====================
CREATE TABLE notifications (
    notification_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng Support_Tickets
-- =====================
CREATE TABLE support_tickets (
    ticket_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category support_category NOT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority support_priority DEFAULT 'medium',
    status support_status DEFAULT 'open',
    assigned_to INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- =====================
-- Bảng Support_Replies
-- =====================
CREATE TABLE support_replies (
    reply_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reply_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================
-- Bảng System_Settings
-- =====================
CREATE TABLE system_settings (
    setting_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_lessons_section ON lessons(section_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);


CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
