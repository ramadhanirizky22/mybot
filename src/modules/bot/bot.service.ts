import { Bot } from 'grammy';
import { handleStartCommand } from './commands/start.command';
import { handleRekapCommand } from './commands/rekap.command';
import { handleBudgetCommand } from './commands/budget.command';
import { handleSplitCommand } from './commands/split.command';
import { handleUndoCommand } from './commands/undo.command';
import { handleAbsenCommand, handleSetAbsenCommand, handleTesAbsenCommand } from './commands/absen.command';
import {
  handleTextMessage,
  handlePhotoMessage,
  handleCallbackQuery,
} from './handlers/message.handler';

export function setupBotHandlers(bot: Bot) {
  // Command Handlers
  bot.command('start', handleStartCommand);
  bot.command('rekap', handleRekapCommand);
  bot.command('budget', handleBudgetCommand);
  bot.command('split', handleSplitCommand);
  bot.command('undo', handleUndoCommand);
  bot.command('absen', handleAbsenCommand);
  bot.command('setabsen', handleSetAbsenCommand);
  bot.command('tesabsen', handleTesAbsenCommand);

  // Callback query handler (Inline buttons)
  bot.on('callback_query:data', handleCallbackQuery);

  // Message Handlers
  bot.on('message:photo', handlePhotoMessage);
  bot.on('message:text', handleTextMessage);

  return bot;
}
