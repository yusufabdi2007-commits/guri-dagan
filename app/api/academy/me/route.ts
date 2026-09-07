import { NextRequest, NextResponse } from "next/server";
import { getStudentFromSession } from "@/lib/academy-auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getStudentFromSession(req);
    if (!session) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    const { student, supabase } = session;

    const [{ data: allChapters }, { data: examResults }] = await Promise.all([
      supabase
        .from("academy_chapters")
        .select("id, week_number, title, body, file_url, zoom_link, zoom_time")
        .eq("track_id", student.track_id)
        .order("week_number", { ascending: true }),
      supabase
        .from("academy_exam_results")
        .select("chapter_id, score, total, passed")
        .eq("student_id", student.id),
    ]);

    const resultsByChapter = new Map((examResults || []).map(r => [r.chapter_id, r]));

    const chapters = (allChapters || []).map(ch => {
      const unlocked = ch.week_number <= student.current_week;
      return {
        id: ch.id,
        week_number: ch.week_number,
        title: ch.title,
        unlocked,
        body: unlocked ? ch.body : null,
        file_url: unlocked ? ch.file_url : null,
        zoom_link: unlocked ? ch.zoom_link : null,
        zoom_time: unlocked ? ch.zoom_time : null,
        exam_result: resultsByChapter.get(ch.id) || null,
      };
    });

    return NextResponse.json({
      student: {
        name: student.name,
        status: student.status,
        current_week: student.current_week,
        track: student.academy_tracks,
      },
      chapters,
    });
  } catch (err) {
    console.error("Academy /me route error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
