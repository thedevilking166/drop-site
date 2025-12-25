export async function GET(req: Request) {
  const res = await fetch(
    "http://localhost:4000/urls" + new URL(req.url).search
  );
  return new Response(await res.text(), {
    headers: { "Content-Type": "application/json" },
  });
}
