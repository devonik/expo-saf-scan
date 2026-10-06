/** A file or folder inside a folder picked with the Storage Access Framework. */
export type SafEntry = {
  /** Document ID within the picked tree, e.g. `primary:Android/media/com.example/file.jpg`. */
  documentId: string;
  /** Content URI to read the file (e.g. as an image source), delete it or list a folder. */
  uri: string;
  name: string;
  /** Path relative to the listed folder, e.g. `Sent/IMG-1.jpg`. */
  path: string;
  isDirectory: boolean;
  /** MIME type as the provider reports it; null for folders. */
  mimeType: string | null;
  /** Bytes; 0 for folders. */
  size: number;
  /** Milliseconds since 1970, if the provider knows it. */
  lastModified: number | null;
};

export type ListOptions = {
  /** Folder to list, as a `documentId` from an earlier listing; the picked folder itself when omitted. */
  documentId?: string;
  /** Also list all subfolders. Folders are queried in parallel, one query each. */
  recursive?: boolean;
  /** Include names starting with a dot, like `.nomedia`. Default false. */
  includeHidden?: boolean;
};

export type PickFolderOptions = {
  /**
   * Where the picker opens, as a document URI. Build one for a path on the
   * phone's storage with `externalStorageDocumentUri('Android/media/com.example')`.
   */
  initialUri?: string;
};
