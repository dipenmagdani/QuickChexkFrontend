import { NextRequest } from 'next/server';

// IMPORTANT: Ensure NEXT_PUBLIC_INTERNAL_API_SECRET is set in your .env.local file
const SHARED_INTERNAL_SECRET = process.env.NEXT_PUBLIC_INTERNAL_API_SECRET;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const user_email = searchParams.get('user_email');
  const quickchex_pass = searchParams.get('quickchex_pass');
  const gmail_app_password = searchParams.get('gmail_app_password');
  // Extract cookie values from query parameters
  const _quikchex_app_session = searchParams.get('_quikchex_app_session');
  const remember_user_token = searchParams.get('remember_user_token');

  if (!user_email || !quickchex_pass || !gmail_app_password) {
    return new Response(JSON.stringify({ status: 'error', message: 'Missing credentials' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // IMPORTANT: Ensure NEXT_PUBLIC_API_URL is set in your .env file for this project-remix directory
  // This URL should point to your FastAPI's /mark endpoint e.g., https://quickchexapi.onrender.com/mark
  const externalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!externalApiUrl) {
    console.error("API URL (NEXT_PUBLIC_API_URL) is not configured in .env");
    return new Response(JSON.stringify({ status: 'error', message: 'API URL not configured on server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // const params = new URLSearchParams({ // Removed: Parameters will be sent in POST body
  //   user_email,
  //   quickchex_pass,
  //   gmail_app_password,
  // });

  // const fullExternalUrl = `${externalApiUrl}?${params.toString()}`; // Removed
  console.log(`Proxying POST request to external API: ${externalApiUrl}`);

  try {
    const requestBody: any = {
      user_email,
      quickchex_pass,
      gmail_app_password,
    };

    // Add cookies to request body if they exist
    if (_quikchex_app_session) {
      requestBody._quikchex_app_session = _quikchex_app_session;
    }
    if (remember_user_token) {
      requestBody.remember_user_token = remember_user_token;
    }

    const response = await fetch(externalApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`External API Error (${externalApiUrl}): ${response.status}`, errorText);
      return new Response(JSON.stringify({ status: 'error', message: `External API Error: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) {
          console.error('External API response body is null');
          controller.close();
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('External API stream finished.');
              break;
            }
            const chunk = decoder.decode(value, { stream: true });
            // console.log('Received chunk from external API:', chunk); // For debugging
            
            // Split by newline, as SSE messages are separated by \n\n, but chunks might not align perfectly.
            const potentialMessages = chunk.split(/\r\n|\r|\n/);

            for (const part of potentialMessages) {
              if (part.trim() === '') continue;
              // Ensure each message sent to client is correctly SSE formatted.
              // The external API might already send `data: ...` or just JSON objects.
              let sseMessage = part.trim();
              if (!sseMessage.startsWith('data:')) {
                // Attempt to parse to see if it's JSON, otherwise wrap as is.
                try {
                  JSON.parse(sseMessage); // Validate if it's JSON
                  sseMessage = `data: ${sseMessage}`;
                } catch (e) {
                  // Not JSON, could be a plain string or already part of an SSE message.
                  // If it doesn't look like an SSE field (e.g., id:, event:), wrap it in data:
                  if (!sseMessage.match(/^(id:|event:|retry:)/)) {
                     sseMessage = `data: ${sseMessage}`;
                  }
                }
              }
              // console.log('Sending SSE message to client:', sseMessage + \n\n'); // For debugging
              controller.enqueue(encoder.encode(`${sseMessage}\n\n`));
            }
          }
        } catch (error) {
          console.error("Streaming error to client:", error);
          controller.error(error);
        } finally {
          reader.releaseLock();
          controller.close();
          console.log('Client stream closed.');
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Useful for Nginx if it's in front
      },
    });

  } catch (error) {
    console.error('Error fetching from external API:', error);
    return new Response(JSON.stringify({ status: 'error', message: 'Failed to connect to external API proxy' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 