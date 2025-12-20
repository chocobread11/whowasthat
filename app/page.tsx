"use client";
import { useRef, useState, useEffect } from "react";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [photos, setPhotos] = useState<any[]>([]);

  async function compressImage(
    file: File,
    maxSize = 1280,
    quality = 0.75
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject("Canvas context failed");
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject("Compression failed");
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject("Image load failed");
      };

      img.src = url;
    });
  }

  async function loadPhotos() {
    const db = await getDb();
    const allPhotos = await db.getAll("photos");
    setPhotos(allPhotos);
  }

  useEffect(() => {
    loadPhotos();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    let compressed: Blob;

    try {
      compressed = await compressImage(file);
    } catch (err) {
      console.error(err);
      alert("Failed to process image");
      return;
    }

    const id = crypto.randomUUID();
    const db = await getDb();

    await db.put("photos", {
      id,
      image: compressed,
      createdAt: Date.now(),
    });

    // Safari-safe: reset input
    e.target.value = "";

    // Safari-safe: slight delay before navigation
    setTimeout(() => {
      router.push(`/photo/${id}`);
    }, 50);
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold">People Memory</h1>
      <p className="text-sm text-gray-500">Private • Stored on your device</p>

      <input
        type="file"
        accept="image/*"
        hidden
        ref={inputRef}
        onChange={handleFileChange}
      />

      <button
        onClick={() => inputRef.current?.click()}
        className="mt-4 w-full rounded-xl bg-black text-white py-3"
      >
        + Add Photo
      </button>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <Link key={photo.id} href={`/photo/${photo.id}`}>
            <img
              src={URL.createObjectURL(photo.image)}
              className="
            aspect-square object-cover rounded
            cursor-pointer hover:opacity-80
          "
            />
          </Link>
        ))}
      </div>
    </main>
  );
}
