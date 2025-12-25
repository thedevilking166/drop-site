export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const collection = searchParams.get("collection");

  if (!collection) {
    return new Response(JSON.stringify({ error: "Missing collection" }), {
      status: 400,
    });
  }

  const backendRes = await fetch(
    `http://localhost:4000/urls/${params.id}?collection=${collection}`,
    { method: "DELETE" }
  );

  const body = await backendRes.text();

  return new Response(body, {
    status: backendRes.status,
    headers: { "Content-Type": "application/json" },
  });
}
