import nodemailer from 'nodemailer';
import { readDB, writeDB } from './db.js';

// Helper: Append an audit log of sent emails to the database
function logEmailEntry(recipient, subject, type, status, errorMsg = '') {
  try {
    const db = readDB();
    if (!db.emailLogs) db.emailLogs = [];

    db.emailLogs.unshift({
      id: 'msg_' + Date.now().toString(36),
      sentAt: new Date().toISOString(),
      recipient,
      subject,
      type, // 'test', 'completed', 'scheduled', 'failed'
      status, // 'success', 'failed'
      error: errorMsg
    });

    // Cap at 100 entries to prevent DB size bloat
    if (db.emailLogs.length > 100) {
      db.emailLogs = db.emailLogs.slice(0, 100);
    }

    writeDB(db);
  } catch (err) {
    console.error('[Mail Service Logger Error] Failed to log email entry:', err.message);
  }
}

// Helper: Create transporter dynamically based on current settings or overrides
function createTransporter(settingsOverride = null) {
  const db = readDB();
  const settings = settingsOverride || db.settings;

  if (!settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPass) {
    throw new Error('SMTP configuration settings are incomplete.');
  }

  // Parse port to number
  const port = parseInt(settings.smtpPort, 10);
  
  // SMTP Configuration
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: port,
    secure: settings.smtpSecure === true || settings.smtpSecure === 'true' || port === 465, // true for 465, false for others
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass
    },
    // Prevent self-signed certificate errors for local configs
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Helper: Generates beautiful responsive HTML template wrapping email body
function getBaseHtmlTemplate(badgeText, badgeColor, contentHtml) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>YouTube Manager Alert</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #05070f;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #f8fafc;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 30px 15px;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .logo {
          background-color: #ff2e55;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: inline-block;
          text-align: center;
          line-height: 32px;
          font-weight: bold;
          color: #ffffff;
          font-size: 16px;
        }
        .brand-text {
          font-size: 18px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: -0.02em;
        }
        .card {
          background-color: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 6px 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          background-color: ${badgeColor};
          color: #ffffff;
        }
        h1 {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 15px;
          line-height: 1.3;
        }
        p {
          font-size: 14px;
          line-height: 1.6;
          color: #94a3b8;
          margin-top: 0;
          margin-bottom: 15px;
        }
        .details-box {
          background-color: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 16px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          font-size: 13px;
        }
        .detail-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        .detail-row:first-child {
          padding-top: 0;
        }
        .detail-label {
          color: #64748b;
          font-weight: 600;
        }
        .detail-val {
          color: #ffffff;
          font-weight: 500;
          text-align: right;
          max-width: 60%;
          word-break: break-all;
        }
        .btn {
          display: block;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 10px;
          margin-top: 25px;
          transition: transform 0.2s ease;
        }
        .btn-primary {
          background: linear-gradient(135deg, #ff2e55 0%, #d946ef 100%);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(255, 46, 85, 0.3);
        }
        .btn-success {
          background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
          color: #ffffff;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 11px;
          color: #475569;
        }
        .footer a {
          color: #ff2e55;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">▶</div>
          <span class="brand-text">YouTube Manager</span>
        </div>
        <div class="card">
          <div class="badge">${badgeText}</div>
          ${contentHtml}
        </div>
        <div class="footer">
          Sent by <a href="#">YouTube Manager Dashboard</a> local server.<br>
          Configure email preferences in your app's Settings panel.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatch test email to verify configuration
 */
export async function sendTestEmail(tempSettings) {
  const recipient = tempSettings.smtpRecipient || tempSettings.smtpUser;
  if (!recipient) {
    throw new Error('Recipient email address is required.');
  }

  const transporter = createTransporter(tempSettings);
  const badgeText = 'smtp integration success';
  const badgeColor = '#06b6d4'; // Cyan
  
  const contentHtml = `
    <h1>SMTP Connection Test Successful</h1>
    <p>Congratulations! Your SMTP configuration settings for YouTube Manager are fully functional.</p>
    <p>Going forward, you will receive notifications here about your video compilation updates, upload results, and background tasks.</p>
    <div class="details-box">
      <div class="detail-row">
        <span class="detail-label">SMTP Host</span>
        <span class="detail-val">${tempSettings.smtpHost}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Port</span>
        <span class="detail-val">${tempSettings.smtpPort}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Secure SSL/TLS</span>
        <span class="detail-val">${tempSettings.smtpSecure ? 'Enabled' : 'Disabled'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Authorized Sender</span>
        <span class="detail-val">${tempSettings.smtpSender || tempSettings.smtpUser}</span>
      </div>
    </div>
    <p style="font-size: 12px; color: #475569; margin-bottom: 0;">This is an automated test message sent on client request. No reply is needed.</p>
  `;

  const html = getBaseHtmlTemplate(badgeText, badgeColor, contentHtml);

  try {
    await transporter.sendMail({
      from: `"${tempSettings.smtpSender ? 'YouTube Manager' : tempSettings.smtpUser}" <${tempSettings.smtpSender || tempSettings.smtpUser}>`,
      to: recipient,
      subject: `[YouTube Manager] SMTP Integration Test Successful`,
      html: html
    });
    
    logEmailEntry(recipient, `[YouTube Manager] SMTP Integration Test Successful`, 'test', 'success');
    return { success: true };
  } catch (error) {
    logEmailEntry(recipient, `[YouTube Manager] SMTP Integration Test Successful`, 'test', 'failed', error.message);
    throw error;
  }
}

/**
 * Send notification email for video uploads
 */
export async function sendUploadNotification(type, videoDetails, errorMsg = '') {
  const db = readDB();
  const settings = db.settings;

  // Verify SMTP is enabled and configured
  if (!settings.smtpNotificationsEnabled || !settings.smtpHost || !settings.smtpUser) {
    return { success: false, reason: 'Notifications disabled or SMTP not configured' };
  }

  const recipient = settings.smtpRecipient || settings.smtpUser;
  if (!recipient) {
    return { success: false, reason: 'Recipient email address missing' };
  }

  let subject = `[YouTube Manager] Video Notification - ${videoDetails.title}`;
  if (type === 'completed') {
    subject = `[YouTube Manager] Video Published Successfully - ${videoDetails.title}`;
  } else if (type === 'scheduled') {
    subject = `[YouTube Manager] Video Scheduled - ${videoDetails.title}`;
  } else if (type === 'failed') {
    subject = `[YouTube Manager] Video Upload Failed - ${videoDetails.title}`;
  }

  let transporter;
  try {
    transporter = createTransporter();
  } catch (err) {
    console.error('[Mail Service] Transporter creation failed:', err.message);
    logEmailEntry(recipient, subject, type, 'failed', `Transporter creation error: ${err.message}`);
    return { success: false, reason: err.message };
  }

  const formatLabel = videoDetails.format === 'long' ? '16:9 Widescreen Video' : '9:16 vertical Short';
  let badgeText = '';
  let badgeColor = '';
  let contentHtml = '';

  if (type === 'completed') {
    badgeText = 'Upload Successful';
    badgeColor = '#10b981'; // Emerald
    contentHtml = `
      <h1>Video Upload Completed</h1>
      <p>Your video has been successfully mixed, compiled, and published directly to your YouTube channel.</p>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Title</span>
          <span class="detail-val">${videoDetails.title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Format</span>
          <span class="detail-val">${formatLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Privacy Status</span>
          <span class="detail-val">Public (Immediate)</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Tags</span>
          <span class="detail-val">${videoDetails.tags || 'None'}</span>
        </div>
      </div>

      <a href="${videoDetails.youtubeUrl}" target="_blank" class="btn btn-success">View Uploaded Video</a>
    `;
  } else if (type === 'scheduled') {
    badgeText = 'Scheduled Upload';
    badgeColor = '#06b6d4'; // Cyan
    const scheduleDate = new Date(videoDetails.scheduledAt).toLocaleString();
    subject = `[YouTube Manager] Video Scheduled - ${videoDetails.title}`;
    contentHtml = `
      <h1>Video Scheduled for Upload</h1>
      <p>Your video has been uploaded and queued. YouTube will automatically publish it at the scheduled time.</p>
      
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Title</span>
          <span class="detail-val">${videoDetails.title}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Format</span>
          <span class="detail-val">${formatLabel}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Publish At</span>
          <span class="detail-val" style="color: #06b6d4; font-weight: bold;">${scheduleDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Privacy Status</span>
          <span class="detail-val">Private (Draft / Scheduled)</span>
        </div>
      </div>

      <a href="${videoDetails.youtubeUrl || '#'}" target="_blank" class="btn btn-primary">Check YouTube Link</a>
    `;
  } else if (type === 'failed') {
    badgeText = 'Upload Failure Alert';
    badgeColor = '#ef4444'; // Red
    subject = `[YouTube Manager] Video Upload Failed - ${videoDetails.title}`;
    contentHtml = `
      <h1 style="color: #ef4444;">Upload Operation Failed</h1>
      <p>An error was encountered while processing or uploading your compiled video to YouTube.</p>
      
      <div class="details-box" style="border-color: rgba(239, 68, 68, 0.2); background-color: rgba(239, 68, 68, 0.02);">
        <div class="detail-row">
          <span class="detail-label">Title</span>
          <span class="detail-val">${videoDetails.title}</span>
        </div>
        <div class="detail-row" style="flex-direction: column; align-items: flex-start; gap: 6px;">
          <span class="detail-label">Error Details</span>
          <span class="detail-val" style="color: #fca5a5; max-width: 100%; text-align: left; font-size: 12px; font-family: monospace;">
            ${errorMsg || 'Unknown compilation or api network timeout.'}
          </span>
        </div>
      </div>
      
      <p style="font-size: 13px;">Please check your server console log files, verify your internet connection, or make sure your YouTube OAuth credentials and daily upload limits haven't expired.</p>
    `;
  }

  const html = getBaseHtmlTemplate(badgeText, badgeColor, contentHtml);

  try {
    await transporter.sendMail({
      from: `"${settings.smtpSender ? 'YouTube Manager' : settings.smtpUser}" <${settings.smtpSender || settings.smtpUser}>`,
      to: recipient,
      subject: subject,
      html: html
    });
    console.log(`[Mail Service] Notification sent for "${videoDetails.title}"`);
    logEmailEntry(recipient, subject, type, 'success');
    return { success: true };
  } catch (err) {
    console.error(`[Mail Service] Failed to send notification email:`, err.message);
    logEmailEntry(recipient, subject, type, 'failed', err.message);
    return { success: false, reason: err.message };
  }
}
