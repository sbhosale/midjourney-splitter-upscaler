import { createCanvas, loadImage } from 'canvas';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { upscaler } from './upscaler.js';

const regex = /[^_]+_([^_]+_[^_]+_[^_]+)_/;

async function splitImage(imageFile) {
  console.log('spliting....');
  const image = await loadImage(imageFile);
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

  const outputFolder = 'output';

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
    let outputFileName = `${fileName}_${imageNames[i]}.png`;
    const outputPath = join(outputFolder, outputFileName);
    writeFileSync(outputPath, buffer);
    console.log(outputPath);

    await upscale(outputPath, outputFileName);
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
