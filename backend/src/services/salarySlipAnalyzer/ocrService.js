const { createWorker, PSM } = require("tesseract.js");
const sharp = require("sharp");

let workerPromise;

async function ocrImageBuffer(buffer) {
  const image = await prepareImageForOcr(buffer);
  const worker = await getWorker();
  const {
    data: { text }
  } = await worker.recognize(image);

  return text;
}

async function prepareImageForOcr(buffer) {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width || 0;
  const resize =
    width > 0 && width < 1800
      ? { width: 1800, withoutEnlargement: false }
      : null;

  let pipeline = sharp(buffer, { failOn: "none" }).rotate();
  if (resize) {
    pipeline = pipeline.resize(resize);
  }

  return pipeline
    .grayscale()
    .normalize()
    .png()
    .toBuffer();
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("eng").then(async (worker) => {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO
      });
      return worker;
    });
  }

  return workerPromise;
}

async function warmupOcrWorker() {
  await getWorker();
}

async function shutdownOcrWorker() {
  if (!workerPromise) {
    return;
  }

  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
}

module.exports = { ocrImageBuffer, shutdownOcrWorker, warmupOcrWorker };
