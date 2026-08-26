# OneDrive Auto-Sync Setup Guide

Your CRM is ready for OneDrive auto-sync! Follow these steps to get it working:

## Step 1: Register an App in Azure Portal

1. Go to [Azure Portal](https://portal.azure.com/)
2. Sign in with your Microsoft account (same one with OneDrive)
3. Go to **Azure Active Directory** → **App registrations** → **New registration**
4. Fill in:
   - **Name:** Steam Auto Spa CRM (or any name)
   - **Supported account types:** Personal accounts only
   - **Redirect URI:** Web → `http://localhost:3000/api/onedrive/callback`
5. Click **Register**

## Step 2: Get Your Credentials

On the app's Overview page:
- Copy **Application (client) ID** 
- Go to **Certificates & secrets** → **New client secret**
- Create a secret and copy the **Value** (not the ID)

## Step 3: Add to Your Environment

Create a `.env.local` file in your project root with:

```
MICROSOFT_CLIENT_ID=your_client_id_here
MICROSOFT_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:3000/api/onedrive/callback
```

## Step 4: Restart the Dev Server

After adding the env variables, restart the CRM:
1. Stop the current dev server (Ctrl+C)
2. Run: `npm run dev`

## Step 5: Connect OneDrive in the CRM

1. Go to Admin Dashboard → ⚙️ Settings
2. Click "Connect OneDrive"
3. Sign in with your Microsoft account
4. Grant permissions
5. You'll be redirected back - the connection is complete!

## Step 6: Configure Your Excel File

In Settings:
- **File Path:** Enter the path to your Excel in OneDrive
  - Example: `/Bookings.xlsx` or `/Documents/Customers.xlsx`
- **Sync Schedule:** Set when to auto-sync (default: 6 AM daily)
- Click "Save Settings"
- Click "Sync Now" to test it

## Excel Column Names

Make sure your Excel has these columns (case-insensitive):
- `name` or `Customer Name`
- `email` or `Email` 
- `phone` or `Phone Number` (optional)
- `address` or `Address`
- `service` or `Service`
- `date` or `Date` (format: YYYY-MM-DD)
- `price` or `amount` (numbers only)

## Troubleshooting

**"OneDrive not connected"**
- Make sure you completed all 5 steps above
- Check `.env.local` has correct credentials

**"Failed to download file from OneDrive"**
- Check the file path is exact (case-sensitive)
- Make sure file exists in that OneDrive location
- File must be `.xlsx` format

**Sync not happening automatically**
- The server needs to stay running for scheduled sync
- For now, manually click "Sync Now" until we set up background jobs

## What Gets Synced

Each day (or when you manually sync):
- New customers are added
- New bookings/jobs are added
- Duplicate emails are skipped (won't create duplicates)
- Updated columns on existing rows are NOT changed (only new rows added)

---

That's it! Your daily Excel updates will now automatically populate into the CRM. 🎉
