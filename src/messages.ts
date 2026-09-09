/** The name of the OS file manager, for messages that tell people where to copy from. */
export function fileManagerName(platform: NodeJS.Platform): string {
  switch (platform) {
    case 'darwin':
      return 'Finder';
    case 'win32':
      return 'File Explorer';
    default:
      return 'your file manager';
  }
}

export function copyShortcut(platform: NodeJS.Platform): string {
  return platform === 'darwin' ? '⌘C' : 'Ctrl+C';
}

export function nothingOnClipboard(platform: NodeJS.Platform): string {
  return `No files on the clipboard. Select files in ${fileManagerName(
    platform
  )}, press ${copyShortcut(platform)}, then try again.`;
}
