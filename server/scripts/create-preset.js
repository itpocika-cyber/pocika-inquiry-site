import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function createPreset() {
  try {
    const result = await cloudinary.api.create_upload_preset({
      name: 'pocika_unsigned',
      unsigned: true,
      folder: 'pocika-inquiries'
    });
    console.log("Preset created:", result);
  } catch (error) {
    if (error.error && error.error.message.includes('already exists')) {
      console.log("Preset already exists!");
    } else {
      console.error("Error creating preset:", error);
    }
  }
}

createPreset();
