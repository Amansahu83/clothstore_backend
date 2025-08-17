import base64
import os
from email.message import EmailMessage
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import sys

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def authentication():
    credentials = None
    
    # Look for token.json in current directory
    token_path = 'token.json'
    if os.path.exists(token_path):
        credentials = Credentials.from_authorized_user_file(token_path, SCOPES)
    
    if not credentials or not credentials.valid:
        if credentials and credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
        else:
            # Look for client_secrets.json in parent directory (root)
            client_secrets_path = os.path.join('..', 'client_secrets.json')
            if not os.path.exists(client_secrets_path):
                client_secrets_path = 'client_secrets.json'  # fallback to current dir
            
            flow = InstalledAppFlow.from_client_secrets_file(client_secrets_path, SCOPES)
            credentials = flow.run_local_server(port=0)
        
        with open(token_path, 'w') as token:
            token.write(credentials.to_json())
    
    return credentials

def send_reset_email(to_email, reset_token):
    try:
        credentials = authentication()
        service = build(serviceName='gmail', version='v1', credentials=credentials)
        
        mime_message = EmailMessage()
        mime_message['From'] = 'amangupta86a@gmail.com'
        mime_message['To'] = to_email
        mime_message['Subject'] = 'Password Reset - ClothStore'
        
        # Create HTML email with reset link
        reset_url = f"https://amanclothstore.vercel.app/reset-password?email={to_email}&token={reset_token}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
                <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">ClothStore Account Recovery</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
                <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
                <p style="color: #666; line-height: 1.6;">You have requested to reset your password for your ClothStore account.</p>
                <p style="color: #666; line-height: 1.6;">Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                
                <p style="color: #999; font-size: 14px; line-height: 1.6;">Or copy and paste this link in your browser:</p>
                <p style="color: #007bff; font-size: 14px; word-break: break-all;">{reset_url}</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #856404; margin: 0; font-size: 14px;">⚠️ This link will expire in 1 hour for security reasons.</p>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 12px;">
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>© 2024 ClothStore. All rights reserved.</p>
            </div>
        </body>
        </html>
        """
        
        message_text = f"""
        Password Reset Request
        
        You have requested to reset your password for ClothStore.
        
        Click this link to reset your password:
        {reset_url}
        
        This link will expire in 1 hour.
        If you didn't request this, please ignore this email.
        """
        
        mime_message.set_content(message_text)
        mime_message.add_alternative(html_content, subtype='html')
        
        raw_message = base64.urlsafe_b64encode(mime_message.as_bytes()).decode()
        message = {'raw': raw_message}
        
        service.users().messages().send(userId='me', body=message).execute()
        return True
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) == 3:
        email = sys.argv[1]
        token = sys.argv[2]
        success = send_reset_email(email, token)
        sys.exit(0 if success else 1)