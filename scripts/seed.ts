import { connectDatabase } from "../src/config/database";
import { logger } from "../src/config/logger";
import { UserModel } from "../src/modules/user/model";
import { CourseCategoryModel, CourseModel, CourseModuleModel } from "../src/modules/course/model";
import { LessonContentModel, LessonModel } from "../src/modules/lesson/model";
import { EnrollmentModel, ProgressModel } from "../src/modules/enrollment/model";
import { PaymentModel, PaymentTransactionLogModel } from "../src/modules/payment/model";
import { CouponModel } from "../src/modules/coupon/model";
import { BlogModel } from "../src/modules/blog/model";
import { EventModel, EventRegistrationModel } from "../src/modules/event/model";
import {
  CertificateEligibilityModel,
  CertificateTemplateModel,
  IssuedCertificateModel,
} from "../src/modules/certificate/model";
import { SettingsModel } from "../src/modules/settings/model";

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function runSeed() {
  await connectDatabase();

  await Promise.all([
    UserModel.deleteMany({}),
    CourseCategoryModel.deleteMany({}),
    CourseModel.deleteMany({}),
    CourseModuleModel.deleteMany({}),
    LessonModel.deleteMany({}),
    LessonContentModel.deleteMany({}),
    EnrollmentModel.deleteMany({}),
    ProgressModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    PaymentTransactionLogModel.deleteMany({}),
    CouponModel.deleteMany({}),
    BlogModel.deleteMany({}),
    EventModel.deleteMany({}),
    EventRegistrationModel.deleteMany({}),
    CertificateEligibilityModel.deleteMany({}),
    CertificateTemplateModel.deleteMany({}),
    IssuedCertificateModel.deleteMany({}),
    SettingsModel.deleteMany({}),
  ]);

  const adminUser = await UserModel.create({
    name: "Admin User",
    email: "admin@astronomypathshala.com",
    username: "adminuser",
    password: "Admin@12345",
    role: "admin",
    status: "active",
  });

  const instructors = await UserModel.insertMany([
    {
      name: "Dr. Farhana Ahmed",
      email: "farhana@astronomypathshala.com",
      username: "farhana",
      password: "Instructor@123",
      role: "instructor",
      status: "active",
      bio: "Astrophysics mentor",
      specialization: "Stellar Evolution",
      publish_status: "published",
    },
    {
      name: "Tanvir Hasan",
      email: "tanvir@astronomypathshala.com",
      username: "tanvir",
      password: "Instructor@123",
      role: "instructor",
      status: "active",
      bio: "Olympiad trainer",
      specialization: "Observational Astronomy",
      publish_status: "published",
    },
  ]);

  const students = await UserModel.insertMany(
    Array.from({ length: 10 }).map((_, index) => ({
      name: `Student ${index + 1}`,
      email: `student${index + 1}@astronomypathshala.com`,
      username: `student${index + 1}`,
      password: "Student@123",
      role: "student",
      status: index % 4 === 0 ? "inactive" : "active",
      phone: `+8801700000${String(index + 1).padStart(3, "0")}`,
      publish_status: "published",
      enrolled_courses_count: 0,
    })),
  );

  const categories = await CourseCategoryModel.insertMany(
    Array.from({ length: 5 }).map((_, index) => ({
      title_en: `Category ${index + 1}`,
      title_bn: `ক্যাটাগরি ${index + 1}`,
      description_en: `Category ${index + 1} description`,
      description_bn: `ক্যাটাগরি ${index + 1} বর্ণনা`,
      slug: `category-${index + 1}`,
      thumbnail: "",
      publish_status: index % 2 === 0 ? "published" : "draft",
    })),
  );

  const courses = await CourseModel.insertMany(
    Array.from({ length: 5 }).map((_, index) => ({
      title_en: `Astronomy Course ${index + 1}`,
      title_bn: `জ্যোতির্বিজ্ঞান কোর্স ${index + 1}`,
      subtitle_en: `Subtitle ${index + 1}`,
      subtitle_bn: `সাবটাইটেল ${index + 1}`,
      slug: `astronomy-course-${index + 1}`,
      category_id: categories[index % categories.length].id,
      thumbnail: "",
      intro_video_url: "https://youtu.be/dQw4w9WgXcQ",
      description_en: `Comprehensive astronomy course ${index + 1}`,
      description_bn: `সম্পূর্ণ জ্যোতির্বিজ্ঞান কোর্স ${index + 1}`,
      requirements_en: ["Curiosity"],
      requirements_bn: ["কৌতূহল"],
      learning_objectives_en: ["Understand astronomy basics"],
      learning_objectives_bn: ["জ্যোতির্বিজ্ঞানের বেসিক বোঝা"],
      targeted_audience_en: ["Students"],
      targeted_audience_bn: ["শিক্ষার্থী"],
      faqs: [],
      instructor_ids: [instructors[index % instructors.length].id],
      level: randomFrom(["beginner", "intermediate", "advanced", "all_levels"]),
      language: index % 2 === 0 ? "bn" : "en",
      duration: `${6 + index} weeks`,
      total_lessons: 0,
      is_free: index % 3 === 0,
      price: index % 3 === 0 ? 0 : 2000 + index * 100,
      discount_price: index % 3 === 0 ? 0 : 1800 + index * 100,
      publish_status: index % 2 === 0 ? "published" : "draft",
    })),
  );

  for (const course of courses) {
    const module = await CourseModuleModel.create({
      course_id: course.id,
      title_en: `Module for ${course.title_en}`,
      title_bn: `${course.title_bn} মডিউল`,
      order_no: 1,
    });

    const lesson = await LessonModel.create({
      course_id: course.id,
      module_id: module.id,
      module_title_en: module.title_en,
      module_title_bn: module.title_bn,
      title_en: `Lesson 1 of ${course.title_en}`,
      title_bn: `${course.title_bn} এর প্রথম পাঠ`,
      lesson_type: "video",
      youtube_unlisted_url: "https://youtu.be/dQw4w9WgXcQ",
      duration: "15:00",
      quiz_id: null,
      smart_note_id: null,
      order_no: 1,
      publish_status: "published",
    });

    await LessonContentModel.create({
      lesson_id: lesson.id,
      type: "video",
      order_no: 1,
      video_url: lesson.youtube_unlisted_url,
      video_duration: lesson.duration,
      unlock_condition: "auto_unlock",
    });

    course.total_lessons = 1;
    await course.save();
  }

  const enrolledCourseSubset = courses.slice(0, 5);
  for (let index = 0; index < 10; index += 1) {
    const student = students[index];
    const course = enrolledCourseSubset[index % enrolledCourseSubset.length];

    if (index < 5) {
      await EnrollmentModel.create({
        student_id: student.id,
        student_name: student.name,
        course_id: course.id,
        course_name: course.title_en,
        enrolled_at: new Date(Date.now() - index * 86400000).toISOString(),
        enrollment_type: "manual",
        payment_status: course.is_free ? "free" : "paid",
        progress_percent: index * 10,
        completed_lessons: [],
        completed_at: null,
        status: "active",
        access_status: "active",
      });

      await ProgressModel.create({
        student_id: student.id,
        student_name: student.name,
        course: course.title_en,
        lesson: `Lesson 1 of ${course.title_en}`,
        current_step: "VIDEO",
        video_watch_percent: index * 10,
        quiz_score: index * 8,
        smart_note_generated: index % 2 === 0,
        completion_status: index % 2 === 0 ? "in_progress" : "completed",
      });

      await PaymentModel.create({
        trx_id: `BKASH-SEED-${index + 1}`,
        invoice: `BKASH-SEED-${index + 1}`,
        paymentID: `mock_BKASH-SEED-${index + 1}`,
        student_id: student.id,
        student_name: student.name,
        course_id: course.id,
        course_name: course.title_en,
        amount: course.price,
        gateway: "bKash",
        status: index % 3 === 0 ? "pending" : "verified",
        submitted_at: new Date(Date.now() - index * 3600000).toISOString(),
        manually_verified_by: index % 3 === 0 ? null : adminUser.name,
      });
    }
  }

  await CouponModel.insertMany(
    Array.from({ length: 1 }).map(() => ({
      code: "ASTRO10",
      discount_type: "percentage",
      discount_value: 10,
      max_redemption: 200,
      expires_at: new Date(Date.now() + 45 * 86400000).toISOString(),
      is_active: true,
    })),
  );

  await BlogModel.insertMany(
    Array.from({ length: 3 }).map((_, index) => ({
      title_en: `Blog Post ${index + 1}`,
      title_bn: `ব্লগ পোস্ট ${index + 1}`,
      content_en: `Detailed content for blog post ${index + 1} in English.`.repeat(2),
      content_bn: `ব্লগ পোস্ট ${index + 1} এর জন্য বিস্তারিত কনটেন্ট।`.repeat(2),
      category: "Astronomy Tips",
      tags: ["astronomy", "learning", `post-${index + 1}`],
      featured_image: "",
      seo_title: `SEO Blog ${index + 1}`,
      seo_description: `SEO description for blog post ${index + 1}`,
      slug: `blog-post-${index + 1}`,
      author: index % 2 === 0 ? adminUser.name : instructors[0].name,
      publish_status: index % 2 === 0 ? "published" : "draft",
    })),
  );

  const events = await EventModel.insertMany(
    Array.from({ length: 5 }).map((_, index) => ({
      title_en: `Event ${index + 1}`,
      slug: `event-${index + 1}`,
      title_bn: `ইভেন্ট ${index + 1}`,
      description_en: `Event description ${index + 1} `.repeat(4),
      description_bn: `ইভেন্ট বিবরণ ${index + 1} `.repeat(4),
      banner: "",
      event_date: new Date(Date.now() + (index + 1) * 86400000 * 5).toISOString(),
      registration_fee: index === 0 ? 0 : 500 + index * 200,
      max_participants: 100 + index * 50,
      registered_count: 0,
      publish_status: index % 2 === 0 ? "published" : "draft",
    })),
  );

  await EventRegistrationModel.insertMany([
    {
      event_id: events[0].id,
      event_title: events[0].title_en,
      student_name: students[0].name,
      payment_status: "paid",
      registered_at: new Date().toISOString(),
    },
    {
      event_id: events[0].id,
      event_title: events[0].title_en,
      student_name: students[1].name,
      payment_status: "pending",
      registered_at: new Date().toISOString(),
    },
  ]);

  await CertificateEligibilityModel.insertMany(
    courses.slice(0, 5).map((course) => ({
      course_id: course.id,
      minimum_completion_percent: 80,
      quiz_pass_required: true,
    })),
  );

  const templates = await CertificateTemplateModel.insertMany(
    courses.slice(0, 3).map((course, index) => ({
      linked_course_id: course.id,
      completion_required_percentage: 80,
      template_upload: `https://example.com/template-${index + 1}.pdf`,
      publish_status: index % 2 === 0 ? "published" : "draft",
    })),
  );

  await IssuedCertificateModel.create({
    certificate_no: "APS-CERT-SEED-001",
    student_name: students[0].name,
    linked_course_id: courses[0].id,
    linked_course_name: courses[0].title_en,
    template_id: templates[0].id,
    issued_at: new Date().toISOString(),
    verification_status: "verified",
    generated_by: adminUser.name,
  });

  await SettingsModel.create({
    key: "app",
    platform: {
      logo_url: "",
      favicon_url: "",
      contact_email: "support@astronomypathshala.com",
      contact_phone: "+8801700000000",
      contact_address: "Dhaka, Bangladesh",
      social_links: [
        { id: "sl_1", platform: "facebook", url: "https://facebook.com/astronomy-pathshala" },
      ],
    },
    seo: {
      meta_title: "Astronomy Pathshala LMS",
      meta_description:
        "Astronomy Pathshala learning platform for astronomy and astrophysics learners.",
      og_image_url: "",
      canonical_url: "https://astronomypathshala.com",
      robots_index: true,
    },
  });

  logger.info("Seed completed successfully");
}

runSeed()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("Seed failed", error);
    process.exit(1);
  });
