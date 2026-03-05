# Integration Check Report

Generated: 2026-03-05T07:54:31.209Z

## Schema Alignment Summary

- Compared modules: 12
- Fully aligned modules: 12
- Modules with mismatches: 0

## Endpoint Alignment Summary

- Frontend endpoint contracts: 25
- Backend endpoints matched: 25
- Backend missing endpoints: 0

## Security Checklist

- [x] Helmet enabled
- [x] CORS configured
- [x] Global rate limiter enabled
- [x] Mongo sanitize enabled
- [x] XSS sanitizer enabled
- [x] ObjectId validation middleware
- [x] OTP rate limit 5/hour
- [x] OTP stored hashed
- [x] Password salt rounds >= 10
- [x] Winston logger configured

## Missing Frontend Fields

- None

## Module Details

### Module: `analytics`

- Frontend fields: 0
- Backend fields: 0
- Missing in backend: 0
- Extra in backend: 0

### Module: `blog`

- Frontend fields: 11
- Backend fields: 13
- Missing in backend: 0
- Extra in backend: 1
- Extra fields: author

### Module: `certificate`

- Frontend fields: 9
- Backend fields: 11
- Missing in backend: 0
- Extra in backend: 2
- Extra fields: generated_by, verification_status

### Module: `coupon`

- Frontend fields: 6
- Backend fields: 9
- Missing in backend: 0
- Extra in backend: 0

### Module: `course`

- Frontend fields: 24
- Backend fields: 32
- Missing in backend: 0
- Extra in backend: 8
- Extra fields: answer_bn, answer_en, courseId, course_id, grade, moduleId, question_bn, question_en

### Module: `dashboard`

- Frontend fields: 0
- Backend fields: 0
- Missing in backend: 0
- Extra in backend: 0

### Module: `enrollment`

- Frontend fields: 4
- Backend fields: 5
- Missing in backend: 0
- Extra in backend: 1
- Extra fields: status

### Module: `event`

- Frontend fields: 9
- Backend fields: 10
- Missing in backend: 0
- Extra in backend: 1
- Extra fields: payment_status

### Module: `lesson`

- Frontend fields: 31
- Backend fields: 45
- Missing in backend: 0
- Extra in backend: 14
- Extra fields: contentId, contentIds, lessonId, note_content, note_pdf_url, questions, quiz_pass_mark, quiz_questions, quiz_time_limit, quiz_title, steps, type, video_duration, video_url

### Module: `payment`

- Frontend fields: 0
- Backend fields: 8
- Missing in backend: 0
- Extra in backend: 8
- Extra fields: amount, course_id, invoice, paymentID, payment_id, status, student_id, verifierName

### Module: `settings`

- Frontend fields: 13
- Backend fields: 13
- Missing in backend: 0
- Extra in backend: 0

### Module: `user`

- Frontend fields: 4
- Backend fields: 11
- Missing in backend: 0
- Extra in backend: 7
- Extra fields: avatar, bio, phone, publish_status, role, specialization, username
