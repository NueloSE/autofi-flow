import { NextRequest, NextResponse } from "next/server";
import { sendPreExecutionAlert } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, ruleType, ruleDescription, executionTime, amount } = body;

    if (!email || !ruleType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate cancel token
    const cancelToken = crypto
      .createHmac("sha256", process.env.CANCEL_TOKEN_SECRET || "dev-secret")
      .update(`${email}-${ruleType}-${executionTime}`)
      .digest("hex");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cancelUrl = `${appUrl}/api/notify/cancel/${cancelToken}`;

    const formattedTime = new Date(executionTime).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Send email via Resend
    if (process.env.RESEND_API_KEY) {
      await sendPreExecutionAlert({
        to: email,
        ruleType,
        ruleDescription,
        executionTime: formattedTime,
        cancelUrl,
        token: cancelToken,
        amount,
      });
    } else {
      // Development mode: log the email
      console.log("[AutoFi Email] Pre-execution alert would be sent to:", email);
      console.log("[AutoFi Email] Rule:", ruleDescription);
      console.log("[AutoFi Email] Execution time:", formattedTime);
      console.log("[AutoFi Email] Cancel URL:", cancelUrl);
    }

    return NextResponse.json({
      success: true,
      message: "Notification scheduled",
      cancelToken,
    });
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return NextResponse.json({ error: "Failed to schedule notification" }, { status: 500 });
  }
}
