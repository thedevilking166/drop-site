import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const backendRes = await fetch("http://localhost:4000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await backendRes.text();

  return new Response(data, {
    status: backendRes.status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
