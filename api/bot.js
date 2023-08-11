#!/usr/bin/env node

/*!
 * Secrets Telegram Bot
 * Copyright (c) 2023 to present. All rights reserved.
 *
 * @author Zubin
 * @username (GitHub) losparviero
 * @license AGPL-3.0
 */

// Add env vars as a preliminary

import dotenv from "dotenv";
import { Bot, webhookCallback, GrammyError, HttpError } from "grammy";
import Vell from "vellin";
dotenv.config();

// Bot

if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN is not defined");
}
const bot = new Bot(process.env.BOT_TOKEN);

// Vell

const vell = new Vell();

// Plugins

bot.use(responseTime);
bot.use(log);
bot.use(admin);

// Admin

const admins = process.env.BOT_ADMIN?.split(",").map(Number) || [];
async function admin(ctx, next) {
  ctx.config = {
    botAdmins: admins,
    isAdmin: admins.includes(ctx.chat?.id),
  };
  await next();
}

// Response

async function responseTime(ctx, next) {
  const before = Date.now();
  await next();
  const after = Date.now();
  console.log(`Response time: ${after - before} ms`);
}

// Log

async function log(ctx, next) {
  let message = ctx.message?.text || ctx.channelPost?.text || undefined;
  const from = ctx.from || ctx.chat;
  const name =
    `${from.first_name || ""} ${from.last_name || ""}`.trim() || ctx.chat.title;
  console.log(
    `From: ${name} (@${from.username}) ID: ${from.id}\nMessage: ${message}`
  );
  await next();
}

// Commands

bot.command("start", async (ctx) => {
  await ctx
    .reply(
      "*Welcome!* ✨\n_This is a private bot to manage secrets using Vell vault.\n\nTo set a secret:_\n/set <secret name> <secret value>\n\n_To get a secret:_\n/get <secret name>",
      {
        parse_mode: "Markdown",
      }
    )
    .then(console.log("Welcome command sent to", ctx.chat.id));
});

bot.command("help", async (ctx) => {
  await ctx
    .reply(
      "*@anzubo Project.*\n\n_This is a private bot to manage secrets using Vell vault.\nIt is able to conveniently get and store secrets and environment variables!_",
      {
        parse_mode: "Markdown",
      }
    )
    .then(console.log("Help command sent to", ctx.chat.id));
});

// Get

bot.command("get", async (ctx) => {
  if (!ctx.config.isAdmin) {
    await ctx.reply("You are not authorized to use this bot.");
    return;
  }
  try {
    const secretName = ctx.message.text.slice(2).split(" ")[1];
    if (secretName != null) {
      const secret = await vell.get(secretName).on((error) => {
        throw error;
      });
      if (secret) {
        await ctx.reply(`<code>${secret}</code>`, { parse_mode: "HTML" });
      } else {
        await ctx.reply("Secret not found");
      }
    } else {
      await ctx.reply(
        "Please reply in the given format. Press /start to know format.",
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message.message_id,
        }
      );
    }
  } catch (error) {
    console.error(error);
    await ctx.reply("There was an error getting secret.\n", error.message);
  }
});

// Set

bot.command("set", async (ctx) => {
  if (!ctx.config.isAdmin) {
    await ctx.reply("You are not authorized to use this bot.");
    return;
  }
  try {
    const secretName = ctx.message.text.slice(2).split(" ")[1];
    const secretValue = ctx.message.text.slice(2).split(" ")[2];

    if (secretName != null && secretValue != null) {
      await vell.set(secretName, secretValue);
      await ctx.reply("Secret saved successfully.");
    } else {
      await ctx.reply(
        "Please reply in the given format. Press /start to know format.",
        {
          parse_mode: "Markdown",
          reply_to_message_id: ctx.message.message_id,
        }
      );
    }
  } catch (error) {
    console.error(error);
    await ctx.reply("There was an error saving secret.\n", error.message);
  }
});

// Messages

bot.on("message:text", async (ctx) => {
  await ctx.reply("You are not authorized to use this bot.");
});

// Error

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    "Error while handling update",
    ctx.update.update_id,
    "\nQuery:",
    ctx.msg.text
  );
  const e = err.error;
  if (e instanceof GrammyError) {
    console.error("Error in request:", e.description);
    if (e.description === "Forbidden: bot was blocked by the user") {
      console.log("Bot was blocked by the user");
    } else {
      ctx.reply("An error occurred");
    }
  } else if (e instanceof HttpError) {
    console.error("Could not contact Telegram:", e);
  } else {
    console.error("Unknown error:", e);
  }
});

// Run

bot.start();
