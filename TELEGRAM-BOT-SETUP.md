# Telegram Bot Installation Guide

## Step 1: Create Your Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/start` to begin
3. Send `/newbot` to create a new bot
4. Choose a name for your bot (e.g., "ClawShake Bot")
5. Choose a username ending in "_bot" (e.g., "ClawShakeBot")
6. **Copy the API token** that BotFather provides

## Step 2: Configure Environment Variables

Edit your `.env` file or set environment variables:

```bash
# Telegram Bot Token (from BotFather)
TELEGRAM_BOT_TOKEN=your_token_here

# Database Configuration (if different from default)
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=your_db_port
DB_NAME=clawshake

# Dashboard URL
DASHBOARD_URL=http://localhost:3000
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Start the Bot

```bash
npm run telegram
```

The bot will start and begin polling for messages.

## Step 5: Test the Bot

1. Open Telegram and search for your bot by username
2. Start a conversation with `/start`
3. Send a test job description like:
   ```
   I need a plumber to fix my bathroom sink
   ```
4. The bot should respond with a confirmation message

## Step 6: Get Your Bot Ready for Users

1. **Add a description**: Use BotFather `/setdescription`
2. **Add a profile picture**: Use BotFather `/setuserpic`
3. **Add commands**: Use BotFather `/setcommands`
   ```
   start - Start the bot
   help - Get help with job posting
   ```
4. **Make it public**: Ensure your bot is not private

## Step 7: Monitor and Maintain

- Check the bot logs for errors
- Monitor database connections
- Update the bot as ClawShake evolves

## Troubleshooting

**Bot not responding:**
- Check if the token is correct
- Ensure the bot is running (`npm run telegram`)
- Check Telegram API status

**Database connection errors:**
- Verify database credentials
- Ensure the database is running
- Check network connectivity

**Natural language parsing issues:**
- Test with different job descriptions
- Add more keywords to the parser
- Consider integrating a more advanced NLP service

## Next Steps

Once the bot is working, you can:
- Add more sophisticated NLP using Anthropic/Claude
- Integrate with WhatsApp using Twilio
- Add job status updates via the bot
- Implement contractor matching notifications
- Add user authentication and profiles

## Security Notes

- Never share your bot token publicly
- Use environment variables for sensitive data
- Monitor bot usage for abuse
- Consider rate limiting for job postings