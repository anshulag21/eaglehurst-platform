"""
Email service for sending emails via SMTP
"""

import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict, Any
import logging
from pathlib import Path

from ..core.config import settings

logger = logging.getLogger(__name__)

# Development email override
DEV_EMAIL_OVERRIDE = "eaglehurst.testuser@gmail.com"


class EmailService:
    """Email service using SMTP"""
    
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME

    def _get_recipient_email(self, original_email: str) -> str:
        """
        Override recipient email in development environment
        
        In development, all emails are sent to the test Gmail account
        to prevent sending emails to real users during testing.
        """
        if settings.is_development():
            logger.info(f"Development mode: Redirecting email from {original_email} to {DEV_EMAIL_OVERRIDE}")
            return DEV_EMAIL_OVERRIDE
        # In production, use the original email address
        return original_email

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        attachments: Optional[List[str]] = None
    ) -> bool:
        """Send an email via SMTP"""
        
        # Skip email sending in development/testing mode
        # if settings.is_development():
        #     logger.info(f"DEVELOPMENT MODE: Skipping email send to {to_email}")
        #     logger.info(f"Subject: {subject}")
        #     if "OTP" in subject or "otp" in html_content.lower():
        #         # Extract OTP from content for logging
        #         import re
        #         otp_match = re.search(r'(\d{6})', html_content)
        #         if otp_match:
        #             logger.info(f"OTP Code: {otp_match.group(1)}")
        #     return True
        
        try:
            # Override recipient email in development
            actual_recipient = self._get_recipient_email(to_email)
            # Add original recipient info to subject in development
            if settings.is_development() and to_email != actual_recipient:
                subject = f"[DEV - Originally for: {to_email}] {subject}"
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            
            message["To"] = actual_recipient

            # Add development notice to content if email is redirected
            if settings.is_development() and to_email != actual_recipient:
                dev_notice = f"\n\n--- DEVELOPMENT MODE ---\nThis email was originally intended for: {to_email}\nRedirected to test account for safety.\n--- END NOTICE ---\n\n"
                
                if text_content:
                    text_content = dev_notice + text_content
                
                html_dev_notice = f"""
                <div style="background: #fff3cd; border: 2px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
                    <h3 style="color: #856404; margin: 0 0 10px 0;">🚧 DEVELOPMENT MODE</h3>
                    <p style="margin: 0; color: #856404;">
                        <strong>Original recipient:</strong> {to_email}<br>
                        <strong>Redirected to:</strong> {actual_recipient}<br>
                        This email redirection is active to prevent sending emails to real users during development.
                    </p>
                </div>
                """
                html_content = html_dev_notice + html_content

            # Add text content
            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)

            # Add HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            # Add attachments if any
            if attachments:
                for file_path in attachments:
                    self._add_attachment(message, file_path)

            # Create SMTP session
            context = ssl.create_default_context()
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.smtp_username, self.smtp_password)
                
                # Send email
                text = message.as_string()
                server.sendmail(self.from_email, actual_recipient, text)
                
                logger.info(f"Email sent successfully to {actual_recipient}" + 
                           (f" (originally intended for {to_email})" if to_email != actual_recipient else ""))
                return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def _add_attachment(self, message: MIMEMultipart, file_path: str):
        """Add attachment to email message"""
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                logger.warning(f"Attachment file not found: {file_path}")
                return

            with open(file_path, "rb") as attachment:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(attachment.read())

            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {file_path.name}'
            )
            message.attach(part)

        except Exception as e:
            logger.error(f"Failed to add attachment {file_path}: {e}")

    async def send_otp_email(self, to_email: str, otp: str, user_name: str) -> bool:
        """Send OTP verification email"""
        subject = "Verify Your Email - CareAcquire"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .otp-box {{ background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }}
                .otp-code {{ font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 14px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 CareAcquire</h1>
                    <h2>Email Verification</h2>
                </div>
                <div class="content">
                    <h3>Hello {user_name}!</h3>
                    <p>Welcome to CareAcquire - the UK's premier medical business marketplace!</p>
                    <p>To complete your registration, please verify your email address using the OTP code below:</p>
                    
                    <div class="otp-box">
                        <div class="otp-code">{otp}</div>
                        <p><strong>This code expires in 10 minutes</strong></p>
                    </div>
                    
                    <p>If you didn't create an account with CareAcquire, please ignore this email.</p>
                    
                    <div class="footer">
                        <p>Best regards,<br>The CareAcquire Team</p>
                        <p><small>This is an automated email. Please do not reply to this message.</small></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Hello {user_name}!
        
        Welcome to CareAcquire - the UK's premier medical business marketplace!
        
        To complete your registration, please verify your email address using this OTP code:
        
        {otp}
        
        This code expires in 10 minutes.
        
        If you didn't create an account with CareAcquire, please ignore this email.
        
        Best regards,
        The CareAcquire Team
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_password_reset_email(self, to_email: str, reset_token: str, user_name: str) -> bool:
        """Send password reset email"""
        subject = "Reset Your Password - CareAcquire"
        
        # In a real app, this would be your frontend URL
        reset_url = f"https://eaglehurst.com/reset-password?token={reset_token}"  # TODO: Use settings.FRONTEND_URL in production
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 14px; }}
                .warning {{ background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 CareAcquire</h1>
                    <h2>Password Reset Request</h2>
                </div>
                <div class="content">
                    <h3>Hello {user_name}!</h3>
                    <p>We received a request to reset your password for your CareAcquire account.</p>
                    
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="button">Reset Password</a>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong>
                        <ul>
                            <li>This link expires in 1 hour</li>
                            <li>If you didn't request this reset, please ignore this email</li>
                            <li>Never share this link with anyone</li>
                        </ul>
                    </div>
                    
                    <p><small>If the button doesn't work, copy and paste this link into your browser:<br>
                    {reset_url}</small></p>
                    
                    <div class="footer">
                        <p>Best regards,<br>The CareAcquire Team</p>
                        <p><small>This is an automated email. Please do not reply to this message.</small></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Hello {user_name}!
        
        We received a request to reset your password for your CareAcquire account.
        
        Please click the following link to reset your password:
        {reset_url}
        
        Security Notice:
        - This link expires in 1 hour
        - If you didn't request this reset, please ignore this email
        - Never share this link with anyone
        
        Best regards,
        The CareAcquire Team
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_welcome_email(self, to_email: str, user_name: str, user_type: str) -> bool:
        """Send welcome email after successful verification"""
        subject = "Welcome to CareAcquire! 🎉"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to CareAcquire</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .feature-box {{ background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 CareAcquire</h1>
                    <h2>Welcome to the Platform!</h2>
                </div>
                <div class="content">
                    <h3>Hello {user_name}! 🎉</h3>
                    <p>Congratulations! Your email has been verified and your CareAcquire account is now active.</p>
                    
                    <p>As a <strong>{user_type.title()}</strong>, you now have access to:</p>
                    
                    {"<div class='feature-box'><h4>🏪 For Sellers:</h4><ul><li>List your medical business for sale</li><li>Upload business documents and media</li><li>Connect with verified buyers</li><li>Access professional services</li></ul></div>" if user_type == "seller" else ""}
                    
                    {"<div class='feature-box'><h4>🔍 For Buyers:</h4><ul><li>Browse medical businesses for sale</li><li>Connect with sellers</li><li>Access detailed business information</li><li>Professional valuation services</li></ul></div>" if user_type == "buyer" else ""}
                    
                    <div style="text-align: center;">
                        <a href="https://eaglehurst.com/dashboard" class="button">Go to Dashboard</a>
                    </div>
                    
                    <p>If you have any questions, our support team is here to help!</p>
                    
                    <div class="footer">
                        <p>Best regards,<br>The CareAcquire Team</p>
                        <p>📧 support@eaglehurst.com | 📞 +44 20 1234 5678</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Hello {user_name}! 🎉
        
        Congratulations! Your email has been verified and your CareAcquire account is now active.
        
        As a {user_type.title()}, you now have access to our full platform features.
        
        Visit your dashboard: https://eaglehurst.com/dashboard
        
        If you have any questions, our support team is here to help!
        
        Best regards,
        The CareAcquire Team
        support@eaglehurst.com | +44 20 1234 5678
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_connection_request_email(
        self, to_email: str, seller_name: str, buyer_name: str, 
        listing_title: str, initial_message: str
    ) -> bool:
        """Send email notification for new connection request"""
        subject = f"New Connection Request - {listing_title}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Connection Request</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .message-box {{ background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🏥 CareAcquire</h1>
                    <h2>New Connection Request</h2>
                </div>
                <div class="content">
                    <h3>Hello {seller_name}!</h3>
                    <p>You have received a new connection request for your listing:</p>
                    <h4>📋 "{listing_title}"</h4>
                    
                    <p><strong>From:</strong> {buyer_name}</p>
                    
                    <div class="message-box">
                        <h4>💬 Initial Message:</h4>
                        <p>"{initial_message}"</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="https://eaglehurst.com/connections" class="button">View & Respond</a>
                    </div>
                    
                    <p><small>You can accept or decline this request from your dashboard.</small></p>
                    
                    <div class="footer">
                        <p>Best regards,<br>The CareAcquire Team</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Hello {seller_name}!
        
        You have received a new connection request for your listing: "{listing_title}"
        
        From: {buyer_name}
        
        Initial Message: "{initial_message}"
        
        Visit your dashboard to view and respond: https://eaglehurst.com/connections
        
        Best regards,
        The CareAcquire Team
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)


# Create global email service instance
email_service = EmailService()
