import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user_email = searchParams.get("user_email");
  const days_back = searchParams.get("days_back") || "7";

  if (!user_email) {
    return new Response(
      JSON.stringify({ status: "error", message: "Missing user_email" }),
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
    const response = await fetch(
      `${externalApiUrl}/attendance/history/${encodeURIComponent(
        user_email
      )}?days_back=${days_back}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: `API Error: ${response.status}`,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching attendance history:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Failed to fetch history" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
