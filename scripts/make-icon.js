const { app, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');

app.whenReady().then(() => {
  const source = path.join(__dirname, '..', 'public', 'icon.png');
  const target = path.join(__dirname, '..', 'build', 'icon.ico');
  const image = nativeImage.createFromPath(source);
  if (image.isEmpty()) {
    console.error('Source icon could not be loaded:', source);
    app.exit(1);
    return;
  }

  const png = image.resize({ width: 256, height: 256, quality: 'best' }).toPNG();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: icon
  header.writeUInt16LE(1, 4);       // image count
  header[6] = 0;                    // width 256
  header[7] = 0;                    // height 256
  header[8] = 0;                    // palette
  header[9] = 0;                    // reserved
  header.writeUInt16LE(1, 10);      // color planes
  header.writeUInt16LE(32, 12);     // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);     // image offset

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.concat([header, png]));
  console.log('Wrote', target, `(${png.length} bytes PNG payload)`);
  app.quit();
});
