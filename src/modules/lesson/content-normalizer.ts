type NormalizedContentType =
  | "video"
  | "pdf"
  | "quiz"
  | "assignment"
  | "resource";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeContentType(value: unknown): NormalizedContentType | null {
  if (value === "note") {
    return "pdf";
  }

  if (
    value === "video" ||
    value === "pdf" ||
    value === "quiz" ||
    value === "assignment" ||
    value === "resource"
  ) {
    return value;
  }

  return null;
}

function detectVideoProvider(url: string): string {
  const normalizedUrl = url.toLowerCase();

  if (normalizedUrl.includes("youtu")) {
    return "youtube";
  }

  if (normalizedUrl.includes("vimeo")) {
    return "vimeo";
  }

  return "";
}

export function normalizeLessonContentDocument(
  content: Record<string, unknown>,
): Record<string, unknown> {
  const type = normalizeContentType(content.type) ?? "resource";
  const videoData = asRecord(content.video_data);
  const pdfData = asRecord(content.pdf_data);
  const quizData = asRecord(content.quiz_data);
  const videoUrl = readString(
    videoData?.url,
    readString(content.video_url, readString(content.youtube_unlisted_url)),
  );
  const pdfTitleEn = readString(pdfData?.title_en, readString(content.note_title_en));
  const pdfTitleBn = readString(
    pdfData?.title_bn,
    readString(content.note_title_bn, pdfTitleEn),
  );
  const quizQuestions = Array.isArray(quizData?.questions)
    ? quizData.questions
    : Array.isArray(content.quiz_questions)
      ? content.quiz_questions
      : [];

  return {
    ...content,
    type,
    is_preview: readBoolean(content.is_preview, false),
    unlock_condition: readString(
      content.unlock_condition,
      "after_previous_completed",
    ),
    video_data:
      type === "video"
        ? {
            url: videoUrl,
            duration: readString(
              videoData?.duration,
              readString(content.video_duration, readString(content.duration)),
            ),
            provider: readString(videoData?.provider, detectVideoProvider(videoUrl)),
            thumbnail: readString(
              videoData?.thumbnail,
              readString(content.video_thumbnail),
            ),
          }
        : undefined,
    pdf_data:
      type === "pdf"
        ? {
            file_url: readString(pdfData?.file_url, readString(content.note_pdf_url)),
            downloadable: readBoolean(
              pdfData?.downloadable,
              readBoolean(content.note_downloadable),
            ),
            title_en: pdfTitleEn,
            title_bn: pdfTitleBn,
          }
        : undefined,
    quiz_data:
      type === "quiz"
        ? {
            title: readString(quizData?.title, readString(content.quiz_title)),
            time_limit: readNumber(
              quizData?.time_limit,
              readNumber(content.quiz_time_limit),
            ),
            pass_mark: readNumber(
              quizData?.pass_mark,
              readNumber(content.quiz_pass_mark, 70),
            ),
            questions: quizQuestions,
          }
        : undefined,
  };
}
