export async function downloadFile(url: string, filename: string, token: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const fileName = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = fileName;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(fileName);

    return true;
  } catch (error) {
    console.error('Download error:', error);
    return false;
  }
}
