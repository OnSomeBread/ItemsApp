import { NextResponse, type NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

const DEVICE_UUID_COOKIE_NAME = "device_uuid";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  if (!req.cookies.get(DEVICE_UUID_COOKIE_NAME)) {
    res.cookies.set({
      name: DEVICE_UUID_COOKIE_NAME,
      value: uuidv4(),
      httpOnly: true,
      secure: true,
      maxAge: 3600 * 24 * 3650,
      path: "/",
    });
  }

  return res;
}
