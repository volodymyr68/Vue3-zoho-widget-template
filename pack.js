import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const output = fs.createWriteStream(path.join('dist', 'widget.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression level
});

archive.pipe(output);
archive.directory(path.join('dist', 'widget'), false);
archive.finalize();
