import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

try {
  const zip = new AdmZip();
  
  // Add manifest.json at the root of the zip
  zip.addLocalFile(path.resolve('manifest.json'));
  
  // Add animations/12345.json inside animations/
  zip.addLocalFolder(path.resolve('animations'), 'animations');
  
  // Add images inside images/
  zip.addLocalFolder(path.resolve('images'), 'images');
  
  // Create public directory if it doesn't exist
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Write the zip file
  const destPath = path.join(publicDir, 'splash.lottie');
  zip.writeZip(destPath);
  
  console.log('Successfully bundled Lottie animation to:', destPath);
} catch (error) {
  console.error('Error bundling Lottie animation:', error);
  process.exit(1);
}
