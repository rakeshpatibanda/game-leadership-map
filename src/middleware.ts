import { NextRequest, NextResponse } from "next/server";

const realm = 'GameLeadershipMap Admin';

const adminUser = process.env.ADMIN_USER;
const adminPass = process.env.ADMIN_PASS;

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${realm}", charset="UTF-8"`,
    },
  });
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (!adminUser || !adminPass) {
    console.warn(
      "ADMIN_USER/ADMIN_PASS not configured; admin route left unprotected.",
    );
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Basic ")) {
    return unauthorized();
  }

  const decoded = Buffer.from(auth.slice(6), "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");

  if (user !== adminUser || pass !== adminPass) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

