import type { NextRequest } from "next/server";

export async function DELETE(
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

  const backendRes = await fetch(
    `http://localhost:4000/urls/${id}?collection=${collection}`,
    { method: "DELETE" }
  );

  const body = await backendRes.text();

  return new Response(body, {
    status: backendRes.status,
    headers: { "Content-Type": "application/json" },
  });
}
