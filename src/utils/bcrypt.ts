import crypto from "crypto";
import fs from "fs";
import path from "path";

type BinaryData = string | Buffer;

interface BcryptNativeBinding {
  gen_salt: (
    minor: "a" | "b",
    rounds: number,
    randomBytes: Buffer,
    callback: (error: Error | null, salt?: string) => void,
  ) => void;
  encrypt: (
    data: BinaryData,
    salt: string,
    callback: (error: Error | null, hash?: string) => void,
  ) => void;
  compare: (
    data: BinaryData,
    hash: string,
    callback: (error: Error | null, matched?: boolean) => void,
  ) => void;
}

function resolveNativeBindingPath(): string {
  const bcryptPackageDir = path.dirname(require.resolve("bcrypt/package.json"));
  const bindingRoot = path.join(bcryptPackageDir, "lib", "binding");
  const bindingDirs = fs.readdirSync(bindingRoot, { withFileTypes: true });

  for (const entry of bindingDirs) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = path.join(bindingRoot, entry.name, "bcrypt_lib.node");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to locate bcrypt native binding");
}

const nativeBinding = require(resolveNativeBindingPath()) as BcryptNativeBinding;

function generateSalt(rounds: number): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (randomError, randomBytes) => {
      if (randomError) {
        reject(randomError);
        return;
      }

      nativeBinding.gen_salt("b", rounds, randomBytes, (saltError, salt) => {
        if (saltError) {
          reject(saltError);
          return;
        }

        if (!salt) {
          reject(new Error("Failed to generate bcrypt salt"));
          return;
        }

        resolve(salt);
      });
    });
  });
}

async function hash(data: BinaryData, saltOrRounds: string | number): Promise<string> {
  if (typeof saltOrRounds === "number") {
    const salt = await generateSalt(saltOrRounds);
    return hash(data, salt);
  }

  return new Promise((resolve, reject) => {
    nativeBinding.encrypt(data, saltOrRounds, (error, encrypted) => {
      if (error) {
        reject(error);
        return;
      }

      if (!encrypted) {
        reject(new Error("Failed to hash value"));
        return;
      }

      resolve(encrypted);
    });
  });
}

function compare(data: BinaryData, hashedValue: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    nativeBinding.compare(data, hashedValue, (error, matched) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(Boolean(matched));
    });
  });
}

const bcrypt = { hash, compare };

export default bcrypt;
