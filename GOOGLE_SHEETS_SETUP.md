# Google Sheets Auto-Sync Setup

Your CRM is ready to sync with Google Sheets! Follow these steps:

## Step 1: Create a Google Cloud Project (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create a new project**
3. Name it: "Steam Auto Spa CRM"
4. Click **Create**

## Step 2: Enable Google Sheets API

1. In the Console, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click it and press **Enable**
4. Search for "Google Drive API"
5. Click it and press **Enable**

## Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Choose **Desktop application**
4. Click **Create**
5. Copy the **Client ID** and **Client Secret**

## Step 4: Add to Your CRM

Create a `.env.local` file in the project root:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/callback
```

## Step 5: Restart the Dev Server

```bash
npm run dev
```

## Step 6: Connect in the CRM

1. Go to Admin Dashboard → **📊 Google Sheets** button
2. Click "Connect Google Account"
3. Sign in with your Google account
4. Grant permissions
5. Enter your Google Sheet ID
6. Click "Sync Now" to test!

## How to Get Your Sheet ID

1. Open your Google Sheet
2. Look at the URL: `https://docs.google.com/spreadsheets/d/XXXXX.../edit`
3. Copy the part between `/d/` and `/edit` - that's your Sheet ID
4. Paste it into the CRM settings

## Your Google Sheet Format

Make sure your sheet has these column headers (case-insensitive):

| Header | Example |
|--------|---------|
| name | John Smith |
| email | john@example.com |
| phone | 555-1234 |
| address | 123 Main St, Pittsburgh PA |
| service | Full Detail |
| date | 2026-08-20 |
| price | 150 |

## Auto-Sync

For now, use the "Sync Now" button whenever you update your sheet.

To set up automatic daily syncing:
- (Coming soon) We'll add scheduled syncs to run every morning at 6 AM

## Troubleshooting

**"Failed to get access token"**
- Check your `.env.local` has the correct Client ID and Secret
- Restart the dev server after adding `.env.local`

**"No data found in Google Sheet"**
- Make sure the sheet name is exactly "Sheet1"
- Check the sheet has data in columns A-G

**"Sync failed"**
- Make sure all customers have email addresses
- Check date format is YYYY-MM-DD or MM/DD/YYYY

---

That's it! Your Google Sheets will now sync into the CRM. 🎉
