import Replicate from "replicate";
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, unlink } from 'fs';
import https from 'https';
import path from 'path';
import { config } from './config/index.js';

const replicate = new Replicate({
    // get your token from https://replicate.com/account
    auth: process.env.REPLICATE_TOKEN,
});

const upscaler = async function(source, fileName) {
    console.log('Upscaling image...');
    const bitmap = readFileSync(source);
    const base64Image = Buffer.from(bitmap).toString('base64');
    const mimetype = 'image/png'; // replace with the correct mime type if not a PNG image
    const dataURI = `data:${mimetype};base64,${base64Image}`

    const model = "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b";
    const input = {
        image: dataURI,
        scale: 4,
    };

    const outputURL = await replicate.run(model, { input });
    // const outputURL = 'https://replicate.delivery/pbxt/JzWInGkdqFpNOBK2gS1WBBSBXuWYoy6peZC9sQmDiXITZYhIA/output.png';
    console.log(outputURL);
    await saveUpscaledImg(outputURL, fileName);
}

const saveUpscaledImg = async (processedURL, outputFileName) => {
    console.log('saving upscaled image to output dir');

    const outputFolder = config.OUTPUT_UPSCALED_FOLDER

    if (!existsSync(outputFolder)) {
        mkdirSync(outputFolder);
    }

    const dest = path.join(outputFolder, outputFileName);

    const file = createWriteStream(dest);

    https.get(processedURL, async (response) => {
        response.pipe(file);

        file.on('finish', () => {
            file.close();  // close() is async, call it after finish of writeStream
            console.log(` ${outputFileName} saved successfully`);
        });
    }).on('error', (error) => {
        unlink(dest);  // Delete the file async. (But we don't check the result)

        console.error('Error downloading file:', error.message);
    });
};

export { upscaler };
