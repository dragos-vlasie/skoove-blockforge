import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

const mediaSource = readSource("../src/lib/cms/media.ts");
const uploadRouteSource = readSource("../src/pages/api/cms/media/upload.ts");
const replaceRouteSource = readSource("../src/pages/api/cms/media/replace.ts");
const checkRouteSource = readSource("../src/pages/api/cms/media/check.ts");
const deleteRouteSource = readSource("../src/pages/api/cms/media/delete.ts");
const adminPanelsSource = readSource("../src/cms/adminPanels.tsx");
const blockEditorSource = readSource("../src/cms/blockEditor.tsx");
const controllerSource = readSource("../src/cms/useCmsController.ts");
const validationSource = readSource("../src/lib/cms/validation.ts");
const schemaSource = readSource("../src/lib/cms/schema.ts");
const envExampleSource = readSource("../.env.example");
const siteLayoutSource = readSource("../src/layouts/SiteLayout.astro");

const rentalImageBlockTypes = [
  "RENTAL_HERO",
  "RENTAL_ABOUT",
  "RENTAL_CTA",
  "RENTAL_IMAGE_TEXT",
  "RENTAL_FEATURES",
];

test("media API routes exist for upload, replace, delete, and URL checks", () => {
  assert.ok(existsSync(new URL("../src/pages/api/cms/media/upload.ts", import.meta.url)));
  assert.ok(existsSync(new URL("../src/pages/api/cms/media/replace.ts", import.meta.url)));
  assert.ok(existsSync(new URL("../src/pages/api/cms/media/delete.ts", import.meta.url)));
  assert.ok(existsSync(new URL("../src/pages/api/cms/media/check.ts", import.meta.url)));
});

test("media uploads validate file type and size before writing", () => {
  assert.match(mediaSource, /allowedImageTypes/);
  assert.match(mediaSource, /image\/jpeg/);
  assert.match(mediaSource, /image\/png/);
  assert.match(mediaSource, /image\/webp/);
  assert.match(mediaSource, /image\/gif/);
  assert.doesNotMatch(mediaSource, /image\/svg\+xml/);
  assert.match(mediaSource, /10 \* 1024 \* 1024/);
  assert.match(mediaSource, /Upload a PNG, JPEG, WebP, or GIF image/);
});

test("media storage supports local files, GitHub commits, and Supabase Storage", () => {
  assert.match(mediaSource, /CMS_MEDIA_STORE/);
  assert.match(mediaSource, /CMS_CONTENT_STORE/);
  assert.match(mediaSource, /CMS_SUPABASE_URL/);
  assert.match(mediaSource, /CMS_SUPABASE_SECRET_KEY/);
  assert.match(mediaSource, /CMS_SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(mediaSource, /CMS_SUPABASE_STORAGE_BUCKET/);
  assert.match(mediaSource, /public\/uploads/);
  assert.match(mediaSource, /commitGitHubMediaFile/);
  assert.match(mediaSource, /uploadSupabaseMediaFile/);
  assert.match(mediaSource, /deleteSupabaseMediaFile/);
  assert.match(mediaSource, /storageProvider/);
  assert.match(mediaSource, /storagePath/);
  assert.match(mediaSource, /Upload CMS media:/);
  assert.match(envExampleSource, /CMS_MEDIA_STORE=local/);
  assert.match(envExampleSource, /CMS_SUPABASE_STORAGE_BUCKET=cms-media/);
});

test("upload, replace, and delete routes save metadata through the draft content store", () => {
  assert.match(uploadRouteSource, /await saveDraftContent/);
  assert.match(uploadRouteSource, /assets: \[asset, \.\.\.\(graph\.assets \?\? \[\]\)\]/);
  assert.match(replaceRouteSource, /replaceUploadedMedia/);
  assert.match(replaceRouteSource, /assets: graph\.assets\.map/);
  assert.match(deleteRouteSource, /deleteUploadedMedia/);
  assert.match(deleteRouteSource, /assets: graph\.assets\.filter/);
  assert.match(controllerSource, /\/api\/cms\/media\/upload/);
  assert.match(controllerSource, /\/api\/cms\/media\/replace/);
  assert.match(controllerSource, /\/api\/cms\/media\/delete/);
});

test("URL checker validates local files and external images on demand", () => {
  assert.match(checkRouteSource, /existsSync/);
  assert.match(checkRouteSource, /public\$\{cleanUrl\}/);
  assert.match(checkRouteSource, /method: "HEAD"/);
  assert.match(checkRouteSource, /method: "GET"/);
  assert.match(checkRouteSource, /content-type/);
  assert.match(checkRouteSource, /startsWith\("image\/"\)/);
  assert.match(adminPanelsSource, /Check URLs/);
  assert.match(adminPanelsSource, /\/api\/cms\/media\/check/);
});

test("image fields use the media picker instead of raw URLs only", () => {
  assert.match(blockEditorSource, /function MediaPicker/);
  assert.match(blockEditorSource, /Choose from media library/);
  assert.match(blockEditorSource, /Upload new image/);
  assert.match(blockEditorSource, /field\.type === "image"/);
  assert.match(adminPanelsSource, /Media library/);
  assert.match(adminPanelsSource, /onReplace/);
});

test("media metadata is part of schema and validation", () => {
  assert.match(schemaSource, /const assetMetaSchema/);
  assert.match(schemaSource, /storageProvider/);
  assert.match(schemaSource, /storagePath/);
  assert.match(schemaSource, /bucket/);
  assert.match(schemaSource, /originalName/);
  assert.match(schemaSource, /mimeType/);
  assert.match(schemaSource, /folder/);
  assert.match(schemaSource, /tags: z\.array\(z\.string\(\)\)\.default\(\[\]\)/);
  assert.match(validationSource, /validateAssetLibrary/);
  assert.match(validationSource, /duplicates another media URL/);
  assert.match(validationSource, /missing alt text/);
  assert.match(validationSource, /missing from the media library/);
});

test("rental marketing block image fields are validated and URL-checked", () => {
  for (const typeName of rentalImageBlockTypes) {
    assert.match(validationSource, new RegExp(`BlockType\\.${typeName}`));
    assert.match(checkRouteSource, new RegExp(`BlockType\\.${typeName}`));
  }

  assert.match(validationSource, /rental hero image/);
  assert.match(validationSource, /rental avatar/);
  assert.match(validationSource, /rental about car image/);
  assert.match(validationSource, /rental about feature/);
  assert.match(validationSource, /rental CTA image/);
  assert.match(validationSource, /rental image\/text image/);
  assert.match(validationSource, /rental feature/);

  assert.match(checkRouteSource, /rental hero image/);
  assert.match(checkRouteSource, /rental avatar/);
  assert.match(checkRouteSource, /rental about car image/);
  assert.match(checkRouteSource, /rental about feature/);
  assert.match(checkRouteSource, /rental CTA image/);
  assert.match(checkRouteSource, /rental image\/text image/);
  assert.match(checkRouteSource, /rental feature/);

  assert.match(siteLayoutSource, /RENTAL_HERO/);
  assert.match(siteLayoutSource, /imageUrl/);
});
