"use client";
import { useRef, useState, useEffect } from "react";
import { getDb } from "@/lib/db";
import Link from "next/link";

export default function Home() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [photos, setPhotos] = useState<any[]>([]);

  async function loadPhotos() {
  const database = await getDb();
  const allPhotos = await database.getAll("photos");
  setPhotos(allPhotos);
}
useEffect(() => {
  loadPhotos();
}, []);

async function handleFileChange(
  e: React.ChangeEvent<HTMLInputElement>
) {
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
      <p className="text-sm text-gray-500">
        Private • Stored on your device
      </p>

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
      className="mt-4 w-full rounded-xl bg-black text-white py-3">
        + Add Photo
      </button>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {photos.map(photo => (
        <Link
        key={photo.id}
        href={`/photo/${photo.id}`}
        >
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

