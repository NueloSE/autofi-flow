// Resend email helper
import { Resend } from "resend";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export interface PreExecutionAlertParams {
  to: string;
  ruleType: string;
  ruleDescription: string;
  executionTime: string;
  cancelUrl: string;
  token: string;
  amount: string;
}

export async function sendPreExecutionAlert(params: PreExecutionAlertParams) {
  const { to, ruleType, ruleDescription, executionTime, cancelUrl, amount } = params;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AutoFi Alert</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0f1e; color: #e2e8f0; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1px solid #1e2d4a; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center; }
    .logo { font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.5px; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; font-size: 12px; padding: 4px 12px; border-radius: 100px; margin-top: 8px; }
    .body { padding: 32px; }
    .rule-card { background: #1e2d4a; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366f1; }
    .rule-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }
    .rule-value { font-size: 18px; font-weight: 600; color: #e2e8f0; }
    .time-card { background: #1a2234; border-radius: 12px; padding: 16px 20px; margin: 16px 0; display: flex; align-items: center; gap: 12px; }
    .time-icon { font-size: 24px; }
    .time-label { font-size: 12px; color: #64748b; }
    .time-value { font-size: 15px; font-weight: 600; color: #a78bfa; }
    .cta-section { text-align: center; margin: 28px 0; }
    .cancel-btn { display: inline-block; background: #ef4444; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; }
    .footer { padding: 20px 32px; border-top: 1px solid #1e2d4a; text-align: center; font-size: 12px; color: #475569; }
    .amount { font-size: 32px; font-weight: 800; color: #6366f1; text-align: center; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">⚡ AutoFi</div>
      <div class="badge">Upcoming Automation Alert</div>
    </div>
    <div class="body">
      <p style="color:#94a3b8; font-size:15px; margin:0 0 16px;">An automated financial action is scheduled to execute soon.</p>
      
      <div class="amount">${amount}</div>
      
      <div class="rule-card">
        <div class="rule-label">Rule Type</div>
        <div class="rule-value">${ruleType.replace(/_/g, " ")}</div>
        <div style="margin-top:8px; font-size:14px; color:#94a3b8;">${ruleDescription}</div>
      </div>
      
      <div class="time-card">
        <div class="time-icon">🕐</div>
        <div>
          <div class="time-label">Scheduled Execution</div>
          <div class="time-value">${executionTime}</div>
        </div>
      </div>
      
      <div class="cta-section">
        <p style="color:#94a3b8; font-size:14px; margin-bottom:16px;">Want to cancel this automation before it runs?</p>
        <a href="${cancelUrl}" class="cancel-btn">Cancel This Automation</a>
        <p style="color:#475569; font-size:12px; margin-top:12px;">This link expires 1 hour before execution.</p>
      </div>
    </div>
    <div class="footer">
      &copy; 2025 AutoFi · Built on Flow Blockchain · <a href="#" style="color:#6366f1;">Manage Notifications</a>
    </div>
  </div>
</body>
</html>
`;

  const client = getResendClient();
  if (!client) {
    console.warn("[AutoFi] RESEND_API_KEY not set – email skipped.");
    return;
  }
  return client.emails.send({
    from: "AutoFi <alerts@autofi.app>",
    to,
    subject: `⚡ AutoFi Alert – ${ruleType.replace(/_/g, " ")} executing ${executionTime}`,
    html,
  });
}
