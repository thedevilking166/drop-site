import { NextResponse } from "next/server";
import B2 from "backblaze-b2";

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID!,
  applicationKey: process.env.B2_APP_KEY!,
});

let isAuthorized = false;
let authExpiresAt = 0;

async function ensureAuthorized() {
  const now = Date.now();
  if (!isAuthorized || now > authExpiresAt - 60_000) {
    await b2.authorize();
    authExpiresAt = now + 23 * 60 * 60 * 1000;
    isAuthorized = true;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");

  if (!file) {
    return new NextResponse("Missing file", { status: 400 });
  }

  await ensureAuthorized();

  const auth = await b2.getDownloadAuthorization({
    bucketId: process.env.B2_BUCKET_ID!,
    fileNamePrefix: file,
    validDurationInSeconds: 300,
  });

  const signedUrl =
    `https://${process.env.B2_DOWNLOAD_HOST}` +
    `/file/${process.env.B2_BUCKET_NAME}/${encodeURIComponent(file)}` +
    `?Authorization=${auth.data.authorizationToken}`;

  return NextResponse.redirect(signedUrl, {
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}
