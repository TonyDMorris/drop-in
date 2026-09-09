import type { ClipboardProbe } from './types';

/**
 * JXA run through `osascript`. It asks `NSPasteboard` for file URLs the way any
 * native app would, then falls back to the legacy `NSFilenamesPboardType`
 * property list — some apps still write only that. Emits a JSON array of POSIX
 * paths, or `[]` when the clipboard holds no files.
 */
export const READ_SCRIPT = [
  "ObjC.import('AppKit');",
  'var pb = $.NSPasteboard.generalPasteboard;',
  'var out = [];',
  'var opts = $.NSDictionary.dictionaryWithObjectForKey(',
  '  $.NSNumber.numberWithBool(true),',
  '  $.NSPasteboardURLReadingFileURLsOnlyKey);',
  'var objs = pb.readObjectsForClassesOptions($.NSArray.arrayWithObject($.NSURL), opts);',
  'if (objs && objs.count) {',
  '  for (var i = 0; i < objs.count; i++) {',
  '    var p = ObjC.unwrap(objs.objectAtIndex(i).path);',
  "    if (p) { out.push(p); }",
  '  }',
  '}',
  'if (out.length === 0) {',
  "  var legacy = pb.propertyListForType($('NSFilenamesPboardType'));",
  '  if (legacy && !legacy.isNil()) {',
  '    var names = ObjC.deepUnwrap(legacy);',
  '    if (Array.isArray(names)) {',
  "      for (var j = 0; j < names.length; j++) {",
  "        if (typeof names[j] === 'string' && names[j]) { out.push(names[j]); }",
  '      }',
  '    }',
  '  }',
  '}',
  'JSON.stringify(out);'
].join('\n');

export function parse(stdout: string): string[] {
  const trimmed = stdout.trim();
  if (!trimmed) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
}

export function probes(): ClipboardProbe[] {
  return [{ file: 'osascript', args: ['-l', 'JavaScript', '-e', READ_SCRIPT], parse }];
}
