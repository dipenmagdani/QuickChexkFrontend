import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ status: "error", message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { user_email, datetime, type } = body;

  if (!user_email || !datetime || !type) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Missing required fields: user_email, datetime, type",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!["check_in", "check_out"].includes(type)) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Invalid type. Must be 'check_in' or 'check_out'",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const externalApiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/mark", "");
  if (!externalApiUrl) {
    return new Response(
      JSON.stringify({ status: "error", message: "API URL not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const response = await fetch(`${externalApiUrl}/attendance/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_email, datetime, type }),
      cache: "no-store",
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error calling manual attendance API:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to connect to backend API",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
