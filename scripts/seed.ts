import { connectDatabase } from "../src/config/database";
import { logger } from "../src/config/logger";
import { UserModel } from "../src/modules/user/model";
import {
  CourseCategoryModel,
  CourseModel,
  CourseModuleModel,
} from "../src/modules/course/model";
import { LessonContentModel, LessonModel } from "../src/modules/lesson/model";
import {
  EnrollmentModel,
  ProgressModel,
} from "../src/modules/enrollment/model";
import {
  PaymentModel,
  PaymentTransactionLogModel,
} from "../src/modules/payment/model";
import { CouponModel } from "../src/modules/coupon/model";
import { BlogModel } from "../src/modules/blog/model";
import { EventModel, EventRegistrationModel } from "../src/modules/event/model";
import {
  CertificateEligibilityModel,
  CertificateTemplateModel,
  IssuedCertificateModel,
} from "../src/modules/certificate/model";
import { SettingsModel } from "../src/modules/settings/model";

type SeedContentDefinition = {
  type: "video" | "pdf" | "quiz" | "assignment" | "resource";
  video_data?: {
    url: string;
    duration?: string;
    provider?: string;
    thumbnail?: string;
  };
  pdf_data?: {
    title_en: string;
    title_bn: string;
    file_url: string;
    downloadable: boolean;
  };
  quiz_data?: {
    title: string;
    time_limit: number;
    pass_mark: number;
    questions: any[];
  };
};

type SeedLessonDefinition = {
  title_en: string;
  title_bn: string;
  contents: SeedContentDefinition[];
};

type SeedModuleDefinition = {
  title_en: string;
  title_bn: string;
  lessons: SeedLessonDefinition[];
};

type SeedCourseDefinition = {
  title_en: string;
  title_bn: string;
  subtitle_en: string;
  subtitle_bn: string;
  slug: string;
  category_slug: string;
  intro_video_url: string;
  description_en: string;
  description_bn: string;
  requirements_en: string[];
  requirements_bn: string[];
  learning_objectives_en: string[];
  learning_objectives_bn: string[];
  targeted_audience_en: string[];
  targeted_audience_bn: string[];
  faqs: Array<{
    question_en: string;
    answer_en: string;
    question_bn: string;
    answer_bn: string;
  }>;
  instructor_index: number;
  level: "beginner" | "intermediate" | "advanced" | "all_levels";
  language: string;
  grade: string;
  duration: string;
  is_free: boolean;
  price: number;
  discount_price: number;
  publish_status: "draft" | "published";
  modules: SeedModuleDefinition[];
};

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

  const instructors = await UserModel.create([
    {
      name: "Dr. Farhana Ahmed",
      email: "farhana@astronomypathshala.com",
      username: "farhana",
      password: "Instructor@123",
      role: "instructor",
      status: "active",
      bio: "Astrophysics mentor focused on making complex concepts simple.",
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
      bio: "Olympiad trainer with practical astronomy teaching experience.",
      specialization: "Observational Astronomy",
      publish_status: "published",
    },
  ]);

  const students = await UserModel.create(
    Array.from({ length: 10 }).map((_, index) => ({
      name: `Student ${index + 1}`,
      email: `student${index + 1}@astronomypathshala.com`,
      username: `student${index + 1}`,
      password: "Student@123",
      role: "student",
      status: "active",
      phone: `+8801700000${String(index + 1).padStart(3, "0")}`,
      publish_status: "published",
      enrolled_courses_count: 0,
    })),
  );

  const categories = await CourseCategoryModel.insertMany([
    {
      title_en: "Astronomy",
      title_bn: "জ্যোতির্বিজ্ঞান",
      description_en: "Core astronomy concepts for beginners and enthusiasts.",
      description_bn:
        "শিক্ষার্থী ও আগ্রহীদের জন্য জ্যোতির্বিজ্ঞানের মূল ধারণা।",
      slug: "astronomy",
      thumbnail: "",
      publish_status: "published",
    },
    {
      title_en: "Astrophysics",
      title_bn: "অ্যাস্ট্রোফিজিক্স",
      description_en:
        "Physics-driven understanding of celestial objects and systems.",
      description_bn:
        "মহাজাগতিক বস্তু ও সিস্টেমের পদার্থবিজ্ঞানভিত্তিক বিশ্লেষণ।",
      slug: "astrophysics",
      thumbnail: "",
      publish_status: "published",
    },
    {
      title_en: "Olympiad Prep",
      title_bn: "অলিম্পিয়াড প্রস্তুতি",
      description_en:
        "Structured preparation for astronomy olympiad problem solving.",
      description_bn:
        "অ্যাস্ট্রোনমি অলিম্পিয়াডের সমস্যা সমাধানে কাঠামোবদ্ধ প্রস্তুতি।",
      slug: "olympiad-prep",
      thumbnail: "",
      publish_status: "published",
    },
    {
      title_en: "Observation",
      title_bn: "পর্যবেক্ষণ",
      description_en:
        "Practical skywatching techniques and observation workflows.",
      description_bn: "প্রায়োগিক আকাশ পর্যবেক্ষণ পদ্ধতি ও ওয়ার্কফ্লো।",
      slug: "observation",
      thumbnail: "",
      publish_status: "published",
    },
    {
      title_en: "Cosmology",
      title_bn: "কসমোলজি",
      description_en:
        "Origin, evolution, and large-scale structure of the universe.",
      description_bn: "মহাবিশ্বের উৎপত্তি, বিবর্তন ও বৃহৎ-স্কেলের গঠন।",
      slug: "cosmology",
      thumbnail: "",
      publish_status: "published",
    },
  ]);

  const categoryBySlug = new Map(
    categories.map((item) => [item.slug, item] as const),
  );

  const dummyQuizQuestions = [
    {
      id: "q1",
      question_en: "What is the primary source of energy for stats?",
      question_bn: "নক্ষত্রের প্রধান শক্তির উৎস কী?",
      question_type: "MCQ",
      options: [
        "Nuclear Fission",
        "Nuclear Fusion",
        "Chemical Burning",
        "Gravitational Collapse",
      ],
      correct_answer: "Nuclear Fusion",
      explanation_en:
        "Stars generate energy through nuclear fusion of hydrogen into helium.",
      explanation_bn: "নক্ষত্র নিউক্লিয়ার ফিউশনের মাধ্যমে শক্তি উৎপন্ন করে।",
    },
    {
      id: "q2",
      question_en: "Which of the following is considered a deep space object?",
      question_bn: "নিচের কোনটি গভীর মহাকাশের বস্তু?",
      question_type: "MCQ",
      options: ["Comet", "Asteroid", "Galaxy", "Meteorite"],
      correct_answer: "Galaxy",
      explanation_en:
        "Galaxies are large collections of stars outside our solar system.",
      explanation_bn: "গ্যালাক্সি আমাদের সৌরজগতের বাইরের বিশাল নক্ষত্রজগৎ।",
    },
    {
      id: "q3",
      question_en: "True or False: The Sun is a star.",
      question_bn: "সত্য বা মিথ্যা: সূর্য একটি নক্ষত্র।",
      question_type: "TRUE_FALSE",
      options: ["True", "False"],
      correct_answer: "True",
      explanation_en: "The Sun is a G-type main-sequence star.",
      explanation_bn: "সূর্য একটি প্রধান-পর্যায়ের নক্ষত্র।",
    },
  ];

  const basicAstronomyModules: SeedModuleDefinition[] = [
    {
      title_en: "Foundations of Astronomy",
      title_bn: "জ্যোতির্বিজ্ঞানের ভিত্তি",
      lessons: [
        {
          title_en: "Basic Physics",
          title_bn: "বেসিক ফিজিক্স",
          contents: [
            {
              type: "video",
              video_data: {
                url: "https://youtu.be/0uiqW6CyaeU",
                duration: "10:00",
              },
            },
            {
              type: "pdf",
              pdf_data: {
                title_en: "Basic Physics Notes",
                title_bn: "বেসিক ফিজিক্স নোটস",
                file_url: "/dummy-notes/basic-physics-notes.pdf",
                downloadable: true,
              },
            },
            {
              type: "quiz",
              quiz_data: {
                title: "Basic Physics Quiz",
                time_limit: 10,
                pass_mark: 60,
                questions: dummyQuizQuestions,
              },
            },
          ],
        },
        {
          title_en: "Introduction to Astronomy & Astrophysics",
          title_bn: "অ্যাস্ট্রোনমি ও অ্যাস্ট্রোফিজিক্স পরিচিতি",
          contents: [
            {
              type: "video",
              video_data: {
                url: "https://youtu.be/Cc0mOg2uyTc",
                duration: "12:00",
              },
            },
            {
              type: "pdf",
              pdf_data: {
                title_en: "Astronomy Intro Notes",
                title_bn: "অ্যাস্ট্রোনমি ইন্ট্রো নোটস",
                file_url: "/dummy-notes/astronomy-intro-notes.pdf",
                downloadable: true,
              },
            },
            {
              type: "quiz",
              quiz_data: {
                title: "Intro Quiz",
                time_limit: 10,
                pass_mark: 60,
                questions: dummyQuizQuestions,
              },
            },
          ],
        },
      ],
    },
    {
      title_en: "The Night Sky",
      title_bn: "রাতের আকাশ",
      lessons: [
        {
          title_en: "Constellations",
          title_bn: "নক্ষত্রমণ্ডল",
          contents: [
            {
              type: "video",
              video_data: { url: "https://youtu.be/i3lJakBgQpI" },
            },
          ],
        },
        {
          title_en: "Planets",
          title_bn: "গ্রহসমূহ",
          contents: [
            {
              type: "video",
              video_data: { url: "https://youtu.be/wmxvggYnLcU" },
            },
            {
              type: "pdf",
              pdf_data: {
                title_en: "Planets Notes",
                title_bn: "গ্রহ নোটস",
                file_url: "/dummy-notes/planets-notes.pdf",
                downloadable: true,
              },
            },
          ],
        },
        {
          title_en: "Stars",
          title_bn: "নক্ষত্র",
          contents: [
            {
              type: "video",
              video_data: { url: "https://youtu.be/-s4ZWBnDW-0" },
            },
            {
              type: "pdf",
              pdf_data: {
                title_en: "Stars Notes",
                title_bn: "নক্ষত্র নোটস",
                file_url: "/dummy-notes/stars-notes.pdf",
                downloadable: true,
              },
            },
          ],
        },
      ],
    },
    {
      title_en: "Deep Space Objects",
      title_bn: "গভীর মহাকাশের বস্তু",
      lessons: [
        {
          title_en: "Galaxies",
          title_bn: "গ্যালাক্সি",
          contents: [
            {
              type: "video",
              video_data: { url: "https://youtu.be/fp41OMiJlYs" },
            },
          ],
        },
      ],
    },
    {
      title_en: "Small Solar System Bodies",
      title_bn: "সৌরজগতের ক্ষুদ্র বস্তু",
      lessons: [
        {
          title_en: "Asteroid",
          title_bn: "গ্রহাণু",
          contents: [
            {
              type: "video",
              video_data: { url: "https://youtu.be/vUu2l7dL9Ic" },
            },
          ],
        },
        {
          title_en: "Comet",
          title_bn: "ধূমকেতু",
          contents: [
            {
              type: "video",
              video_data: { url: "https://youtu.be/F2y3TPIap0U" },
            },
          ],
        },
        {
          title_en: "Meteorite",
          title_bn: "উল্কাপিণ্ড",
          contents: [
            {
              type: "video",
              video_data: { url: "https://youtu.be/m_mKuOkRXfs" },
            },
          ],
        },
      ],
    },
    {
      title_en: "Astronomical Measurements",
      title_bn: "জ্যোতির্বৈজ্ঞানিক পরিমাপ",
      lessons: [
        {
          title_en: "Astronomical Numbers",
          title_bn: "জ্যোতির্বৈজ্ঞানিক সংখ্যা",
          contents: [
            {
              type: "video",
              video_data: { url: "https://youtu.be/8Q0PcvOR1SA" },
            },
          ],
        },
      ],
    },
  ];

  const courseBlueprints: SeedCourseDefinition[] = [
    {
      title_en: "Basic Astronomy Crash Course | Level-01",
      title_bn: "বেসিক অ্যাস্ট্রোনমি ক্র্যাশ কোর্স | লেভেল-০১",
      subtitle_en: "Start your astronomy journey with zero prior background.",
      subtitle_bn:
        "কোনো পূর্ব অভিজ্ঞতা ছাড়াই জ্যোতির্বিজ্ঞানের যাত্রা শুরু করুন।",
      slug: "basic-astronomy-crash-course-level-01",
      category_slug: "astronomy",
      intro_video_url: "https://youtu.be/0uiqW6CyaeU",
      description_en:
        "No matter your background, if the night sky makes you curious this course is for you. This beginner-friendly course explains astronomy fundamentals in simple language and helps you build a strong base in a short time.",
      description_bn:
        "আপনার ব্যাকগ্রাউন্ড যেকোনো বিষয়ের হতে পারে কিন্তু আপনাকে অবশ্যই রাতের আকাশের দিকে তাকালে একবার হলেও এই মহাবিশ্ব সম্পর্কে ভাবায়, তাইনা? মনে জাগে হাজারো প্রশ্ন এবং কৌতূহল। আর তাই অনেকেই আমরা হন্য হয়ে খুঁজি কীভাবে এই বিষয়ের অন্তত বেসিক ধারণাটি নেয়া যায়। ঠিক তাই জ্যোতির্বিজ্ঞানে আপনার যাত্রা আরো সহজ করে তুলতে আমরা আপনাদের জন্য নিয়ে এসেছি জ্যোতির্বিজ্ঞানের বেসিক কোর্স। এই কোর্সটিতে আমরা জ্যোতির্বিজ্ঞানের বেসিক বিষয়গুলো সহজভাবে ব্যাখ্যা করেছি।",
      requirements_en: [
        "Interest in astronomy",
        "Internet-enabled phone or laptop",
      ],
      requirements_bn: [
        "জ্যোতির্বিজ্ঞানে আগ্রহ",
        "ইন্টারনেট সংযোগসহ মোবাইল বা ল্যাপটপ",
      ],
      learning_objectives_en: [
        "Understand astronomy fundamentals",
        "Space and astronomical objects",
        "Explanation of cosmic phenomena",
        "Important astronomical facts",
      ],
      learning_objectives_bn: [
        "জ্যোতির্বিজ্ঞানের বেসিক ধারণা",
        "মহাকাশ ও জ্যোতির্বৈজ্ঞানিক বস্তুসমূহ",
        "বিভিন্ন মহাজাগতিক ঘটনাবলীর ব্যাখ্যা",
        "জ্যোতির্বিজ্ঞানের গুরুত্বপূর্ণ তথ্য",
      ],
      targeted_audience_en: [
        "Anyone interested in astronomy basics",
        "Learners from any age and background",
        "Students without science background can join",
      ],
      targeted_audience_bn: [
        "যারা জ্যোতির্বিজ্ঞানের বেসিক শিখতে চায়",
        "যেকোনো বয়সের শিক্ষার্থী",
        "Science background না থাকলেও করা যাবে",
      ],
      faqs: [
        {
          question_en: "Can a complete beginner take this course?",
          answer_en: "Yes. This course is designed for complete beginners.",
          question_bn: "একদম বিগিনার কি এই কোর্স করতে পারবে?",
          answer_bn: "হ্যাঁ, এই কোর্স সম্পূর্ণ বিগিনারদের জন্য ডিজাইন করা।",
        },
      ],
      instructor_index: 0,
      level: "beginner",
      language: "bn",
      grade: "Class 6-12",
      duration: "6 weeks",
      is_free: false,
      price: 1200,
      discount_price: 999,
      publish_status: "published",
      modules: basicAstronomyModules,
    },
    {
      title_en: "Astrophysics Essentials",
      title_bn: "অ্যাস্ট্রোফিজিক্স এসেনশিয়ালস",
      subtitle_en: "Physics tools to interpret stars and galaxies.",
      subtitle_bn: "নক্ষত্র ও গ্যালাক্সি বোঝার পদার্থবৈজ্ঞানিক ভিত্তি।",
      slug: "astrophysics-essentials",
      category_slug: "astrophysics",
      intro_video_url: "https://youtu.be/Cc0mOg2uyTc",
      description_en:
        "Learn the language of astrophysics through practical examples including radiation, stellar structure, and galaxy dynamics.",
      description_bn:
        "বিকিরণ, নক্ষত্রের গঠন এবং গ্যালাক্সির গতিশীলতা উদাহরণের মাধ্যমে অ্যাস্ট্রোফিজিক্সের মূল বিষয় শিখুন।",
      requirements_en: ["Basic algebra", "Curiosity about physics"],
      requirements_bn: ["প্রাথমিক বীজগণিত", "পদার্থবিজ্ঞানের প্রতি আগ্রহ"],
      learning_objectives_en: [
        "Interpret astrophysical quantities",
        "Connect observation with physical models",
      ],
      learning_objectives_bn: [
        "অ্যাস্ট্রোফিজিক্সের পরিমাপ ব্যাখ্যা করতে পারা",
        "পর্যবেক্ষণকে মডেলের সাথে যুক্ত করতে পারা",
      ],
      targeted_audience_en: ["Senior school and university beginners"],
      targeted_audience_bn: [
        "উচ্চমাধ্যমিক ও বিশ্ববিদ্যালয় পর্যায়ের শিক্ষার্থী",
      ],
      faqs: [],
      instructor_index: 0,
      level: "intermediate",
      language: "en",
      grade: "Class 11-12",
      duration: "8 weeks",
      is_free: false,
      price: 1800,
      discount_price: 1499,
      publish_status: "published",
      modules: [
        {
          title_en: "Astrophysics Core",
          title_bn: "অ্যাস্ট্রোফিজিক্সের মূল ধারণা",
          lessons: [
            {
              title_en: "Radiation and Spectra",
              title_bn: "বিকিরণ ও স্পেকট্রা",
              contents: [
                {
                  type: "video",
                  video_data: { url: "https://youtu.be/Cc0mOg2uyTc" },
                },
              ],
            },
            {
              title_en: "Stars and Evolution",
              title_bn: "নক্ষত্র ও বিবর্তন",
              contents: [
                {
                  type: "video",
                  video_data: { url: "https://youtu.be/-s4ZWBnDW-0" },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title_en: "Olympiad Prep: Astronomy Problem Solving",
      title_bn: "অলিম্পিয়াড প্রস্তুতি: অ্যাস্ট্রোনমি সমস্যা সমাধান",
      subtitle_en: "Targeted training for olympiad-style astronomy questions.",
      subtitle_bn:
        "অলিম্পিয়াড ধাঁচের অ্যাস্ট্রোনমি সমস্যার লক্ষ্যভিত্তিক প্রস্তুতি।",
      slug: "olympiad-prep-astronomy-problem-solving",
      category_slug: "olympiad-prep",
      intro_video_url: "https://youtu.be/8Q0PcvOR1SA",
      description_en:
        "Build analytical speed and confidence with curated olympiad problems and guided solutions.",
      description_bn:
        "নির্বাচিত সমস্যা ও ধাপে ধাপে সমাধানের মাধ্যমে অলিম্পিয়াড প্রস্তুতি সম্পন্ন করুন।",
      requirements_en: ["School-level physics and math"],
      requirements_bn: ["স্কুল-স্তরের পদার্থবিজ্ঞান ও গণিত"],
      learning_objectives_en: [
        "Solve olympiad-level astronomy numericals",
        "Improve timed problem-solving strategy",
      ],
      learning_objectives_bn: [
        "অলিম্পিয়াড-লেভেলের সংখ্যাত্মক সমস্যা সমাধান করা",
        "সময়ভিত্তিক সমস্যা সমাধানের দক্ষতা বাড়ানো",
      ],
      targeted_audience_en: ["Olympiad aspirants"],
      targeted_audience_bn: ["অলিম্পিয়াড প্রস্তুতিপ্রার্থী শিক্ষার্থী"],
      faqs: [],
      instructor_index: 1,
      level: "advanced",
      language: "en",
      grade: "Class 8-12",
      duration: "10 weeks",
      is_free: false,
      price: 2200,
      discount_price: 1899,
      publish_status: "published",
      modules: [
        {
          title_en: "Problem Solving Drills",
          title_bn: "সমস্যা সমাধান অনুশীলন",
          lessons: [
            {
              title_en: "Astronomical Numbers Drill",
              title_bn: "জ্যোতির্বৈজ্ঞানিক সংখ্যা অনুশীলন",
              contents: [
                {
                  type: "video",
                  video_data: { url: "https://youtu.be/8Q0PcvOR1SA" },
                },
              ],
            },
            {
              title_en: "Planetary Motion Challenge",
              title_bn: "গ্রহগতির সমস্যা",
              contents: [
                {
                  type: "video",
                  video_data: { url: "https://youtu.be/wmxvggYnLcU" },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title_en: "Night Sky Observation Workshop",
      title_bn: "রাতের আকাশ পর্যবেক্ষণ কর্মশালা",
      subtitle_en: "Hands-on guide to planning and recording sky observations.",
      subtitle_bn:
        "আকাশ পর্যবেক্ষণ পরিকল্পনা ও রেকর্ড করার হাতে-কলমে নির্দেশনা।",
      slug: "night-sky-observation-workshop",
      category_slug: "observation",
      intro_video_url: "https://youtu.be/i3lJakBgQpI",
      description_en:
        "Learn practical stargazing techniques, constellation tracking, and observation journaling workflows.",
      description_bn:
        "নক্ষত্র পর্যবেক্ষণ কৌশল, নক্ষত্রমণ্ডল শনাক্তকরণ এবং পর্যবেক্ষণ জার্নালিং শিখুন।",
      requirements_en: ["Clear sky access", "Basic smartphone camera"],
      requirements_bn: [
        "পরিষ্কার আকাশে পর্যবেক্ষণের সুযোগ",
        "প্রাথমিক স্মার্টফোন ক্যামেরা",
      ],
      learning_objectives_en: [
        "Identify key constellations",
        "Create useful observation logs",
      ],
      learning_objectives_bn: [
        "গুরুত্বপূর্ণ নক্ষত্রমণ্ডল শনাক্ত করা",
        "কার্যকর পর্যবেক্ষণ লগ তৈরি করা",
      ],
      targeted_audience_en: ["Beginner observers", "Amateur skywatchers"],
      targeted_audience_bn: ["বিগিনার পর্যবেক্ষক", "শখের আকাশ পর্যবেক্ষক"],
      faqs: [],
      instructor_index: 1,
      level: "beginner",
      language: "bn",
      grade: "All",
      duration: "4 weeks",
      is_free: true,
      price: 0,
      discount_price: 0,
      publish_status: "published",
      modules: [
        {
          title_en: "Observation Practice",
          title_bn: "পর্যবেক্ষণ অনুশীলন",
          lessons: [
            {
              title_en: "Constellations in Practice",
              title_bn: "নক্ষত্রমণ্ডল চিহ্নিতকরণ",
              contents: [
                {
                  type: "video",
                  video_data: { url: "https://youtu.be/i3lJakBgQpI" },
                },
              ],
            },
            {
              title_en: "Tracking Meteorite Events",
              title_bn: "উল্কাপিণ্ড ঘটনা পর্যবেক্ষণ",
              contents: [
                {
                  type: "video",
                  video_data: { url: "https://youtu.be/m_mKuOkRXfs" },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title_en: "Cosmology Foundations",
      title_bn: "কসমোলজির ভিত্তি",
      subtitle_en:
        "Understand the origin, structure, and fate of the universe.",
      subtitle_bn: "মহাবিশ্বের উৎপত্তি, গঠন ও পরিণতি নিয়ে ভিত্তিমূলক আলোচনা।",
      slug: "cosmology-foundations",
      category_slug: "cosmology",
      intro_video_url: "https://youtu.be/fp41OMiJlYs",
      description_en:
        "Explore the big picture of the cosmos, including expansion, large-scale structures, and open cosmological questions.",
      description_bn:
        "মহাবিশ্বের সম্প্রসারণ, বৃহৎ-স্কেলের গঠন এবং কসমোলজির উন্মুক্ত প্রশ্নগুলো বুঝুন।",
      requirements_en: ["Basic astronomy awareness"],
      requirements_bn: ["জ্যোতির্বিজ্ঞানের প্রাথমিক ধারণা"],
      learning_objectives_en: [
        "Explain major cosmology models",
        "Understand observational evidence behind cosmology",
      ],
      learning_objectives_bn: [
        "প্রধান কসমোলজি মডেল ব্যাখ্যা করা",
        "কসমোলজির পর্যবেক্ষণভিত্তিক প্রমাণ বোঝা",
      ],
      targeted_audience_en: ["Curious learners and early researchers"],
      targeted_audience_bn: ["কৌতূহলী শিক্ষার্থী ও প্রারম্ভিক গবেষক"],
      faqs: [],
      instructor_index: 0,
      level: "intermediate",
      language: "en",
      grade: "University",
      duration: "7 weeks",
      is_free: false,
      price: 2000,
      discount_price: 1699,
      publish_status: "published",
      modules: [
        {
          title_en: "Cosmic Structures",
          title_bn: "মহাজাগতিক গঠন",
          lessons: [
            {
              title_en: "Galaxies and Clusters",
              title_bn: "গ্যালাক্সি ও ক্লাস্টার",
              contents: [
                {
                  type: "video",
                  video_data: { url: "https://youtu.be/fp41OMiJlYs" },
                },
              ],
            },
            {
              title_en: "Comets, Asteroids and Cosmic Debris",
              title_bn: "ধূমকেতু, গ্রহাণু ও মহাজাগতিক ধ্বংসাবশেষ",
              contents: [
                {
                  type: "video",
                  video_data: { url: "https://youtu.be/F2y3TPIap0U" },
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const courses: any[] = [];

  for (const definition of courseBlueprints) {
    const category = categoryBySlug.get(definition.category_slug);
    if (!category) {
      throw new Error(`Missing category for ${definition.category_slug}`);
    }

    const course = await CourseModel.create({
      title_en: definition.title_en,
      title_bn: definition.title_bn,
      subtitle_en: definition.subtitle_en,
      subtitle_bn: definition.subtitle_bn,
      slug: definition.slug,
      category_id: category.id,
      thumbnail: "",
      intro_video_url: definition.intro_video_url,
      description_en: definition.description_en,
      description_bn: definition.description_bn,
      requirements_en: definition.requirements_en,
      requirements_bn: definition.requirements_bn,
      learning_objectives_en: definition.learning_objectives_en,
      learning_objectives_bn: definition.learning_objectives_bn,
      targeted_audience_en: definition.targeted_audience_en,
      targeted_audience_bn: definition.targeted_audience_bn,
      faqs: definition.faqs,
      instructor_ids: [
        instructors[definition.instructor_index % instructors.length].id,
      ],
      level: definition.level,
      language: definition.language,
      grade: definition.grade,
      duration: definition.duration,
      total_lessons: 0,
      is_free: definition.is_free,
      price: definition.price,
      discount_price: definition.discount_price,
      publish_status: definition.publish_status,
    });

    let totalLessons = 0;

    for (
      let moduleIndex = 0;
      moduleIndex < definition.modules.length;
      moduleIndex += 1
    ) {
      const moduleDefinition = definition.modules[moduleIndex];
      const module = await CourseModuleModel.create({
        course_id: course.id,
        title_en: moduleDefinition.title_en,
        title_bn: moduleDefinition.title_bn,
        order_no: moduleIndex + 1,
      });

      for (
        let lessonIndex = 0;
        lessonIndex < moduleDefinition.lessons.length;
        lessonIndex += 1
      ) {
        const lessonDefinition = moduleDefinition.lessons[lessonIndex];
        const hasVideos = lessonDefinition.contents?.some(
          (c) => c.type === "video",
        );

        const lesson = await LessonModel.create({
          course_id: course.id,
          module_id: module.id,
          module_title_en: module.title_en,
          module_title_bn: module.title_bn,
          title_en: lessonDefinition.title_en,
          title_bn: lessonDefinition.title_bn,
          order_no: lessonIndex + 1,
          publish_status:
            definition.publish_status === "published" ? "published" : "draft",
        });

        let contentOrder = 1;

        if (lessonDefinition.contents) {
          for (const content of lessonDefinition.contents) {
            await LessonContentModel.create({
              course_id: course.id,
              lesson_id: lesson.id,
              type: content.type,
              order_no: contentOrder++,
              video_data: content.video_data,
              pdf_data: content.pdf_data,
              quiz_data: content.quiz_data,
              unlock_condition:
                moduleIndex === 0 && lessonIndex === 0 && contentOrder === 2
                  ? "auto_unlock"
                  : "after_previous_completed",
            });
          }
        }

        totalLessons += 1;
      }
    }

    course.total_lessons = totalLessons;
    await course.save();
    courses.push(course);
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

  await CouponModel.create({
    code: "ASTRO10",
    discount_type: "percentage",
    discount_value: 10,
    max_redemption: 200,
    expires_at: new Date(Date.now() + 45 * 86400000).toISOString(),
    is_active: true,
  });

  await BlogModel.insertMany([
    {
      title_en: "How to Start Stargazing in 2026",
      title_bn: "২০২৬ সালে স্টারগেজিং শুরু করবেন কীভাবে",
      content_en:
        "A practical guide for beginners to start stargazing with minimal equipment and clear routines.",
      content_bn:
        "কম যন্ত্রপাতি দিয়ে নিয়মিত স্টারগেজিং শুরু করার একটি বাস্তবধর্মী গাইড।",
      category: "Astronomy Tips",
      tags: ["astronomy", "beginner"],
      featured_image: "",
      seo_title: "How to Start Stargazing",
      seo_description: "Beginner-friendly stargazing guide.",
      slug: "how-to-start-stargazing",
      author: instructors[1].name,
      publish_status: "published",
    },
    {
      title_en: "Top 5 Olympiad Astronomy Mistakes",
      title_bn: "অলিম্পিয়াড অ্যাস্ট্রোনমিতে ৫টি সাধারণ ভুল",
      content_en:
        "Common preparation mistakes and how to avoid them while training for olympiad astronomy.",
      content_bn:
        "অলিম্পিয়াড প্রস্তুতিতে প্রচলিত ভুল এবং সেগুলো এড়ানোর কৌশল।",
      category: "Olympiad Prep",
      tags: ["olympiad", "strategy"],
      featured_image: "",
      seo_title: "Olympiad Astronomy Mistakes",
      seo_description:
        "Avoid common mistakes in astronomy olympiad preparation.",
      slug: "top-5-olympiad-astronomy-mistakes",
      author: instructors[1].name,
      publish_status: "published",
    },
    {
      title_en: "Understanding Galaxies in Simple Terms",
      title_bn: "সহজ ভাষায় গ্যালাক্সি বোঝা",
      content_en:
        "A clear explanation of galaxy types, structures, and why galaxies matter in modern astronomy.",
      content_bn:
        "গ্যালাক্সির ধরন, গঠন এবং আধুনিক জ্যোতির্বিজ্ঞানে এর গুরুত্ব নিয়ে সহজ আলোচনা।",
      category: "Astrophysics",
      tags: ["galaxy", "astrophysics"],
      featured_image: "",
      seo_title: "Understanding Galaxies",
      seo_description:
        "Simple explanation of galaxies and their role in astronomy.",
      slug: "understanding-galaxies-in-simple-terms",
      author: instructors[0].name,
      publish_status: "published",
    },
  ]);

  const events = await EventModel.insertMany([
    {
      title_en: "Night Sky Observation Camp",
      slug: "night-sky-observation-camp",
      title_bn: "নাইট স্কাই অবজারভেশন ক্যাম্প",
      description_en:
        "Join a guided observation session with live constellation mapping and telescope practice.",
      description_bn:
        "লাইভ নক্ষত্রমণ্ডল ম্যাপিং ও টেলিস্কোপ অনুশীলনসহ গাইডেড পর্যবেক্ষণ সেশন।",
      banner: "",
      event_date: new Date(Date.now() + 8 * 86400000).toISOString(),
      registration_fee: 500,
      max_participants: 120,
      registered_count: 0,
      publish_status: "published",
    },
    {
      title_en: "Astronomy Olympiad Strategy Session",
      slug: "astronomy-olympiad-strategy-session",
      title_bn: "অ্যাস্ট্রোনমি অলিম্পিয়াড স্ট্র্যাটেজি সেশন",
      description_en:
        "Focused strategy session for olympiad candidates with mock problem walkthroughs.",
      description_bn:
        "অলিম্পিয়াড শিক্ষার্থীদের জন্য মক সমস্যা সমাধানসহ কৌশলভিত্তিক সেশন।",
      banner: "",
      event_date: new Date(Date.now() + 16 * 86400000).toISOString(),
      registration_fee: 0,
      max_participants: 200,
      registered_count: 0,
      publish_status: "published",
    },
  ]);

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
      publish_status: "published",
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
        {
          id: "sl_1",
          platform: "facebook",
          url: "https://facebook.com/astronomy-pathshala",
        },
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
