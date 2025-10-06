// src/pages/api/send-intranet-post.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("Content-Type") !== "application/json") {
    return new Response(JSON.stringify({ error: "Unsupported Media Type" }), { status: 415 });
  }

  try {
    const { title, content } = await request.json();

    if (!title || !content) {
      return new Response(JSON.stringify({ error: "Title and content are required." }), { status: 400 });
    }

    // Use the same relative URL as your other API files
    const functionUrl = '/.netlify/functions/send-email';

    const response = await fetch(new URL(functionUrl, request.url), { // Use new URL() to resolve the relative path correctly
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailType: 'intranetPostNotification',
        payload: { title, content },
      }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Netlify function failed:", errorBody);
        throw new Error(`The email sending service failed.`);
    }

    return new Response(JSON.stringify({ success: true, message: "Email notification triggered successfully." }), { status: 200 });

  } catch (error) {
    console.error("API error in /api/send-intranet-post:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return new Response(JSON.stringify({ error: "Failed to send intranet post email.", details: errorMessage }), { status: 500 });
  }
};