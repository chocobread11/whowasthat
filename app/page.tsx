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
    <main className="min-h-screen flex flex-col max-w-md mx-auto py-8 px-4 overscroll-behavior-y: auto;">
      {/* 🔹 CONTENT */}
      <div className="flex-1">
        <h1 className="text-xl font-semibold">People Memory</h1>
        <p className="text-sm text-gray-500 mt-2">
          Private • Stored on your device
        </p>

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

        {/* Empty state / Guide */}
        {photos.length === 0 && (
          <div className="flex flex-col mt-24 text-center text-sm text-gray-500">
            <p className="text-base font-medium text-gray-700">
              A simple way to remember who’s who
            </p>

            <div className="mt-6 max-h-full overflow-y-auto space-y-2">
              <p>1. Add a photo</p>
              <p>2. Tap on a person</p>
              <p>3. Add their name</p>
              <p>4. Save and share</p>
            </div>
          </div>
        )}

        {/* 🔹 GALLERY */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <Link key={photo.id} href={`/photo/${photo.id}`}>
              <img
                src={URL.createObjectURL(photo.image)}
                className="
                aspect-square object-cover rounded
                cursor-pointer active:opacity-70
              "
              />
            </Link>
          ))}
        </div>
      </div>

      {/* 🔹 FOOTER (STICKS TO BOTTOM) */}
      <footer className="mt-10 border-t pt-6 text-center text-xs text-gray-500">
        <p>Photos never leave your device &#91;browser local storage&#93;.</p>
        <p className="mt-2">Who Was That? — a private people-memory tool</p>
        <p className="mt-2">
          Built by{" "}
          <a
            href="https://github.com/chocobread11"
            target="_blank"
            className="underline underline-offset-2"
          >
            luqmanariffin
          </a>
        </p>
      </footer>
    </main>
  );
}
