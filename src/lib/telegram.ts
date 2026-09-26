import { Bot } from 'grammy';
import { env } from '@/config/env';
import { setupBotHandlers } from '@/modules/bot/bot.service';

const botToken = env.TELEGRAM_BOT_TOKEN;

// Initialize grammY Bot instance
export const bot = new Bot(botToken);

// Register commands and message handlers
setupBotHandlers(bot);
