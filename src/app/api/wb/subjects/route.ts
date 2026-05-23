import { NextRequest, NextResponse } from "next/server";
import {
  getWbSubjectCharacteristics,
  getWbSubjects,
} from "@/lib/integrations/wb/content";

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  const result = subjectId
    ? await getWbSubjectCharacteristics(subjectId)
    : await getWbSubjects();

  return NextResponse.json(result);
}

