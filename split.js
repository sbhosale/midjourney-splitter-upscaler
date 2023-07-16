import { createCanvas, loadImage } from 'canvas';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { upscaler } from './upscaler.js';
import fs from 'fs';
import chokidar from 'chokidar';
import { config } from './config/index.js';
import sharp from 'sharp';

const watcherSplit = chokidar.watch(config.MANUAL_GRID_FOLDER, {ignored: /^\./, persistent: true, awaitWriteFinish: true});

watcherSplit
  .on('add', async function(path) {
    if (!path.includes('.DS_Store')) {
      console.log('File', path, 'has been added');
      try {
          await splitImage(path);
          await fs.promises.copyFile(path, `${config.OUTPUT_GRID_4X4_FOLDER}/${path.split('/')[1]}`);
          await fs.promises.unlink(path);
          console.log('File', path, 'has been processed and deleted');
      } catch (error) {
        console.error(`Error processing or deleting file ${path}: `, error);
      }
    }
  })
  .on('change', function(path) {console.log('File', path, 'has been changed');})
  .on('unlink', function(path) {console.log('File', path, 'has been removed');})
  .on('error', function(error) {console.error('Error happened', error);})


const watcherUpscale = chokidar.watch(config.MANUAL_UPSCALE_FOLDER, {ignored: /^\./, persistent: true, awaitWriteFinish: true});

watcherUpscale
  .on('add', async function(path) {
    if (!path.includes('.DS_Store')) {
      console.log('File', path, 'has been added');
      try {
          let outputFileName = path.split('/')[1];
          await upscale(`./${path}`, outputFileName);
          await fs.promises.unlink(path);
          console.log('File', path, 'has been processed and deleted');
      } catch (error) {
        console.error(`Error processing or deleting file ${path}: `, error);
      }
    }
  })
  .on('change', function(path) {console.log('File', path, 'has been changed');})
  .on('unlink', function(path) {console.log('File', path, 'has been removed');})
  .on('error', function(error) {console.error('Error happened', error);});

const regex = /[^_]+_([^_]+_[^_]+_[^_]+)_/;

async function convertImage(imageFile) {
  console.log('converting image...');

}

async function splitImage(imageFile, skipScale) {
  console.log('spliting....');
  // const image = await loadImage(imageFile);
  const image = await loadImage(await sharp(imageFile).toFormat('png').toBuffer());
  const width = image.width;
  const height = image.height;
  const midX = width / 2;
  const midY = height / 2;
  const count = 0;

  function cropImage(x, y, w, h) {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
    return canvas;
  }

  const outputFolder = config.OUTPUT_GRID_SPLIT_4X4_FOLDER;

  if (!existsSync(outputFolder)) {
    mkdirSync(outputFolder);
  }

  const croppedImages = [
    cropImage(0, 0, midX, midY),
    cropImage(midX, 0, midX, midY),
    cropImage(0, midY, midX, midY),
    cropImage(midX, midY, midX, midY),
  ];

  const imageNames = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

  let fileName = '';
  await renameFile(imageFile).then(res => {
    fileName = res;
  })
  
  for (let i = 0; i < croppedImages.length; i++) {
    console.log(`Adding Image ${i+1} of 4`);
    const buffer = croppedImages[i].toBuffer();
    let outputFileName = `${fileName.split('.png')[0]}_${imageNames[i]}.png`;
    const outputPath = join(outputFolder, outputFileName);
    writeFileSync(outputPath, buffer);
    console.log(outputPath);

    if (!skipScale) {
      await upscale(outputPath, outputFileName);
    }
  }
  
  return croppedImages;
}

async function renameFile(text) {
  // const text = "iamthesush_Capricorn_Goat_Ambitious_Earthy_Mountain-themed_Kawa_ded9a1d8-6def-4e97-b23c-47ad50e48ebc.png";

  // Extract the text between the first and fourth underscore
  const firstUnderscore = text.indexOf("_");
  const fourthUnderscore = text.indexOf("_", firstUnderscore + 1);
  const textBetweenUnderscores = text.slice(firstUnderscore + 1, fourthUnderscore);

  // Extract the text after the last underscore
  const lastUnderscore = text.lastIndexOf("_");
  const textAfterLastUnderscore = text.slice(lastUnderscore + 1);

  // Append the two texts
  const newText = textBetweenUnderscores + "_" + textAfterLastUnderscore;

  return newText;
}

async function upscale(image, fileName) {
  await upscaler(image, fileName);
}

export default splitImage;
