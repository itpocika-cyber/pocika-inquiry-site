import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'pocika',
  api_key: '585299517146568',
  api_secret: 'Gp-zTqWp44EC2sRsr9Mq92M8vVc'
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
