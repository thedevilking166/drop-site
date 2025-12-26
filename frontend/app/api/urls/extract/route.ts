import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { url_id } = body;

  const { searchParams } = new URL(req.url);
  const collection = searchParams.get("collection") ?? "new-posts";

  const res = await fetch(
    `http://localhost:4000/urls/extract?collection=${collection}&url_id=${url_id}`,
    { method: "POST" }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Extract failed" },
      { status: res.status }
    );
  }

  return NextResponse.json({ success: true });
}
