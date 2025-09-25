import { NextResponse, type NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  DEFAULT_ITEM_QUERY_PARAMS,
  DEFAULT_TASK_QUERY_PARAMS,
} from "./constants";

export const DEVICE_UUID_COOKIE_NAME = "device_uuid";
export const ITEM_QUERY_COOKIE = "items_query";
export const TASK_QUERY_COOKIE = "tasks_query";

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

  if (!req.cookies.get(ITEM_QUERY_COOKIE)) {
    res.cookies.set({
      name: DEVICE_UUID_COOKIE_NAME,
      value: JSON.stringify(DEFAULT_ITEM_QUERY_PARAMS),
      httpOnly: false,
      secure: true,
      maxAge: 3600 * 24 * 3650,
      path: "/",
    });
  }

  if (!req.cookies.get(TASK_QUERY_COOKIE)) {
    res.cookies.set({
      name: DEVICE_UUID_COOKIE_NAME,
      value: JSON.stringify(DEFAULT_TASK_QUERY_PARAMS),
      httpOnly: false,
      secure: true,
      maxAge: 3600 * 24 * 3650,
      path: "/",
    });
  }

  return res;
}
