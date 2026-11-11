import JSZip from 'jszip';
import { FILE_CONTENTS } from '../data/projectContents';

/**
 * Generates and downloads a complete .zip archive of the Java 17 multi-module Maven project.
 */
export async function downloadMavenProjectZip(onProgress?: (percent: number) => void): Promise<void> {
  const zip = new JSZip();

  // Root folder in the zip
  const root = zip.folder('rsa-cryptography-microservices');
  if (!root) return;

  const entries = Object.entries(FILE_CONTENTS);
  entries.forEach(([filePath, content]) => {
    // strip leading slash
    const relativePath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    root.file(relativePath, content);
  });

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rsa-cryptography-microservices-java17.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
