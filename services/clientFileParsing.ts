export interface ClientParseInput {
  data: string;
  mimeType: string;
}

function inferMimeTypeFromFile(file: File): string {
  if (file.type) {
    return file.type;
  }

  const name = file.name.toLowerCase();

  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    return 'text/plain';
  }

  if (name.endsWith('.pdf')) {
    return 'application/pdf';
  }

  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  if (name.endsWith('.doc')) {
    return 'application/msword';
  }

  if (name.endsWith('.png')) {
    return 'image/png';
  }

  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (name.endsWith('.webp')) {
    return 'image/webp';
  }

  if (name.endsWith('.gif')) {
    return 'image/gif';
  }

  return 'application/octet-stream';
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve((event.target?.result as string) || '');
    reader.onerror = () => reject(new Error('读取文件失败。'));
    reader.readAsDataURL(file);
  });
}

export async function readFileForClientParsing(file: File): Promise<ClientParseInput> {
  const mimeType = inferMimeTypeFromFile(file);

  if (mimeType.startsWith('text/')) {
    return {
      data: await file.text(),
      mimeType,
    };
  }

  return {
    data: await readAsDataUrl(file),
    mimeType,
  };
}
