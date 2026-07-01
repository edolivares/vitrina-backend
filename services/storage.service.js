import { DeleteObjectsCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../lib/config.js";

const normalizeStoragePath = (filePath) => {
  const normalizedPath = path.posix.normalize(filePath.replace(/\\/g, "/"));

  if (normalizedPath.startsWith("../") || normalizedPath === ".." || path.isAbsolute(normalizedPath)) {
    throw new Error("Ruta de storage invalida");
  }

  return normalizedPath;
};

export class S3StorageService {
  constructor() {
    const { accessKeyId, secretAccessKey, region, endpoint } = config.s3;

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      throw new Error("Storage S3 no configurado: faltan S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY o S3_ENDPOINT");
    }

    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });
  }

  async uploadFile(filePath, fileData, contentType, bucket = config.storage.bucket) {
    const storagePath = normalizeStoragePath(filePath);
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: bucket,
        Key: storagePath,
        Body: fileData,
        ContentType: contentType,
      },
    });

    await upload.done();
    return storagePath;
  }

  async deleteFiles(filePaths, bucket = config.storage.bucket) {
    if (!filePaths.length) return;

    await this.client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: filePaths.map((filePath) => ({ Key: normalizeStoragePath(filePath) })),
        Quiet: true,
      },
    }));
  }

  async fileExists(filePath, bucket = config.storage.bucket) {
    const storagePath = normalizeStoragePath(filePath);

    try {
      await this.client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: storagePath,
        Range: "bytes=0-0",
      }));
      return true;
    } catch (error) {
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}

export class LocalStorageService {
  constructor() {
    this.baseDir = path.resolve(process.cwd(), config.storage.localDir);
  }

  getFullPath(filePath, bucket = config.storage.bucket) {
    return path.join(this.baseDir, bucket, normalizeStoragePath(filePath));
  }

  async uploadFile(filePath, fileData, _contentType, bucket = config.storage.bucket) {
    const fullPath = this.getFullPath(filePath, bucket);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, fileData);
    return filePath;
  }

  async deleteFiles(filePaths, bucket = config.storage.bucket) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(this.getFullPath(filePath, bucket));
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }
    }
  }

  async fileExists(filePath, bucket = config.storage.bucket) {
    try {
      await fs.access(this.getFullPath(filePath, bucket));
      return true;
    } catch {
      return false;
    }
  }
}

export const buildPublicStorageUrl = (filePath, bucket = config.storage.bucket) => {
  const baseUrl = config.storage.cdnBaseUrl.replace(/\/$/, "");
  return `${baseUrl}/${bucket}/${filePath}`;
};

export const storageService = config.storage.strategy === "s3"
  ? new S3StorageService()
  : new LocalStorageService();
