import type { NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { searchParams } = new URL(request.url);
  const collection = searchParams.get("collection");

  if (!collection) {
    return new Response(JSON.stringify({ error: "Missing collection" }), {
      status: 400,
    });
  }

  const body = await request.json();

  const backendRes = await fetch(
    `http://localhost:4000/urls/${id}?collection=${collection}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const text = await backendRes.text();

  return new Response(text, {
    status: backendRes.status,
    headers: { "Content-Type": "application/json" },
  });
}
