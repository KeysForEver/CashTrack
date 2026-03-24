/**
 * Utility to copy text to clipboard with a fallback for non-secure contexts or unsupported browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy using Clipboard API:', err);
    }
  }

  // Fallback to execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Ensure it's not visible but part of the DOM
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    if (successful) return true;
  } catch (err) {
    console.error('Fallback copy failed:', err);
  }

  return false;
}
