// Cloudflare R2 (S3 compatible). El panel sube directamente a R2 con una URL firmada de corta
// duración; la API nunca recibe el fichero. Cuenta y bucket a nombre del fundador (CLAUDE.md).
import { randomUUID } from "node:crypto";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { UPLOAD_RULES, type UploadRequest } from "@msc/shared";

import { env } from "../env.ts";

const UPLOAD_TTL_SECONDS = 10 * 60;

let client: S3Client | null = null;

export function storageConfigured(): boolean {
  return !!(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET && env.R2_PUBLIC_BASE_URL);
}

function r2(): S3Client {
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    // Estilo de ruta (host/bucket/clave): R2 lo admite y evita problemas de certificado con nombres de bucket con puntos.
    forcePathStyle: true,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
  });
  return client;
}

export async function createUpload(req: UploadRequest) {
  const types: Record<string, string> = UPLOAD_RULES[req.kind].types;
  const ext = types[req.contentType]!;
  const month = new Date().toISOString().slice(0, 7);
  const key = `${req.kind}/${month}/${randomUUID()}.${ext}`;
  // El tipo y el tamaño van firmados: R2 rechaza una subida que no coincida.
  const uploadUrl = await getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, ContentType: req.contentType, ContentLength: req.size }),
    { expiresIn: UPLOAD_TTL_SECONDS, signableHeaders: new Set(["content-type", "content-length"]) },
  );
  const publicUrl = `${env.R2_PUBLIC_BASE_URL!.replace(/\/$/, "")}/${key}`;
  return { key, uploadUrl, publicUrl, headers: { "Content-Type": req.contentType }, expiresIn: UPLOAD_TTL_SECONDS };
}
