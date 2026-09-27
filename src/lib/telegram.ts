import { Bot } from 'grammy';
import { env } from '@/config/env';
import { setupBotHandlers } from '@/modules/bot/bot.service';

const botToken = env.TELEGRAM_BOT_TOKEN;

// Initialize grammY Bot instance with pre-configured botInfo for serverless execution
export const bot = new Bot(botToken, {
  botInfo: {
    id: 8169404379,
    is_bot: true,
    first_name: "Money Tracker",
    username: "money_riki_bot",
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
    can_connect_to_business: false,
    has_main_web_app: false,
    has_topics_enabled: false,
    allows_users_to_create_topics: false,
    can_manage_bots: false,
    supports_join_request_queries: false,
  },
});

bot.catch((err) => {
  console.error('[GrammY Bot Error]:', err);
});

// Register commands and message handlers
setupBotHandlers(bot);
