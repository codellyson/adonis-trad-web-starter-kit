# Subscription Monitoring

## Overview

The subscription monitoring system automatically:
- ✅ Detects expired trials and updates status
- ✅ Detects expired subscriptions and updates status  
- ✅ Sends renewal reminders (3 days before expiration)
- ✅ Sends expiration warnings (1 day before expiration)
- ✅ Sends email notifications to businesses

## Command

Run the monitoring command manually:
```bash
node ace subscriptions:monitor
```

## Automated Monitoring Setup

### Option 1: Cron Job (Recommended for Production)

Add to your server's crontab to run every hour:
```bash
0 * * * * cd /path/to/fastappoint && node ace subscriptions:monitor
```

Or run daily at 9 AM:
```bash
0 9 * * * cd /path/to/fastappoint && node ace subscriptions:monitor
```

### Option 2: Systemd Timer (Linux)

Create `/etc/systemd/system/fastappoint-subscription-monitor.service`:
```ini
[Unit]
Description=FastAppoint Subscription Monitor
After=network.target

[Service]
Type=oneshot
User=www-data
WorkingDirectory=/path/to/fastappoint
ExecStart=/usr/bin/node ace subscriptions:monitor
```

Create `/etc/systemd/system/fastappoint-subscription-monitor.timer`:
```ini
[Unit]
Description=Run FastAppoint Subscription Monitor Hourly
Requires=fastappoint-subscription-monitor.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:
```bash
sudo systemctl enable fastappoint-subscription-monitor.timer
sudo systemctl start fastappoint-subscription-monitor.timer
```

### Option 3: PM2 Cron (If using PM2)

Add to `ecosystem.config.js`:
```javascript
{
  name: 'subscription-monitor',
  script: 'node',
  args: 'ace subscriptions:monitor',
  cron_restart: '0 * * * *', // Every hour
  autorestart: false
}
```

## What Gets Monitored

1. **Expired Trials**: Automatically marks trials as expired and sends notification
2. **Expired Subscriptions**: Marks subscriptions as cancelled when period ends
3. **Renewal Reminders**: Emails sent 3 days before subscription renewal
4. **Expiration Warnings**: Emails sent 1 day before subscription expires

## Email Notifications

The system sends:
- Trial expired emails
- Subscription expired emails
- Renewal reminder emails (3 days before)
- Expiration warning emails (1 day before)

All emails include links to manage or renew subscriptions.

