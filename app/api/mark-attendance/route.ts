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

  const {
    user_email,
    quickchex_pass,
    gmail_app_password,
    _quikchex_app_session,
    remember_user_token,
  } = body;

  if (!user_email || !quickchex_pass || !gmail_app_password) {
    return new Response(
      JSON.stringify({ status: "error", message: "Missing credentials" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const externalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!externalApiUrl) {
    console.error("API URL (NEXT_PUBLIC_API_URL) is not configured");
    return new Response(
      JSON.stringify({ status: "error", message: "API URL not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const requestBody: any = { user_email, quickchex_pass, gmail_app_password };
    if (_quikchex_app_session)
      requestBody._quikchex_app_session = _quikchex_app_session;
    if (remember_user_token)
      requestBody.remember_user_token = remember_user_token;

    const response = await fetch(externalApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`External API Error: ${response.status}`, errorText);
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

    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          controller.close();
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const parts = chunk.split(/\r\n|\r|\n/);

            for (const part of parts) {
              if (part.trim() === "") continue;
              let sseMessage = part.trim();
              if (!sseMessage.startsWith("data:")) {
                try {
                  JSON.parse(sseMessage);
                  sseMessage = `data: ${sseMessage}`;
                } catch {
                  if (!sseMessage.match(/^(id:|event:|retry:)/)) {
                    sseMessage = `data: ${sseMessage}`;
                  }
                }
              }
              controller.enqueue(encoder.encode(`${sseMessage}\n\n`));
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("Error connecting to API:", error);
    return new Response(
      JSON.stringify({ status: "error", message: "Failed to connect to API" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
