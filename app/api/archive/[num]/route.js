import { NextResponse } from "next/server";
import {
  getAllPages,
  archivePages,
  searchAllPages,
} from "../../../../lib/utils";

export async function POST(req, { params }) {
  const num = Number(params.num); // URL param
  const data = await req.json();
  const isArchive = data?.is_archive ?? false;

  // const allPages = await getAllPages(num);
  const allPages = await searchAllPages(num);
  console.log(
    "==================",
    allPages.map((p) => p.properties['물자번호'].title)
  );
  // const res = await archivePages(allPages, isArchive);

  return NextResponse.json({
    success: true,
  });
}
