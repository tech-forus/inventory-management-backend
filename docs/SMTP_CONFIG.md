# SMTP Email Configuration

## Configuration Summary

The email service has been configured with the following settings:

- **SMTP Host**: `smtp.gmail.com`
- **SMTP Port**: `587`
- **SMTP Secure**: `false` (TLS)
- **SMTP User**: `tech@foruselectric.com`
- **SMTP Password**: `dhim ovxq wvoz wxts` (Gmail App Password)

## Frontend URL Configuration

The email service automatically determines the frontend URL based on the environment:

- **Development** (`NODE_ENV=development`): `http://localhost:3000`
- **Production** (`NODE_ENV=production`): `https://www.forusbiz.ai`

You can override this by setting the `FRONTEND_URL` environment variable.

## Environment Variables

The following environment variables are configured in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tech@foruselectric.com
SMTP_PASS=dhim ovxq wvoz wxts
FRONTEND_URL=  # Auto-detected based on NODE_ENV
```

## CORS Configuration

The backend CORS configuration allows requests from:
- `http://localhost:3000` (development)
- `http://localhost:5173` (Vite dev server)
- `https://www.forusbiz.ai` (production)
- `https://forusbiz.ai` (alternative domain)

## Testing SMTP

To test the SMTP configuration:

```bash
# Check configuration (no email sent)
node scripts/test-smtp.js

# Send a test email
node scripts/test-smtp.js your-email@example.com
```

## Setup Script

To reconfigure SMTP settings, run:

```bash
node scripts/setup-smtp.js
```

This script will update your `.env` file with the SMTP credentials.

## Production Deployment (Railway)

For production deployment on Railway, set these environment variables in the Railway dashboard:

1. Go to your Railway project
2. Navigate to **Variables** tab
3. Add the following environment variables:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_SECURE=false`
   - `SMTP_USER=tech@foruselectric.com`
   - `SMTP_PASS=dhim ovxq wvoz wxts`
   - `FRONTEND_URL=https://www.forusbiz.ai` (optional, auto-detected if not set)
   - `NODE_ENV=production`

## Email Service Features

The email service sends invitation emails with:
- Simple, clean format focused on the invitation link
- Set password link (expires in 24 hours)
- Clickable link that opens the password setup page

## Troubleshooting

### Email not sending

1. **Check SMTP credentials**: Verify that `SMTP_USER` and `SMTP_PASS` are correctly set
2. **Gmail App Password**: Make sure you're using a Gmail App Password, not your regular password
3. **Network/Firewall**: Ensure your server can connect to `smtp.gmail.com:587`
4. **Check logs**: Look for email service initialization messages in server logs

### Frontend URL issues

1. **Development**: Set `NODE_ENV=development` or `FRONTEND_URL=http://localhost:3000`
2. **Production**: Set `NODE_ENV=production` or `FRONTEND_URL=https://www.forusbiz.ai`
3. **Override**: Set `FRONTEND_URL` environment variable to override auto-detection

### CORS errors

If you see CORS errors:
1. Check that your frontend URL is in the allowed origins list
2. Verify `CORS_ORIGINS` environment variable includes your frontend URL
3. Check server logs for CORS evaluation messages

