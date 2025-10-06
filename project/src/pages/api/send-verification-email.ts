// src/pages/api/send-verification-email.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  if (request.headers.get("Content-Type") !== "application/json") {
    return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  }

  try {
    const { email, name } = await request.json();
    if (!email || !name) {
      return new Response(JSON.stringify({ error: "Email and name are required." }), { status: 400 });
    }

    const functionUrl = '/.netlify/functions/send-email';

    const response = await fetch(new URL(functionUrl, request.url), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailType: 'userVerified',
        payload: { email, name },
      }),
    });

    if (!response.ok) {
      throw new Error("Netlify function for sending email failed.");
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error("API Error in send-verification-email:", error);
    return new Response(JSON.stringify({ error: "Failed to trigger verification email." }), { status: 500 });
  }
};