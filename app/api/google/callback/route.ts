import { exchangeCodeForToken, setSetting } from '@/app/lib/googlesheets';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return new Response(`Authentication failed: ${error}`, { status: 400 });
    }

    if (!code) {
      return new Response('No authorization code received', { status: 400 });
    }

    const { accessToken, refreshToken } = await exchangeCodeForToken(code);

    if (!accessToken) {
      return new Response('Failed to get access token', { status: 400 });
    }

    setSetting('google_access_token', accessToken);
    setSetting('google_refresh_token', refreshToken);
    setSetting('google_sheets_enabled', 'true');

    // Return HTML that closes the popup and notifies the parent
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Google Sheets Connected</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: green; }
        </style>
      </head>
      <body>
        <h1 class="success">✓ Google Sheets Connected!</h1>
        <p>Your Google account has been successfully connected.</p>
        <p>You can now close this window and return to the dashboard.</p>
        <script>
          // Notify parent window and close after 2 seconds
          if (window.opener) {
            window.opener.location.reload();
          }
          setTimeout(() => { window.close(); }, 2000);
        </script>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (error) {
    console.error('Google callback error:', error);
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: Arial; padding: 50px;">
        <h1>❌ Connection Failed</h1>
        <p>Error: ${String(error)}</p>
        <p><a href="javascript:window.close()">Close this window</a></p>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
}
