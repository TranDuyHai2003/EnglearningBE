-- Auto-approve pending lessons in approved courses
UPDATE lessons
SET approval_status = 'approved'
WHERE approval_status = 'pending'
AND section_id IN (
  SELECT s.section_id
  FROM sections s
  JOIN courses c ON s.course_id = c.course_id
  WHERE c.approval_status = 'approved'
);
