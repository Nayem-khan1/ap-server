import mongoose from "mongoose";
import { connectDatabase } from "../src/config/database";
import { logger } from "../src/config/logger";
import { LessonModel, LessonContentModel } from "../src/modules/lesson/model";

async function runMigration() {
  logger.info("Connecting to database for curriculum migration...");
  await connectDatabase();

  logger.info("Starting Curriculum V1 to V2 Migration...");

  const allLessons = await LessonModel.find();
  logger.info(`Found ${allLessons.length} lessons to process.`);

  let migratedCount = 0;

  for (const lesson of allLessons) {
    logger.info(`Processing Lesson: ${lesson._id} (${lesson.title_en})`);
    let currentOrderNo = 1;

    // 1. Process Video
    if (lesson.youtube_unlisted_url || lesson.lesson_type === "video") {
      const existingVideo = await LessonContentModel.findOne({
        lesson_id: lesson._id,
        type: "video",
      });

      if (!existingVideo) {
        await LessonContentModel.create({
          course_id: lesson.course_id,
          lesson_id: lesson._id,
          type: "video",
          order_no: currentOrderNo,
          is_preview: false,
          video_data: {
            url: lesson.youtube_unlisted_url || "",
            provider: "youtube",
            duration: lesson.duration || "",
          },
          unlock_condition: "auto_unlock",
        });
        logger.info(` - Created Video Content for Lesson: ${lesson._id}`);
      } else {
        // Update existing V1 video content to V2 structure
        existingVideo.course_id = lesson.course_id;
        existingVideo.order_no = currentOrderNo;
        existingVideo.video_data = {
          url: existingVideo.video_url || lesson.youtube_unlisted_url || "",
          provider: "youtube",
          duration: existingVideo.video_duration || lesson.duration || "",
        };
        await existingVideo.save();
        logger.info(
          ` - Updated V1 Video Content to V2 for Lesson: ${lesson._id}`,
        );
      }
      currentOrderNo++;
    }

    // 2. Process Quiz
    if (lesson.quiz_id) {
      const existingQuiz = await LessonContentModel.findOne({
        _id: lesson.quiz_id,
        type: "quiz",
      });

      if (existingQuiz) {
        existingQuiz.course_id = lesson.course_id;
        existingQuiz.order_no = currentOrderNo;
        existingQuiz.quiz_data = {
          title: existingQuiz.quiz_title || "Quiz",
          time_limit: existingQuiz.quiz_time_limit || 0,
          pass_mark: existingQuiz.quiz_pass_mark || 70,
          questions: existingQuiz.quiz_questions || [],
        };
        await existingQuiz.save();
        logger.info(
          ` - Updated V1 Quiz Content to V2 for Lesson: ${lesson._id}`,
        );
        currentOrderNo++;
      }
    }

    // 3. Process Smart Note
    if (lesson.smart_note_id) {
      const existingNote = await LessonContentModel.findOne({
        _id: lesson.smart_note_id,
        type: "note",
      });

      if (existingNote) {
        existingNote.course_id = lesson.course_id;
        existingNote.order_no = currentOrderNo;
        existingNote.pdf_data = {
          file_url: existingNote.note_pdf_url || "",
          downloadable: existingNote.note_downloadable || false,
        };
        // carry over string titles to the standard title field if possible or keep them
        await existingNote.save();
        logger.info(
          ` - Updated V1 Smart Note Content to V2 for Lesson: ${lesson._id}`,
        );
        currentOrderNo++;
      }
    }

    migratedCount++;
  }

  logger.info(
    `Migration Complete! Successfully processed ${migratedCount} lessons.`,
  );
  process.exit(0);
}

runMigration().catch((error) => {
  logger.error("Migration failed:", error);
  process.exit(1);
});
