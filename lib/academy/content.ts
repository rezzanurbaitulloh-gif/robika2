import jsDasarKode from "@/content/academy/js_dasar_kode.json";

/** D09 — konten academy data-driven. */

export interface LessonBlock {
  type: "text" | "code" | "quiz" | "exercise" | "practice";
  body_key?: string;
  code?: string;
  question_key?: string;
  options?: string[];
  correctIndex?: number;
  explain_key?: string;
  instruction_key?: string;
  fnName?: string;
  starter?: string;
  expect?: { args: unknown[]; equals: unknown };
  text_key?: string;
  questHint?: string;
}

export interface LessonDef {
  id: string;
  title_key: string;
  blocks: LessonBlock[];
  outcomes: { skills: string[]; xp: number };
}

export interface ChapterDef {
  id: string;
  title_key: string;
  lessons: LessonDef[];
}

export interface CourseDef {
  id: string;
  title_key: string;
  language: string;
  description_key: string;
  support?: { content?: boolean; editor?: boolean; execution?: boolean; offline?: boolean };
  chapters: ChapterDef[];
}

const courses: Record<string, CourseDef> = {
  js_dasar_kode: jsDasarKode as unknown as CourseDef,
};

export function getCourse(id: string): CourseDef | undefined {
  return courses[id];
}

export function allCourses(): CourseDef[] {
  return Object.values(courses);
}

export function findLesson(
  course: string,
  chapter: string,
  lesson: string
): { course: CourseDef; chapter: ChapterDef; lesson: LessonDef } | undefined {
  const c = getCourse(course);
  const ch = c?.chapters.find((x) => x.id === chapter);
  const l = ch?.lessons.find((x) => x.id === lesson);
  if (!c || !ch || !l) return undefined;
  return { course: c, chapter: ch, lesson: l };
}
