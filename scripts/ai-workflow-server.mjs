import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const PORT = Number(process.env.AI_WORKFLOW_PORT || 8787);
const API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const OPENAI_PROVIDER_LABEL = process.env.OPENAI_PROVIDER_LABEL || (OPENAI_BASE_URL.includes("api.openai.com") ? "OpenAI official" : "Custom OpenAI-compatible API");
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || "low";
const IMAGE_OUTPUT_FORMAT = process.env.OPENAI_IMAGE_OUTPUT_FORMAT || "jpeg";
const TEXT_LAYER_OUTPUT_FORMAT = process.env.OPENAI_TEXT_LAYER_OUTPUT_FORMAT || "png";
const USE_IMAGE_EDITS = process.env.OPENAI_IMAGE_USE_EDITS === "1";
const IMAGE_TIMEOUT_MS = Number(process.env.OPENAI_IMAGE_TIMEOUT_MS || 90000);
const IMAGE_EDIT_FIELD = process.env.OPENAI_IMAGE_EDIT_FIELD || "image";
const IMAGE_EDIT_SIZE = process.env.OPENAI_IMAGE_EDIT_SIZE || "";
const IMAGE_EDIT_FALLBACK_SIZE = process.env.OPENAI_IMAGE_EDIT_FALLBACK_SIZE || (OPENAI_BASE_URL.includes("api.ofox.io") ? "1024x1024" : "");
const IMAGE_EDIT_INCLUDE_EXTRAS = process.env.OPENAI_IMAGE_EDIT_INCLUDE_EXTRAS === "1";
const TEXT_LAYER_SIZE = process.env.OPENAI_TEXT_LAYER_SIZE || "1536x1024";
const TEXT_LAYER_USE_API = process.env.OPENAI_TEXT_LAYER_USE_API !== "0";
const TEXT_LAYER_USE_FONT_REFERENCE = process.env.OPENAI_TEXT_LAYER_USE_FONT_REFERENCE !== "0";
const TEXT_LAYER_USE_SOURCE_REFERENCE = process.env.OPENAI_TEXT_LAYER_USE_SOURCE_REFERENCE === "1";
const GENERATION_MODE = process.env.AI_WORKFLOW_GENERATION_MODE || "sequential";
const WORKFLOW_DOC_PATH = process.env.AI_WORKFLOW_DOC_PATH || new URL("../docs/workflow-source.md", import.meta.url);
const WORKFLOW_DOC_MAX_CHARS = Number(process.env.AI_WORKFLOW_DOC_MAX_CHARS || 12000);
const WORKFLOW_DOC_CACHE = process.env.AI_WORKFLOW_DOC_CACHE === "1";
const RUNTIME_BUILD = "2026-06-14-doc-grounded-desktop-v1";
const LOCAL_ENV_PATH = process.env.AI_WORKFLOW_ENV_PATH || new URL("../.env.local", import.meta.url);

function openAIKey() {
  return process.env.OPENAI_API_KEY || API_KEY;
}

function openAIBaseUrl() {
  return (process.env.OPENAI_BASE_URL || OPENAI_BASE_URL).replace(/\/+$/, "");
}

function openAIProviderLabel() {
  const baseUrl = openAIBaseUrl();
  return process.env.OPENAI_PROVIDER_LABEL || (baseUrl.includes("api.openai.com") ? "OpenAI official" : "Custom OpenAI-compatible API");
}

function imageOutputFormat() {
  return normalizeOutputFormat(process.env.OPENAI_IMAGE_OUTPUT_FORMAT || IMAGE_OUTPUT_FORMAT, "png");
}

function textLayerOutputFormat() {
  // The text white-draft and its local transparent cutout must always be PNG: the cutout
  // decoder (decodePngToRgba) is PNG-only, and a JPEG draft would break the alpha extraction.
  return "png";
}

function detectImageProvider() {
  const baseUrl = openAIBaseUrl();
  if (baseUrl.includes("api.openai.com")) return "openai";
  if (baseUrl.includes("api.ofox.io")) return "ofox";
  return "compatible";
}

function mimeForFormat(format) {
  const normalized = String(format || "").trim().toLowerCase();
  if (normalized === "jpeg" || normalized === "jpg") return "image/jpeg";
  if (normalized === "webp") return "image/webp";
  if (normalized === "png") return "image/png";
  return "";
}

const stickerSpecs = {
  top: {
    zhName: "上贴背景",
    enName: "Top background",
    size: "1536x1024",
    width: 1536,
    height: 1024,
    instruction: "生成直播间顶部横向贴片。装饰主要在上沿、左右上角和左右边缘；中心不强制浅色或纯白，但必须安静、低纹理、低复杂度、低干扰。只有底部 20%-28% 是中性纯白渐变结构区，最底边必须干净、无线条、无深色块、无复杂纹理。若存在聚焦感，视觉轻微向下汇聚，但不要形成明确主体或海报中心。"
  },
  side: {
    zhName: "侧贴背景",
    enName: "Side background",
    size: "1024x1536",
    width: 1024,
    height: 1536,
    instruction: "生成直播间侧边竖向窄幅贴片。装饰默认只集中在左上角和上边沿；其余 75%-88% 区域保持素净、弱纹理、低对比，不抢直播主体和商品。侧贴不强制向纯白过渡，可保留当前轮同色系安静底色。不要下角强装饰，不要左半边满图案，不要贯穿整条边的复杂纹理，不要强纵深、中心主体或密集信息排版。严禁密铺、平铺、网格式重复、花纹重复、连续小图案、壁纸纹样或满版装饰；侧贴必须像一条留白充足的辅助边缘，而不是独立主视觉或 pattern tile。"
  },
  bottom: {
    zhName: "下贴背景",
    enName: "Bottom background",
    size: "1536x1024",
    width: 1536,
    height: 1024,
    instruction: "生成直播间底部横向贴片。视觉重心集中在下沿、左右下角和底部边缘；底部装饰应比上贴更稳、更低、更克制。只有顶部 25%-32% 是中性纯白渐变结构区，最顶边必须干净、无线条、无深色块、无复杂纹理。不要硬底条、页脚栏或信息栏感。若存在聚焦感，视觉轻微向上汇聚，但不要形成明确主体或促销海报感。"
  }
};

const basePrompt = `根据当前唯一参考图生成直播间贴片背景底图。
只继承当前参考图的构图气质、色彩关系、材质、光效、边缘装饰密度和留白方式。
不要继承或生成文字、logo、二维码、价格标签、促销信息、人物、具体商品、海报排版、信息图结构。
将参考图中的主体转译为抽象背景语言，使画面适合叠加直播间内容。
整体干净、透气，不抢直播主体；中心或内侧可以保留当前参考图的主色和材质气质，只要低干扰。纯白渐变只属于上贴底边和底贴顶边的结构要求，不能把整张图都洗成白色或淡色。`;

const negativePrompt = `禁止生成：文字、logo、二维码、人物、具体商品、价格、优惠券、促销标签、按钮、信息图、海报模板、广告版式、月亮、天体、球体、强中心主体、强边框、深色压迫背景、过密装饰、脏灰底色。`;

let workflowDocCache = null;

async function readWorkflowDoc() {
  if (WORKFLOW_DOC_CACHE && workflowDocCache !== null) return workflowDocCache;
  try {
    workflowDocCache = await readFile(WORKFLOW_DOC_PATH, "utf8");
  } catch {
    workflowDocCache = "";
  }
  return workflowDocCache;
}

function workflowDocPromptBlock(workflowDoc) {
  const trimmed = String(workflowDoc || "").trim();
  if (!trimmed) return "";
  return [
    "Original workflow document, use as the highest-priority production brief:",
    trimmed.slice(0, WORKFLOW_DOC_MAX_CHARS),
    "Follow this document's visual goals, sequencing, constraints, and quality criteria unless the current user request explicitly overrides them."
  ].join("\n");
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(data));
}

function workflowConfig() {
  return {
    ok: true,
    baseUrl: openAIBaseUrl(),
    provider: openAIProviderLabel(),
    hasOpenAIKey: Boolean(openAIKey()),
    outputFormat: imageOutputFormat(),
    textLayerOutputFormat: textLayerOutputFormat()
  };
}

function normalizeOutputFormat(value, fallback = "png") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["png", "jpeg", "webp"].includes(normalized) ? normalized : fallback;
}

async function saveWorkflowConfig(body = {}) {
  if (typeof body.apiKey === "string" && body.apiKey.trim()) process.env.OPENAI_API_KEY = body.apiKey.trim();
  if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
    process.env.OPENAI_BASE_URL = body.baseUrl.trim().replace(/\/+$/, "");
  }
  if (typeof body.provider === "string" && body.provider.trim()) process.env.OPENAI_PROVIDER_LABEL = body.provider.trim();
  if (typeof body.outputFormat === "string") process.env.OPENAI_IMAGE_OUTPUT_FORMAT = normalizeOutputFormat(body.outputFormat, IMAGE_OUTPUT_FORMAT);
  if (typeof body.textLayerOutputFormat === "string") process.env.OPENAI_TEXT_LAYER_OUTPUT_FORMAT = normalizeOutputFormat(body.textLayerOutputFormat, TEXT_LAYER_OUTPUT_FORMAT);

  const lines = [
    `OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ""}`,
    `OPENAI_BASE_URL=${openAIBaseUrl()}`,
    `OPENAI_PROVIDER_LABEL=${openAIProviderLabel()}`,
    `OPENAI_IMAGE_MODEL=${IMAGE_MODEL}`,
    `OPENAI_IMAGE_QUALITY=${IMAGE_QUALITY}`,
    `OPENAI_IMAGE_OUTPUT_FORMAT=${process.env.OPENAI_IMAGE_OUTPUT_FORMAT || IMAGE_OUTPUT_FORMAT}`,
    `OPENAI_TEXT_LAYER_OUTPUT_FORMAT=${process.env.OPENAI_TEXT_LAYER_OUTPUT_FORMAT || TEXT_LAYER_OUTPUT_FORMAT}`,
    `OPENAI_IMAGE_USE_EDITS=${USE_IMAGE_EDITS ? "1" : "0"}`,
    `OPENAI_IMAGE_EDIT_FIELD=${IMAGE_EDIT_FIELD}`,
    `OPENAI_IMAGE_EDIT_INCLUDE_EXTRAS=${IMAGE_EDIT_INCLUDE_EXTRAS ? "1" : "0"}`,
    `OPENAI_IMAGE_TIMEOUT_MS=${IMAGE_TIMEOUT_MS}`,
    `AI_WORKFLOW_GENERATION_MODE=${GENERATION_MODE}`,
    `OPENAI_TEXT_LAYER_USE_API=${TEXT_LAYER_USE_API ? "1" : "0"}`,
    `OPENAI_TEXT_LAYER_USE_FONT_REFERENCE=${TEXT_LAYER_USE_FONT_REFERENCE ? "1" : "0"}`,
    `OPENAI_TEXT_LAYER_USE_SOURCE_REFERENCE=${TEXT_LAYER_USE_SOURCE_REFERENCE ? "1" : "0"}`,
    `AI_WORKFLOW_DOC_PATH=${process.env.AI_WORKFLOW_DOC_PATH || "docs/workflow-source.md"}`,
    `AI_WORKFLOW_DOC_MAX_CHARS=${WORKFLOW_DOC_MAX_CHARS}`,
    `AI_WORKFLOW_DOC_CACHE=${WORKFLOW_DOC_CACHE ? "1" : "0"}`
  ];
  await writeFile(LOCAL_ENV_PATH, `${lines.join("\n")}\n`, "utf8");
  return workflowConfig();
}

function isLocalRequest(request) {
  const host = String(request.headers.host || "").split(":")[0];
  return ["127.0.0.1", "localhost", "::1"].includes(host);
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function buildStickerPrompt(kind, userPrompt, workflowDoc) {
  const spec = stickerSpecs[kind];
  const seriesStyleLock = [
    "Series consistency lock: top, side, and bottom must feel like one coordinated sticker set from the same reference image. Keep the same palette family, material language, lighting temperature, ornament vocabulary, line quality, and softness level across all three outputs.",
    "Role variation only: change placement and crop for top/side/bottom, but do not invent a different visual genre for one piece. The three pieces should look like siblings, not separate campaigns."
  ].join("\n");
  const fadeZone = kind === "top"
    ? "For the top sticker, only the lower 20-28% may fade toward neutral pure white for compositing. The center does not need to be white; it may keep a calm version of the current reference palette. The upper and side decoration areas must keep the reference image's strongest saturation, contrast, texture depth, and highlight intensity. Match the current reference image's dimensionality: if it is flat 2D, keep it flat and graphic; if it is 3D-rendered, keep the same 3D/rendered language."
    : kind === "bottom"
      ? "For the bottom sticker, only the upper 25-32% may fade toward neutral pure white for compositing. The lower decoration area must keep the reference image's strongest saturation, contrast, texture depth, and highlight intensity, but stay lower, steadier, and more restrained than the top sticker."
      : "For the side sticker, do not force a white fade. Keep only the upper-left corner and top edge decorated. At least 75-88% of the strip must remain quiet, low-contrast, weakly textured, and in the same calm palette family as the current reference. Never fill the left half or the full vertical edge with dense patterns.";
  return [
    basePrompt,
    workflowDocPromptBlock(workflowDoc),
    "",
    spec.instruction,
    "",
    seriesStyleLock,
    "",
    "Color fidelity lock: do not wash out the whole image. Preserve the reference image's vivid accent colors, material richness, local dark-light contrast, and decorative density in the active ornament area.",
    "Dimensionality lock: match only the current reference image's dimensional style. Do not inherit 3D, bevel, plastic, metallic, volumetric, cinematic, or flat poster traits from any previous generation. If the current reference is flat, stay flat; if the current reference is 3D-rendered, keep a coherent 3D-rendered style across all three stickers.",
    "Fade control: the pale/white transition is only a compositing edge treatment, not a global color grade. Avoid pastelizing, desaturating, flattening, or turning the entire sticker into a single pale color.",
    "Current-reference isolation: ignore any earlier generation, earlier uploaded image, old palette, old material, or old composition. This request has exactly one visual source: the current reference image.",
    "Structural white rule: top bottom-edge white and bottom top-edge white must be clean neutral pure white gradients with no lines, texture, color blocks, or subject elements. Side sticker has no required pure-white transition.",
    "Side restraint rule: the side sticker must read as an auxiliary edge. Decoration may not occupy the left half, lower corner, full-height edge, or most of the strip.",
    fadeZone,
    "",
    userPrompt ? `本轮用户补充要求：${userPrompt}` : "",
    "",
    "输出要求：只输出可叠加的背景素材，风格统一但构图不要三张完全重复。禁止把参考图做成平铺纹样或重复贴图。",
    negativePrompt
  ].filter(Boolean).join("\n");
}

function extensionForMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

function dataUrlToUploadFile(dataUrl, index) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return null;
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1] || "image/png";
  const buffer = Buffer.from(match[2], "base64");
  const filename = `reference-${index + 1}.${extensionForMime(mime)}`;
  if (typeof File !== "undefined") {
    return new File([buffer], filename, { type: mime });
  }
  const blob = new Blob([buffer], { type: mime });
  blob.name = filename;
  return blob;
}

// Decide which image-output parameters each provider can safely receive.
// Official OpenAI (gpt-image-*) accepts output_format + quality on both generations and edits.
// The OFOX Adapter accepts output_format (so we can ask for jpeg) but is finicky about extra
// fields on edits, so quality stays gated behind IMAGE_EDIT_INCLUDE_EXTRAS there.
// Other OpenAI-compatible gateways keep the previous conservative behavior.
function imageRequestParams({ provider, outputFormat, isEdit }) {
  if (provider === "openai") {
    return { sendOutputFormat: true, sendQuality: true };
  }
  if (provider === "ofox") {
    return {
      sendOutputFormat: true,
      sendQuality: isEdit ? IMAGE_EDIT_INCLUDE_EXTRAS : true
    };
  }
  // Generic compatible gateway: generations historically always sent both params; edits
  // only sent them when extras were explicitly enabled.
  return {
    sendOutputFormat: isEdit ? IMAGE_EDIT_INCLUDE_EXTRAS : true,
    sendQuality: isEdit ? IMAGE_EDIT_INCLUDE_EXTRAS : true
  };
}

async function requestOpenAIImage({ prompt, size, referenceImage, referenceImages, editSize, outputFormat = imageOutputFormat() }) {
  const baseUrl = openAIBaseUrl();
  const provider = detectImageProvider();
  const headers = { Authorization: `Bearer ${openAIKey()}` };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  const inputImages = Array.isArray(referenceImages) && referenceImages.length
    ? referenceImages
    : (referenceImage ? [referenceImage] : []);

  try {
    if (USE_IMAGE_EDITS && inputImages.length) {
      const imageFiles = inputImages.map((image, index) => dataUrlToUploadFile(image, index)).filter(Boolean);
      if (imageFiles.length) {
        const params = imageRequestParams({ provider, outputFormat, isEdit: true });
        const body = new FormData();
        body.append("model", IMAGE_MODEL);
        body.append("prompt", prompt);
        body.append("size", editSize || IMAGE_EDIT_SIZE || size);
        if (params.sendQuality) {
          body.append("quality", IMAGE_QUALITY);
        }
        if (params.sendOutputFormat) {
          body.append("output_format", outputFormat);
        }
        imageFiles.forEach((imageFile, index) => {
          body.append(IMAGE_EDIT_FIELD, imageFile, imageFile.name || `reference-${index + 1}.png`);
        });
        const response = await fetch(`${baseUrl}/images/edits`, {
          method: "POST",
          headers,
          body,
          signal: controller.signal
        });
        return parseOpenAIImageResponse(response, outputFormat);
      }
    }

    const params = imageRequestParams({ provider, outputFormat, isEdit: false });
    const generationBody = {
      model: IMAGE_MODEL,
      prompt,
      size
    };
    if (params.sendQuality) generationBody.quality = IMAGE_QUALITY;
    if (params.sendOutputFormat) generationBody.output_format = outputFormat;
    const response = await fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(generationBody),
      signal: controller.signal
    });
    return parseOpenAIImageResponse(response, outputFormat);
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(`Image request timed out after ${Math.round(IMAGE_TIMEOUT_MS / 1000)}s`);
      timeoutError.isTimeout = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseOpenAIImageResponse(response, requestedFormat) {
  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: { message: text } };
  }
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    const message = data?.error?.message || `OpenAI request failed with ${response.status}`;
    throw new Error(requestId ? `${message} (request ${requestId})` : message);
  }
  const imageBase64 = data?.data?.[0]?.b64_json;
  const imageUrl = data?.data?.[0]?.url;
  if (imageUrl) return imageUrl;
  if (!imageBase64) throw new Error("OpenAI did not return image data.");
  const buffer = Buffer.from(imageBase64, "base64");
  // Trust the actual bytes first; only fall back to the format we asked for, then PNG.
  // Never blindly stamp PNG onto JPEG payloads.
  const contentType = sniffImageMime(buffer) || mimeForFormat(requestedFormat) || "image/png";
  return `data:${contentType};base64,${imageBase64}`;
}

async function imageUrlToDataUrl(imageUrl) {
  if (!imageUrl || imageUrl.startsWith("data:")) return imageUrl;
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Generated image URL could not be read: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const headerType = (response.headers.get("content-type") || "").split(";")[0].trim();
  const contentType = sniffImageMime(buffer) || headerType || "image/png";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function sniffImageMime(buffer) {
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (buffer.subarray(0, 3).toString("hex") === "ffd8ff") return "image/jpeg";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "";
}

function parsedImageBuffer(dataUrl) {
  const parsed = dataUrlToBuffer(dataUrl);
  if (!parsed) return null;
  return {
    ...parsed,
    mime: sniffImageMime(parsed.buffer) || parsed.mime
  };
}

function analyzePngSticker(dataUrl) {
  const parsed = parsedImageBuffer(dataUrl);
  if (!parsed || parsed.mime !== "image/png") return null;
  const { width, height, rgba } = decodePngToRgba(parsed.buffer);
  const total = width * height;
  let visible = 0;
  let meaningful = 0;
  let channelSpreadTotal = 0;

  for (let pixel = 0; pixel < total; pixel += 1) {
    const index = pixel * 4;
    const alpha = rgba[index + 3];
    if (alpha <= 12) continue;
    visible += 1;
    const red = rgba[index];
    const green = rgba[index + 1];
    const blue = rgba[index + 2];
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    channelSpreadTotal += max - min;
    if (min < 238 || max - min > 18) meaningful += 1;
  }

  const meaningfulRatio = visible ? meaningful / visible : 0;
  const averageSpread = visible ? channelSpreadTotal / visible : 0;
  return {
    width,
    height,
    mime: parsed.mime,
    visibleRatio: total ? visible / total : 0,
    meaningfulRatio,
    averageSpread
  };
}

function assertStickerImageNotBlank(dataUrl, kind) {
  const stats = analyzePngSticker(dataUrl);
  if (!stats) return;
  if (stats.visibleRatio < 0.08 || (stats.meaningfulRatio < 0.006 && stats.averageSpread < 2.2)) {
    throw new Error([
      `${stickerSpecs[kind]?.zhName || kind} returned a near-blank white image from the image gateway`,
      `size=${stats.width}x${stats.height}`,
      `meaningful=${stats.meaningfulRatio.toFixed(4)}`,
      `spread=${stats.averageSpread.toFixed(2)}`
    ].join(" "));
  }
}

function resizeCoverRgba(source, targetWidth, targetHeight) {
  const { width: sourceWidth, height: sourceHeight, rgba: sourceRgba } = source;
  const targetRgba = Buffer.alloc(targetWidth * targetHeight * 4);
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const scaledWidth = sourceWidth * scale;
  const scaledHeight = sourceHeight * scale;
  const offsetX = (scaledWidth - targetWidth) / 2;
  const offsetY = (scaledHeight - targetHeight) / 2;

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.max(0, Math.round((y + offsetY) / scale)));
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.max(0, Math.round((x + offsetX) / scale)));
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const targetIndex = (y * targetWidth + x) * 4;
      targetRgba[targetIndex] = sourceRgba[sourceIndex];
      targetRgba[targetIndex + 1] = sourceRgba[sourceIndex + 1];
      targetRgba[targetIndex + 2] = sourceRgba[sourceIndex + 2];
      targetRgba[targetIndex + 3] = sourceRgba[sourceIndex + 3];
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    rgba: targetRgba
  };
}

function normalizeStickerImageSize(dataUrl, kind) {
  const parsed = parsedImageBuffer(dataUrl);
  const spec = stickerSpecs[kind];
  if (!parsed || parsed.mime !== "image/png" || !spec) return dataUrl;

  const png = decodePngToRgba(parsed.buffer);
  if (png.width === spec.width && png.height === spec.height) return dataUrl;

  const normalized = resizeCoverRgba(png, spec.width, spec.height);
  return `data:image/png;base64,${encodeRgbaToPng(normalized).toString("base64")}`;
}

async function requestStickerImageWithFormatFallback(kind, prompt, referenceImage, editSize) {
  // Background stickers prefer JPEG, but some gateways reject output_format=jpeg.
  // Fall back to PNG instead of failing the whole round. A timeout is not a format
  // problem, so we do not retry on timeouts.
  const preferred = imageOutputFormat();
  const formats = preferred === "png" ? ["png"] : [preferred, "png"];
  let lastError = null;
  for (const outputFormat of formats) {
    try {
      return await requestOpenAIImage({
        prompt,
        size: stickerSpecs[kind].size,
        referenceImage,
        editSize,
        outputFormat
      });
    } catch (error) {
      lastError = error;
      if (error?.isTimeout) throw error;
    }
  }
  throw lastError || new Error("Image generation failed");
}

async function requestCheckedStickerImage(kind, prompt, referenceImage, editSize) {
  const image = await requestStickerImageWithFormatFallback(kind, prompt, referenceImage, editSize);
  let dataUrl = "";
  try {
    dataUrl = await imageUrlToDataUrl(image);
  } catch (error) {
    if (/^https?:\/\//i.test(image)) {
      return {
        image,
        warning: `${stickerSpecs[kind].zhName} 已生成，但服务器无法下载返回的图片 URL（${error.message || "load failed"}），已直接使用远程图片。若后续批量导出失败，请改用官方 API 或让网关返回 base64 图片数据。`
      };
    }
    throw error;
  }
  assertStickerImageNotBlank(dataUrl, kind);
  return {
    image: normalizeStickerImageSize(dataUrl, kind),
    warning: ""
  };
}

async function requestStickerImage(kind, prompt, referenceImage) {
  const failedAttempts = [];
  const tryAttempt = async (label, options = {}) => {
    try {
      return await requestCheckedStickerImage(
        kind,
        options.prompt || prompt,
        options.referenceImage ?? referenceImage,
        options.editSize
      );
    } catch (error) {
      failedAttempts.push(`${label}: ${error.message || "failed"}`);
      return "";
    }
  };

  const directResult = await tryAttempt("reference edit");
  if (directResult) return directResult;

  const requestedEditSize = IMAGE_EDIT_SIZE || stickerSpecs[kind].size;
  if (USE_IMAGE_EDITS && referenceImage && IMAGE_EDIT_FALLBACK_SIZE && requestedEditSize !== IMAGE_EDIT_FALLBACK_SIZE) {
    const squareResult = await tryAttempt(`reference edit ${IMAGE_EDIT_FALLBACK_SIZE}`, { editSize: IMAGE_EDIT_FALLBACK_SIZE });
    if (squareResult) {
      return {
        image: squareResult.image,
        warning: squareResult.warning || `${stickerSpecs[kind].zhName} 的原比例图生图失败，已用 ${IMAGE_EDIT_FALLBACK_SIZE} 兼容尺寸生成并裁成贴片比例。`
      };
    }
  }

  throw new Error(failedAttempts.join(" / ") || "Image generation failed");
}

function fallbackSticker(kind, userPrompt) {
  const spec = stickerSpecs[kind];
  const accent = kind === "top" ? "#243f32" : kind === "side" ? "#6d7568" : "#40573e";
  const label = spec.zhName;
  const focusY = kind === "bottom" ? spec.height * 0.82 : spec.height * 0.18;
  const fadeStart = kind === "bottom" ? 0 : spec.height * 0.58;
  const fadeEnd = kind === "bottom" ? spec.height * 0.42 : spec.height;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}">
  <defs>
    <linearGradient id="fade" x1="0" y1="${kind === "bottom" ? 0 : 1}" x2="0" y2="${kind === "bottom" ? 1 : 0}">
      <stop offset="0" stop-color="#fbfaf4"/>
      <stop offset="0.55" stop-color="#f1efe4"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="${kind === "bottom" ? "85%" : "15%"}" r="70%">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.42"/>
      <stop offset="0.58" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="22"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#fade)"/>
  <rect width="100%" height="100%" fill="url(#glow)"/>
  <g opacity="0.42" filter="url(#blur)">
    <path d="M 0 ${focusY} C ${spec.width * 0.24} ${focusY - 90}, ${spec.width * 0.5} ${focusY + 90}, ${spec.width} ${focusY - 20}" fill="none" stroke="${accent}" stroke-width="86"/>
    <path d="M ${spec.width * 0.12} ${kind === "bottom" ? spec.height : 0} C ${spec.width * 0.3} ${focusY}, ${spec.width * 0.74} ${focusY}, ${spec.width * 0.92} ${kind === "bottom" ? spec.height : 0}" fill="none" stroke="#d7dcc7" stroke-width="54"/>
  </g>
  <rect x="0" y="${fadeStart}" width="${spec.width}" height="${Math.abs(fadeEnd - fadeStart)}" fill="#fbfaf4" opacity="0.48"/>
  <text x="42" y="72" fill="#1d2720" font-size="28" font-family="Arial, sans-serif" opacity="0.72">${label} / local draft</text>
  <text x="42" y="116" fill="#1d2720" font-size="18" font-family="Arial, sans-serif" opacity="0.52">${escapeSvg(userPrompt || "等待 OPENAI_API_KEY 后生成真实贴片背景").slice(0, 96)}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function escapeSvg(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeTextLayerSvg({ copyText, styleKey, background = "transparent", textBrightness = "light" }) {
  const text = String(copyText || "").replace(/^例如：\n?|^Example:\n?/i, "").replace(/[“”"]/g, "").trim() || "NOBOOK · 618 狂欢季\n重走真理诞生路";
  const lines = text.split(/\n+/).slice(0, 4);
  const expressive = styleKey === "expressive";
  const dark = textBrightness === "dark";
  const fill = dark ? "#1d2118" : (expressive ? "#f7f3e8" : "#ffffff");
  const stroke = dark ? "#f3efe4" : (expressive ? "#222719" : "#121212");
  const fontFamily = expressive
    ? "'Kaiti SC', 'STKaiti', 'Songti SC', 'Noto Serif SC', serif"
    : "'Songti SC', 'STSong', 'Noto Serif SC', 'Source Han Serif SC', serif";
  const titleSize = expressive ? 70 : 62;
  const bodySize = expressive ? 44 : 42;
  const lineNodes = lines.map((line, index) => {
    const size = index === 0 ? titleSize : bodySize;
    const y = 126 + index * 62;
    return `<text x="540" y="${y}" text-anchor="middle" font-size="${size}" font-weight="${index === 0 ? 800 : 560}" fill="${fill}" stroke="${stroke}" stroke-width="${expressive ? 2.8 : 1.4}" paint-order="stroke">${escapeSvg(line)}</text>`;
  }).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="320" viewBox="0 0 1080 320">
  <rect width="1080" height="320" fill="${background}"/>
  <g font-family="${fontFamily}" letter-spacing="0">
    ${lineNodes}
  </g>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function makeCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
}

const crcTable = makeCrcTable();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  if (distanceUp <= distanceUpLeft) return up;
  return upLeft;
}

function decodePngToRgba(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Only PNG image data can be locally cut out.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = readUInt32(buffer, offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = readUInt32(data, 0);
      height = readUInt32(data, 4);
      bitDepth = data[8];
      colorType = data[9];
    }
    if (type === "IDAT") idatChunks.push(data);
    if (type === "IEND") break;
    offset += length + 12;
  }

  if (bitDepth !== 8 || ![0, 2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const bytesPerPixel = channels;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idatChunks));
  const unfiltered = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    const source = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const targetStart = y * stride;
    const previousStart = (y - 1) * stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? unfiltered[targetStart + x - bytesPerPixel] : 0;
      const up = y > 0 ? unfiltered[previousStart + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? unfiltered[previousStart + x - bytesPerPixel] : 0;
      let value = source[x];
      if (filter === 1) value = (value + left) & 0xff;
      if (filter === 2) value = (value + up) & 0xff;
      if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 0xff;
      if (filter === 4) value = (value + paethPredictor(left, up, upLeft)) & 0xff;
      unfiltered[targetStart + x] = value;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const sourceIndex = index * channels;
    const targetIndex = index * 4;
    if (colorType === 6) {
      rgba[targetIndex] = unfiltered[sourceIndex];
      rgba[targetIndex + 1] = unfiltered[sourceIndex + 1];
      rgba[targetIndex + 2] = unfiltered[sourceIndex + 2];
      rgba[targetIndex + 3] = unfiltered[sourceIndex + 3];
    } else if (colorType === 2) {
      rgba[targetIndex] = unfiltered[sourceIndex];
      rgba[targetIndex + 1] = unfiltered[sourceIndex + 1];
      rgba[targetIndex + 2] = unfiltered[sourceIndex + 2];
      rgba[targetIndex + 3] = 255;
    } else {
      const gray = unfiltered[sourceIndex];
      rgba[targetIndex] = gray;
      rgba[targetIndex + 1] = gray;
      rgba[targetIndex + 2] = gray;
      rgba[targetIndex + 3] = 255;
    }
  }

  return { width, height, rgba };
}

function encodeRgbaToPng({ width, height, rgba }) {
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    makePngChunk("IHDR", ihdr),
    makePngChunk("IDAT", deflateSync(raw)),
    makePngChunk("IEND")
  ]);
}

function isNearWhitePixel(rgba, index, threshold = 236) {
  const red = rgba[index];
  const green = rgba[index + 1];
  const blue = rgba[index + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return min >= threshold && max - min <= 24;
}

function isNearBlackPixel(rgba, index, threshold = 24) {
  const red = rgba[index];
  const green = rgba[index + 1];
  const blue = rgba[index + 2];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return max <= threshold && max - min <= 24;
}

function isMattePixel(rgba, index, matteMode) {
  return matteMode === "black"
    ? isNearBlackPixel(rgba, index)
    : isNearWhitePixel(rgba, index);
}

// Feather alpha by distance from the matte color, so anti-aliased glyph edges fade out
// smoothly instead of leaving a hard halo. White matte fades on darkness; black on brightness.
function matteFeatherAlpha(rgba, index, matteMode) {
  if (matteMode === "black") {
    const maxChannel = Math.max(rgba[index], rgba[index + 1], rgba[index + 2]);
    return Math.max(0, Math.min(255, Math.round((maxChannel - 8) * 14)));
  }
  const minChannel = Math.min(rgba[index], rgba[index + 1], rgba[index + 2]);
  return Math.max(0, Math.min(255, Math.round((248 - minChannel) * 14)));
}

// Only the matte region that is connected to the canvas border is removed. Glyph-interior
// highlights (white inside dark strokes) and interior dark detail (black outline/shadow inside
// light strokes) are not border-connected, so the flood fill never reaches them and they survive.
function removeConnectedMatte(dataUrl, matteMode = "white") {
  const parsed = dataUrlToBuffer(dataUrl);
  if (!parsed || parsed.mime !== "image/png") {
    throw new Error("Local matte cutout needs a PNG data URL.");
  }
  const mode = matteMode === "black" ? "black" : "white";

  const png = decodePngToRgba(parsed.buffer);
  const { width, height, rgba } = png;
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = [];

  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    const index = pixel * 4;
    if (!isMattePixel(rgba, index, mode)) return;
    visited[pixel] = 1;
    queue.push(pixel);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const pixel = queue[cursor];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  const fallbackChannel = mode === "black" ? 0 : 255;
  for (let pixel = 0; pixel < total; pixel += 1) {
    if (!visited[pixel]) continue;
    const index = pixel * 4;
    const alpha = matteFeatherAlpha(rgba, index, mode);
    rgba[index + 3] = alpha;
    if (alpha === 0) {
      rgba[index] = fallbackChannel;
      rgba[index + 1] = fallbackChannel;
      rgba[index + 2] = fallbackChannel;
    }
  }

  return `data:image/png;base64,${encodeRgbaToPng(png).toString("base64")}`;
}

// Average decoration luminance of a PNG top sticker, ignoring transparent and near-white fade
// pixels. Returns 0-255, or null when the image is not locally decodable (e.g. a JPEG sticker).
function measureDecorationBrightness(dataUrl) {
  const parsed = parsedImageBuffer(dataUrl);
  if (!parsed || parsed.mime !== "image/png") return null;
  let png;
  try {
    png = decodePngToRgba(parsed.buffer);
  } catch {
    return null;
  }
  const { width, height, rgba } = png;
  const total = width * height;
  if (!total) return null;
  let sum = 0;
  let counted = 0;
  for (let pixel = 0; pixel < total; pixel += 1) {
    const index = pixel * 4;
    if (rgba[index + 3] <= 12) continue;
    const red = rgba[index];
    const green = rgba[index + 1];
    const blue = rgba[index + 2];
    if (Math.min(red, green, blue) >= 238 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 24) continue;
    sum += 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    counted += 1;
  }
  if (counted < total * 0.02) return null;
  return sum / counted;
}

// Pair the matte color with the planned lettering brightness so the cutout always keys out the
// correct background: dark text -> white matte, light text -> black matte. In auto mode we read
// the top sticker brightness when it is locally decodable, otherwise default to dark-on-white.
function resolveMatte(textColorMode, topStickerImage) {
  if (textColorMode === "dark") {
    return { matteMode: "white", matteColor: "#ffffff", textBrightness: "dark", brightnessSource: "forced-dark" };
  }
  if (textColorMode === "light") {
    return { matteMode: "black", matteColor: "#000000", textBrightness: "light", brightnessSource: "forced-light" };
  }
  const brightness = measureDecorationBrightness(topStickerImage);
  if (brightness === null) {
    return { matteMode: "white", matteColor: "#ffffff", textBrightness: "dark", brightnessSource: "auto-default" };
  }
  if (brightness < 128) {
    return { matteMode: "black", matteColor: "#000000", textBrightness: "light", brightnessSource: "auto-measured" };
  }
  return { matteMode: "white", matteColor: "#ffffff", textBrightness: "dark", brightnessSource: "auto-measured" };
}

async function handleStickerBackgrounds(body) {
  const kinds = ["top", "bottom", "side"];
  const workflowDoc = await readWorkflowDoc();
  const prompts = Object.fromEntries(kinds.map((kind) => [
    kind,
    buildStickerPrompt(kind, body.promptText || "", workflowDoc)
  ]));
  const singleKind = kinds.includes(body.kind) ? body.kind : "";

  if (!openAIKey()) {
    const fallbackKinds = singleKind ? [singleKind] : kinds;
    return {
      ok: true,
      openAIRequestOk: false,
      generated: false,
      model: IMAGE_MODEL,
      quality: IMAGE_QUALITY,
      baseUrl: openAIBaseUrl(),
      useImageEdits: USE_IMAGE_EDITS,
      timeoutMs: IMAGE_TIMEOUT_MS,
      imageEditField: IMAGE_EDIT_FIELD,
      imageEditSize: IMAGE_EDIT_SIZE || "per-sticker-size",
      imageEditFallbackSize: IMAGE_EDIT_FALLBACK_SIZE || "off",
      imageEditIncludeExtras: IMAGE_EDIT_INCLUDE_EXTRAS,
      generationMode: GENERATION_MODE,
      runtimeBuild: RUNTIME_BUILD,
      assets: Object.fromEntries(fallbackKinds.map((kind) => [kind, fallbackSticker(kind, body.promptText)])),
      prompts,
      errors: {},
      message: "未检测到 OPENAI_API_KEY，已返回本地 SVG 草稿和完整 prompt。"
    };
  }

  const results = {};
  const errors = {};
  const warnings = {};

  if (singleKind) {
    try {
      const result = await requestStickerImage(singleKind, prompts[singleKind], body.referenceImage);
      results[singleKind] = result.image;
      if (result.warning) warnings[singleKind] = result.warning;
    } catch (error) {
      errors[singleKind] = error.message || "Image generation failed";
      results[singleKind] = fallbackSticker(singleKind, body.promptText);
    }
  } else if (GENERATION_MODE === "parallel") {
    const settled = await Promise.allSettled(kinds.map(async (kind) => [
      kind,
      await requestStickerImage(kind, prompts[kind], body.referenceImage)
    ]));

    settled.forEach((result, index) => {
      const kind = kinds[index];
      if (result.status === "fulfilled") {
        results[result.value[0]] = result.value[1].image;
        if (result.value[1].warning) warnings[result.value[0]] = result.value[1].warning;
      } else {
        errors[kind] = result.reason?.message || "Image generation failed";
        results[kind] = fallbackSticker(kind, body.promptText);
      }
    });
  } else {
    for (const kind of kinds) {
      try {
        const result = await requestStickerImage(kind, prompts[kind], body.referenceImage);
        results[kind] = result.image;
        if (result.warning) warnings[kind] = result.warning;
      } catch (error) {
        errors[kind] = error.message || "Image generation failed";
        results[kind] = fallbackSticker(kind, body.promptText);
      }
    }
  }

  return {
    ok: true,
    openAIRequestOk: Object.keys(errors).length === 0,
    generated: Boolean(openAIKey()) && Object.keys(errors).length === 0,
    model: IMAGE_MODEL,
    quality: IMAGE_QUALITY,
    baseUrl: openAIBaseUrl(),
    useImageEdits: USE_IMAGE_EDITS,
    timeoutMs: IMAGE_TIMEOUT_MS,
    imageEditField: IMAGE_EDIT_FIELD,
    imageEditSize: IMAGE_EDIT_SIZE || "per-sticker-size",
    imageEditFallbackSize: IMAGE_EDIT_FALLBACK_SIZE || "off",
    imageEditIncludeExtras: IMAGE_EDIT_INCLUDE_EXTRAS,
    generationMode: GENERATION_MODE,
    runtimeBuild: RUNTIME_BUILD,
    assets: results,
    prompts,
    errors,
    warnings,
    message: openAIKey()
      ? (Object.keys(errors).length
        ? "OpenAI 生图失败，已回退成本地草稿。"
        : (Object.keys(warnings).length ? "贴片背景已生成，但部分图片使用了兼容重试路径。" : "贴片背景已生成。"))
      : "未检测到 OPENAI_API_KEY，已返回本地 SVG 草稿和完整 prompt。"
  };
}

function normalizeTextColorMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["dark", "deep", "深", "深色"].includes(normalized)) return "dark";
  if (["light", "pale", "浅", "浅色"].includes(normalized)) return "light";
  return "auto";
}

function textColorModePromptLines(textColorMode, matteMode, textBrightness) {
  // Shared across all modes: never emit pure black for dark lettering, anchor on the step-1 top
  // sticker contrast, and keep the lettering distinct from the solid matte it sits on.
  const shared = [
    "Hard color rule: never fill DARK main lettering with pure black #000000 or a flat near-#000 blackest tone. Use deep charcoal, warm ink, dark espresso brown, or a very dark neutral with subtle tint instead, so the type keeps depth and never looks like a flat #000 block.",
    "Authority rule: the step-1 top sticker (Reference image 1) decides the light/dark relationship. Read its real background/ornament brightness (ignoring pure-white fade zones) and keep the lettering's value contrast strong against that.",
    matteMode === "black"
      ? "Matte rule: the background is a flat pure-black matte that will be keyed out. The main lettering must be light (warm white, ivory, pearl) and clearly separated from the black matte. Any dark outline, shadow, or interior texture must sit INSIDE or touching the letters, never as a separate dark patch floating in the matte."
      : "Matte rule: the background is a flat pure-white matte that will be keyed out. The main lettering must be dark and clearly separated from the white matte. Any white highlight or interior detail must sit INSIDE the letters, never as a separate white patch floating in the matte."
  ];
  if (textColorMode === "dark") {
    return [
      ...shared,
      "Color mode = DARK lettering (forced) on a white matte: make the main type a deep, rich dark tone (charcoal, ink, espresso) — never pure black. It must read clearly dark against the white matte and dark relative to the top sticker."
    ];
  }
  if (textColorMode === "light") {
    return [
      ...shared,
      "Color mode = LIGHT lettering (forced) on a black matte: make the main type a warm white, ivory, or pearl light neutral so it stands out against the pure-black matte. Add a subtle darker inner edge or shadow only if it stays attached to the strokes; do not place loose dark shapes in the matte."
    ];
  }
  return [
    ...shared,
    textBrightness === "light"
      ? "Color mode = AUTO resolved to LIGHT lettering on a black matte (the top sticker reads dark/saturated): use warm white/ivory lettering that stands out against the pure-black matte."
      : "Color mode = AUTO resolved to DARK lettering on a white matte (the top sticker reads light/airy): use deep dark (not pure black) lettering that stands out against the pure-white matte."
  ];
}

async function handleTextLayer(body) {
  const styleKey = body.styleKey === "expressive" ? "expressive" : "clean";
  const textColorMode = normalizeTextColorMode(body.textColorMode);
  const fontPresetKeys = new Set(["elegant-songti", "expressive-calligraphy", "rounded-cute"]);
  const fontPresetKey = fontPresetKeys.has(body.fontPresetKey) ? body.fontPresetKey : "";
  const fontReferenceSource = body.fontReferenceSource === "preset" ? "preset" : "upload";
  const copyText = String(body.copyText || "").replace(/^例如：\n?|^Example:\n?/i, "").replace(/[“”"]/g, "").trim() || "NOBOOK · 618 狂欢季\n重走真理诞生路";
  const topStickerImage = body.topStickerImage || body.referenceImage || "";
  const fontReferenceImage = TEXT_LAYER_USE_FONT_REFERENCE ? (body.fontReferenceImage || "") : "";
  const sourceTypographyReferenceImage = TEXT_LAYER_USE_SOURCE_REFERENCE ? (body.sourceTypographyReferenceImage || "") : "";
  const referenceImages = [topStickerImage, fontReferenceImage, sourceTypographyReferenceImage].filter(Boolean);
  const { matteMode, matteColor, textBrightness, brightnessSource } = resolveMatte(textColorMode, topStickerImage);
  const matteName = matteMode === "black" ? "pure black #000000" : "pure white #ffffff";
  const debug = {
    topStickerAttached: Boolean(topStickerImage),
    fontReferenceAttached: Boolean(fontReferenceImage),
    sourceTypographyReferenceAttached: Boolean(sourceTypographyReferenceImage),
    referenceImageCount: referenceImages.length,
    fontReferenceSource,
    textColorMode,
    matteMode,
    matteColor,
    textBrightness,
    brightnessSource
  };
  const prompt = [
    `Generate a standalone livestream typography asset on a strict ${matteName} background (a flat solid matte fill).`,
    `The final image must be a clean ${matteMode === "black" ? "black" : "white"}-background typography design draft, not a transparent image. Fill the entire background edge to edge with the flat matte color so it can be keyed out cleanly.`,
    "Do not composite onto any reference image or recreate any reference background.",
    topStickerImage
      ? "Reference image 1 is the generated top sticker. It is the primary visual source for material feeling, brightness contrast, and small decorative accents around or attached to letters. Do not blindly copy its main palette into the main letter fill."
      : "",
    fontReferenceImage
      ? (fontReferenceSource === "preset"
        ? "Reference image 2 is the selected built-in font preset. Use it strongly for letterform family, stroke rhythm, weight distribution, terminal shape, title hierarchy, and local face texture. Do not copy its background, scene, color palette, large decorations, logos, non-target text, products, labels, characters, or composition."
        : "Reference image 2 is an optional font reference. Use it only for letterform, stroke rhythm, font structure, calligraphic energy, layout rhythm, and local face texture. Do not copy its background, scene, color palette, large decorations, logos, non-target text, products, labels, characters, or composition.")
      : "No optional font reference is provided; rely on the chosen typography route and the top sticker reference.",
    sourceTypographyReferenceImage
      ? "An additional source reference is the user's original step-1 reference image. If it contains lettering, extract only broad typography cues such as stroke thickness, terminal shape, weight rhythm, spacing, and title hierarchy. Never copy its actual words, slogans, logo marks, background, scene, palette, decorations, products, people, labels, or composition."
      : "",
    body.useReferenceTextStyle
      ? "The user asked to consider text-style cues from the original step-1 reference, but no extra source image is attached for stability. Infer only generic typography qualities that are already visible in the new top sticker and the selected typography route; do not introduce any old palette or scene residue."
      : "",
    "The top sticker reference always wins for material direction and small surrounding decorative elements.",
    "Palette isolation: the original uploaded source image and any typography reference must never affect lettering color. They may not introduce old colors, previous palettes, background tones, product colors, or scene lighting into the new text layer.",
    "This light/dark decision controls only color and small decorative elements, not the letterform route, font structure, copy, layout hierarchy, or stroke style.",
    "Use Reference image 1/top sticker colors only for tiny accent strokes, sparkles, outlines, edge glints, shadows, or small attached ornaments. Do not use top-sticker accent colors as the dominant main letter fill when they reduce contrast.",
    "Color lock: choose lettering fill from the contrast-first dark/bright neutral rule above. Choose outline, shadow, highlights, edge effects, and small accent strokes from Reference image 1/top sticker only when they help readability and local harmony. Never borrow the color palette from a font reference or typography preset.",
    "Letterform lock: the selected typography route controls silhouette, stroke structure, serif/brush/rounded character, and spacing. The top sticker reference must not collapse different typography routes into the same font style.",
    "The optional font reference never decides the background, global color, large ornaments, or non-text visual content.",
    "Do not recreate large color blocks, ribbons, watercolor backgrounds, geometric networks, poster scenes, people, products, logos, QR codes, labels, captions, slogans, signatures, or watermarks.",
    "必须逐字保留以下原文案，不增删、不翻译、不改写，保留换行结构：",
    copyText,
    styleKey === "expressive"
      ? "Typography route: calligraphy tension style. Use bold brush-script structure, visible stroke direction, energetic thick-thin rhythm, hand-drawn pressure changes, and controlled dry-brush texture only when it helps. It must look clearly different from Songti serif and rounded cute lettering."
      : "Typography route: elegant Songti serif style. Use Chinese Songti / Ming-style serif letterforms with clear horizontal-thin vertical-thick contrast, sharp triangular terminals, refined printed-title rhythm, graceful but stable strokes, and high readability. Do not turn this route into Heiti, sans-serif, rounded poster lettering, inflated sticker lettering, or calligraphic brush script.",
    fontPresetKey === "elegant-songti"
      ? "Built-in preset lock: elegant Songti. Follow the preset's tall refined Ming/Songti serif silhouette, sharp wedge terminals, slim-to-thick contrast, restrained upper brand line, and graceful horizontal flourish energy. Keep it clearly different from expressive brush calligraphy and rounded cute poster lettering. This preset controls letter shape only; do not copy the preset's blue color unless blue already appears in Reference image 1."
      : "",
    fontPresetKey === "expressive-calligraphy"
      ? "Built-in preset lock: expressive calligraphy. Follow the preset's sweeping brush-script silhouette, connected running strokes, bold pressure variation, dry-brush texture, long gestural tails, and dynamic slanted rhythm. Keep it clearly different from Songti serif and rounded cute lettering. This preset controls letter shape only; do not copy the preset's green color unless green already appears in Reference image 1."
      : "",
    fontPresetKey === "rounded-cute"
      ? "Typography preset: rounded cute sticker lettering. Use bubbly, thick, soft-cornered, playful, high-readability title shapes, friendly inflated strokes, round terminals, and compact launch-poster hierarchy. It must look clearly different from Songti serif and brush calligraphy. This preset controls letter shape only; do not use the preset sample's orange, navy, cyan, or red palette unless those colors already appear in Reference image 1."
      : "",
    ...textColorModePromptLines(textColorMode, matteMode, textBrightness),
    matteMode === "black"
      ? "Edge rule: keep every glyph stroke, serif, and accent fully readable against the black matte; do not let dark strokes blend into the matte."
      : "Edge rule: keep every glyph stroke, serif, and accent fully readable against the white matte; if any light highlight sits inside a letter, keep a darker edge around it so the cutout will not erase it.",
    "Keep the brand line smaller and clean. Make the main title dominant. The middle dot `·` must stay accurate.",
    "Complex Chinese characters, especially `诞` and `路`, must stay structurally correct and readable.",
    body.promptText ? `用户补充要求：${body.promptText}` : ""
  ].filter(Boolean).join("\n");

  const fallbackTransparent = makeTextLayerSvg({ copyText, styleKey, textBrightness });
  const fallbackMatteDraft = makeTextLayerSvg({ copyText, styleKey, background: matteColor, textBrightness });

  if (!openAIKey() || !TEXT_LAYER_USE_API) {
    return {
      ok: true,
      generated: false,
      openAIRequestOk: false,
      matteMode,
      matteColor,
      assets: {
        whiteDraft: fallbackMatteDraft,
        transparent: fallbackTransparent
      },
      styleKey,
      fontPresetKey,
      prompt,
      model: IMAGE_MODEL,
      size: TEXT_LAYER_SIZE,
      debug,
      message: !openAIKey()
        ? "未检测到 OPENAI_API_KEY，已返回本地 SVG 文字图层草稿。"
        : "文字图层 API 已关闭，已返回本地 SVG 文字图层草稿。"
    };
  }

  try {
    let referenceFallback = "";
    let whiteDraft = "";
    try {
      whiteDraft = await requestOpenAIImage({
        prompt,
        size: TEXT_LAYER_SIZE,
        referenceImages,
        outputFormat: textLayerOutputFormat()
      });
    } catch (error) {
      if (referenceImages.length < 2 || !topStickerImage) throw error;
      referenceFallback = error.message || "Multi-reference image edit failed";
      whiteDraft = await requestOpenAIImage({
        prompt: [
          prompt,
          "",
          "The optional typography reference images could not be sent by the image gateway in this retry. Ignore them and rely on the top sticker plus the selected typography route."
        ].join("\n"),
        size: TEXT_LAYER_SIZE,
        referenceImage: topStickerImage,
        outputFormat: textLayerOutputFormat()
      });
    }
    let transparent = fallbackTransparent;
    let cutoutOk = false;
    let cutoutError = "";
    try {
      transparent = removeConnectedMatte(whiteDraft, matteMode);
      cutoutOk = true;
    } catch (error) {
      cutoutError = error.message || "Local cutout failed";
    }

    const matteLabel = matteMode === "black" ? "黑底" : "白底";
    return {
      ok: true,
      generated: true,
      openAIRequestOk: true,
      cutoutOk,
      matteMode,
      matteColor,
      assets: {
        whiteDraft,
        transparent
      },
      styleKey,
      fontPresetKey,
      prompt,
      model: IMAGE_MODEL,
      size: TEXT_LAYER_SIZE,
      debug,
      referenceFallback,
      error: cutoutError || referenceFallback,
      message: cutoutOk
        ? (referenceFallback
          ? `${matteLabel}字体稿已生成，并已本地扣${matteLabel}为透明 PNG。可选文字参考图未被网关接受，本次已退回只以上贴图为参考；请检查文字是否完全正确。`
          : `${matteLabel}字体稿已生成，并已本地扣${matteLabel}为透明 PNG。请检查文字是否完全正确。`)
        : `${matteLabel}字体稿已生成，但本地扣${matteLabel}失败，已回退 SVG 透明稿：${cutoutError}`
    };
  } catch (error) {
    return {
      ok: true,
      generated: false,
      openAIRequestOk: false,
      matteMode,
      matteColor,
      assets: {
        whiteDraft: fallbackMatteDraft,
        transparent: fallbackTransparent
      },
      styleKey,
      fontPresetKey,
      prompt,
      model: IMAGE_MODEL,
      size: TEXT_LAYER_SIZE,
      debug,
      error: error.message || "Text layer generation failed",
      message: `文字图层 API 生成失败，已回退本地 SVG 草稿：${error.message || "unknown error"}`
    };
  }

}

async function workflowStatus() {
  const workflowDoc = await readWorkflowDoc();
  return {
    ok: true,
    hasOpenAIKey: Boolean(openAIKey()),
    provider: openAIProviderLabel(),
    model: IMAGE_MODEL,
    quality: IMAGE_QUALITY,
    outputFormat: imageOutputFormat(),
    baseUrl: openAIBaseUrl(),
    useImageEdits: USE_IMAGE_EDITS,
    timeoutMs: IMAGE_TIMEOUT_MS,
    imageEditField: IMAGE_EDIT_FIELD,
    imageEditSize: IMAGE_EDIT_SIZE || "per-sticker-size",
    imageEditFallbackSize: IMAGE_EDIT_FALLBACK_SIZE || "off",
    imageEditIncludeExtras: IMAGE_EDIT_INCLUDE_EXTRAS,
    textLayerSize: TEXT_LAYER_SIZE,
    textLayerOutputFormat: textLayerOutputFormat(),
    textLayerUseApi: TEXT_LAYER_USE_API,
    textLayerUseFontReference: TEXT_LAYER_USE_FONT_REFERENCE,
    textLayerUseSourceReference: TEXT_LAYER_USE_SOURCE_REFERENCE,
    generationMode: GENERATION_MODE,
    runtimeBuild: RUNTIME_BUILD,
    workflowDocPath: String(WORKFLOW_DOC_PATH),
    workflowDocMaxChars: WORKFLOW_DOC_MAX_CHARS,
    workflowDocCache: WORKFLOW_DOC_CACHE,
    workflowDocLoaded: Boolean(workflowDoc),
    workflowDocChars: workflowDoc.length
  };
}

async function route(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && url.pathname === "/api/ai-workflow/status") {
    sendJson(response, 200, await workflowStatus());
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/ai-workflow/config") {
    sendJson(response, 200, workflowConfig());
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 404, { ok: false, message: "Not found" });
    return;
  }

  try {
    const body = await readRequestJson(request);
    if (url.pathname === "/api/ai-workflow/sticker-backgrounds") {
      sendJson(response, 200, await handleStickerBackgrounds(body));
      return;
    }
    if (url.pathname === "/api/ai-workflow/text-layer") {
      sendJson(response, 200, await handleTextLayer(body));
      return;
    }
    if (url.pathname === "/api/ai-workflow/config") {
      if (!isLocalRequest(request)) {
        sendJson(response, 403, { ok: false, message: "Local configuration is only available on this computer." });
        return;
      }
      sendJson(response, 200, await saveWorkflowConfig(body));
      return;
    }
    sendJson(response, 404, { ok: false, message: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      message: error.message || "Local workflow server error"
    });
  }
}

export {
  handleStickerBackgrounds,
  handleTextLayer,
  route,
  workflowStatus,
  removeConnectedMatte,
  resolveMatte,
  encodeRgbaToPng,
  decodePngToRgba
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer(route).listen(PORT, "127.0.0.1", () => {
    console.log(`AI workflow local server listening on http://127.0.0.1:${PORT}`);
    console.log(`OpenAI base URL: ${openAIBaseUrl()}`);
    console.log(`Image model: ${IMAGE_MODEL}`);
    console.log(`Image timeout: ${IMAGE_TIMEOUT_MS}ms`);
    console.log(`Image edit field: ${IMAGE_EDIT_FIELD}`);
    console.log(`Generation mode: ${GENERATION_MODE}`);
    console.log(`OpenAI key: ${openAIKey() ? "configured" : "missing, local SVG fallback enabled"}`);
  });
}


