import { exchangeCodeForToken, setSetting } from '@/app/lib/onedrive';

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

    setSetting('onedrive_access_token', accessToken);
    setSetting('onedrive_refresh_token', refreshToken);
    setSetting('onedrive_enabled', 'true');

    return new Response(
      `<html>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>✓ OneDrive Connected!</h1>
          <p>Your OneDrive account has been successfully connected.</p>
          <p>You can now close this window and return to the dashboard.</p>
          <script>window.close();</script>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    return new Response(`Error: ${String(error)}`, { status: 500 });
  }
}
