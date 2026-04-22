// app/api/role-settings/route.ts
import { NextResponse } from "next/server";

const DEFAULT_SETTINGS = [
  { roleName: 'DIRECTOR', isActive: true },
  { roleName: 'MANAGER', isActive: true },
  { roleName: 'BROKER', isActive: true },
  { roleName: 'PRE_SALES', isActive: true },
];

export async function GET() {
  return NextResponse.json({ settings: DEFAULT_SETTINGS });
}

export async function POST(request: Request) {
  // No-op: RoleSetting model not yet in schema
  return NextResponse.json({ success: true });
}
