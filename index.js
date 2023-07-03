import { Client, GatewayIntentBits } from 'discord.js';
import get from 'axios';
import { existsSync, mkdirSync, writeFileSync, renameSync, unlinkSync } from 'fs';
import { join, basename, extname } from 'path';
import { createCanvas, Image, loadImage } from 'canvas';
import { fileURLToPath } from 'url';
import path from 'path';
import splitImage from './split.js';
import dotenv from 'dotenv'
import { config } from './config/index.js';
dotenv.config()

const PREFIX = "*";
const discordToken = process.env.DISCORD_TOKEN;
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
] });
// const directory = __dirname;
const __filename = fileURLToPath(import.meta.url);
const directory = path.dirname(__filename);

async function downloadImage(url, filename) {
    try {
        const response = await get(url, { responseType: 'arraybuffer' });
        if (response.status === 200) {
            const inputFolder = config.OUTPUT_GRID_4X4_FOLDER;

            if (!existsSync(inputFolder)) {
                mkdirSync(inputFolder);
            }

            const upscaledFolder = config.OUTPUT_UPSCALED_FOLDER;

            if (!existsSync(upscaledFolder)) {
                mkdirSync(upscaledFolder);
            }

            const inputFilePath = join(directory, inputFolder, filename);
            writeFileSync(inputFilePath, response.data);
            console.log(`Image downloaded: ${filename}`);

            if (!filename.startsWith('UPSCALED_')) {
                const filePrefix = basename(filename, extname(filename));
                await splitImage(inputFilePath);

            } else {
                const outputFilePath = join(directory, upscaledFolder, filename);
                renameSync(inputFilePath, outputFilePath);
            }

            unlinkSync(inputFilePath);
        }
    } catch (error) {
        console.error(`Error downloading image: ${error.message}`);
    }
}

client.on('ready', async () => {
    console.log('Bot connected');
    console.log(`Logged in as ${client.user.tag}!`);

    const manual_split_4x4 = config.MANUAL_GRID_FOLDER;
    if (!existsSync(manual_split_4x4)) {
        mkdirSync(manual_split_4x4);
    }

    const manual_upscale_folder = config.MANUAL_UPSCALE_FOLDER;

    if (!existsSync(manual_upscale_folder)) {
        mkdirSync(manual_upscale_folder);
    }
});

client.on('messageCreate', async (message) => {
    console.log(message.content);

    message.embeds.forEach((embed) => {
        console.log(embed);
        // add this embed to the database, using embed.description, embed.fields, etc.
         // if there are no embeds, this code won't run.
    });
    
    if (message?.embeds?.length > 0) {
        message.embeds.forEach((embed) => {
          console.log('Embed Title:', embed.title);
          console.log('Embed Description:', embed.description);
          console.log('Embed URL:', embed.url);
          console.log('Embed Color:', embed.hexColor);
          console.log('Embed Footer:', embed.footer?.text);
    
          if (embed.fields && embed.fields.length > 0) {
            console.log('Embed Fields:');
            embed.fields.forEach((field) => {
              console.log('  - Field Name:', field.name);
              console.log('  - Field Value:', field.value);
            });
          }
        });
      }

    const attachments = message.attachments;
    for (const attachment of attachments.values()) {
        if (attachment.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            const filePrefix = message.content.includes('Upscaled by') ? 'UPSCALED_' : '';
            await downloadImage(attachment.url, `${filePrefix}${attachment.name}`);
        }
    }

    if (message.content.startsWith('history:')) {
        const downloadQty = parseInt(message.content.split(':')[1]);
        const channel = message.channel;
        const messages = await channel.messages.fetch({ limit: downloadQty });

        for (const msg of messages.values()) {
            for (const attachment of msg.attachments.values()) {
                if (attachment.name.match(/\.(jpg|jpeg|png|gif)$/i)) {
                    try {
                        const filePrefix = message.content.includes('Upscaled by') ? 'UPSCALED_' : '';
                        await downloadImage(attachment.url, `${filePrefix}${attachment.name}`);
                    } catch (error) {
                        console.error(`Error downloading image: ${error.message}`);
                        setTimeout(() => {}, 10000); // Wait 10 seconds
                    }
                }
            }
        }
    }
});

client.login(discordToken);

