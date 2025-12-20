"use client";
import { useRef, useState, useEffect } from "react";
import { getDb } from "@/lib/db";
import Link from "next/link";

export default function Home() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [photos, setPhotos] = useState<any[]>([]);

  async function compressImage(
    file: File,
    maxSize = 1280,
    quality = 0.75,
  ): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);

      img.onload = () => {
        let { width, height } = img;

        // Resize logic
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(blob!);
          },
          "image/jpeg",
          quality,
        );
      };
    });
  }

  async function loadPhotos() {
    const database = await getDb();
    const allPhotos = await database.getAll("photos");
    setPhotos(allPhotos);
  }
  useEffect(() => {
    loadPhotos();
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const database = await getDb();
    await database.put("photos", {
      id: crypto.randomUUID(),
      image: file,
      createdAt: Date.now(),
    });

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    loadPhotos();
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold">People Memory</h1>
      <p className="text-sm text-gray-500">Private • Stored on your device</p>

      <input
        type="file"
        accept="image/*"
        capture="environment"
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
