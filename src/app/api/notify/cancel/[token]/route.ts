import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.redirect(new URL("/dashboard?cancel=error", request.url));
  }

  // In production – look up the token in a DB, mark the rule as cancelled.
  // For demo, we return a success HTML page.
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AutoFi – Automation Cancelled</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #050a18; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #0d1526; border: 1px solid rgba(99,102,241,0.2); border-radius: 16px; padding: 40px; text-align: center; max-width: 400px; }
    .icon { font-size: 56px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px; color: #e2e8f0; }
    p { color: #94a3b8; font-size: 15px; margin: 0 0 24px; }
    a { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>Automation Cancelled</h1>
    <p>Your scheduled automation has been cancelled successfully. No funds were moved.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard">Go to Dashboard</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
