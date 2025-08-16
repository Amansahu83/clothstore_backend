# Gmail API Setup for Password Reset

## Prerequisites
1. Install Python dependencies:
```bash
pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

## Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API for your project

### 2. Create OAuth 2.0 Credentials
1. Go to "Credentials" in Google Cloud Console
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. Choose "Desktop application"
4. Download the JSON file and rename it to `client_secrets.json`
5. Place it in the backend directory

### 3. First Time Setup
1. Run the mail script once to authenticate:
```bash
cd backend
python mail.py test@example.com test123
```
2. This will open a browser for OAuth consent
3. Grant permissions to send emails
4. A `token.json` file will be created automatically

### 4. Update Sender Email
In `mail.py`, change the sender email from `amangupta86a@gmail.com` to your Gmail address.

## Files Needed
- `client_secrets.json` (OAuth credentials from Google Cloud)
- `token.json` (Generated automatically after first auth)
- `mail.py` (Updated to use Gmail API)

## Security Notes
- Keep `client_secrets.json` and `token.json` secure
- Add them to `.gitignore`
- The token will auto-refresh when expired