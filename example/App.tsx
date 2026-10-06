import { Directory, File } from 'expo-file-system';
import { Image } from 'expo-image';
import {
  deleteAsync,
  externalStorageDocumentUri,
  getInstallTime,
  hasAccess,
  listAsync,
  pickFolderAsync,
  videoThumbnailAsync,
  type SafEntry,
} from 'expo-saf-scan';
import { useEffect, useState } from 'react';
import { Button, FlatList, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

type Timing = { label: string; files: number; ms: number };

/** Lists a picked folder the way most apps do today: expo-file-system, one call per property. */
function listWithExpoFileSystem(treeUri: string): number {
  let files = 0;
  const walk = (directory: Directory) => {
    for (const entry of directory.list()) {
      if (entry instanceof Directory) walk(entry);
      else {
        files++;
        void (entry as File).size;
        void (entry as File).modificationTime;
      }
    }
  };
  walk(new Directory(treeUri));
  return files;
}

export default function App() {
  const [startPath, setStartPath] = useState('Android/media/com.whatsapp/WhatsApp');
  const [treeUri, setTreeUri] = useState<string | null>(null);
  const [entries, setEntries] = useState<SafEntry[]>([]);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const uri = await pickFolderAsync({ initialUri: externalStorageDocumentUri(startPath) });
    if (uri) setTreeUri(uri);
  };

  const scan = async () => {
    if (!treeUri) return;
    setBusy(true);
    const startedAt = Date.now();
    const listed = await listAsync(treeUri, { recursive: true });
    const files = listed.filter((entry) => !entry.isDirectory);
    setEntries(files);
    setTimings((current) => [...current, { label: 'expo-saf-scan', files: files.length, ms: Date.now() - startedAt }]);
    setBusy(false);
  };

  const compare = () => {
    if (!treeUri) return;
    setBusy(true);
    // Let the busy state render before the synchronous listing blocks the JS thread.
    setTimeout(() => {
      const startedAt = Date.now();
      const files = listWithExpoFileSystem(treeUri);
      setTimings((current) => [...current, { label: 'expo-file-system', files, ms: Date.now() - startedAt }]);
      setBusy(false);
    }, 50);
  };

  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
  const media = entries.filter((entry) => /^(image|video)\//.test(entry.mimeType ?? '')).slice(0, 12);
  const whatsAppInstalled = getInstallTime('com.whatsapp');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>expo-saf-scan</Text>

        <Group name="1. Pick a folder">
          <Text>Picker opens at (path on the phone's storage):</Text>
          <TextInput value={startPath} onChangeText={setStartPath} style={styles.input} autoCapitalize="none" />
          <Button title="Pick folder" onPress={pick} />
          {treeUri && (
            <Text style={styles.small}>
              {treeUri}
              {'\n'}Access kept: {String(hasAccess(treeUri))}
            </Text>
          )}
        </Group>

        <Group name="2. Benchmark">
          <Button title="List with expo-saf-scan" onPress={scan} disabled={!treeUri || busy} />
          <View style={{ height: 8 }} />
          <Button title="List with expo-file-system" onPress={compare} disabled={!treeUri || busy} />
          {busy && <Text>Listing…</Text>}
          {timings.map((timing, index) => (
            <Text key={index}>
              {timing.label}: {timing.files} files in {(timing.ms / 1000).toFixed(1)} s
            </Text>
          ))}
          {entries.length > 0 && (
            <Text>
              {entries.length} files, {(totalSize / 1e6).toFixed(1)} MB
            </Text>
          )}
        </Group>

        <Group name="3. Thumbnails (videos without loading the file)">
          <FlatList
            data={media}
            keyExtractor={(entry) => entry.uri}
            numColumns={4}
            scrollEnabled={false}
            renderItem={({ item }) => <Thumbnail entry={item} />}
          />
        </Group>

        <Group name="4. Delete">
          <Button
            title={media[0] ? `Delete ${media[0].name}` : 'Delete first file'}
            disabled={!media[0]}
            onPress={async () => {
              const gone = await deleteAsync([media[0].uri]);
              setEntries((current) => current.filter((entry) => !gone.includes(entry.uri)));
            }}
          />
        </Group>

        <Group name="5. Install time of another app">
          <Text>
            WhatsApp:{' '}
            {whatsAppInstalled ? new Date(whatsAppInstalled).toLocaleString() : 'not installed (or not in <queries>)'}
          </Text>
        </Group>
      </ScrollView>
    </SafeAreaView>
  );
}

function Thumbnail({ entry }: { entry: SafEntry }) {
  const isVideo = entry.mimeType?.startsWith('video/') ?? false;
  const [source, setSource] = useState<string | null>(isVideo ? null : entry.uri);

  useEffect(() => {
    if (isVideo) videoThumbnailAsync(entry.uri, { maxSize: 256 }).then(setSource);
  }, [entry.uri, isVideo]);

  return (
    <View style={styles.tile}>
      {source && <Image source={{ uri: source }} style={{ flex: 1 }} contentFit="cover" />}
      {isVideo && <Text style={styles.badge}>▶</Text>}
    </View>
  );
}

function Group(props: { name: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupHeader}>{props.name}</Text>
      {props.children}
    </View>
  );
}

const styles = {
  header: { fontSize: 30, margin: 20 },
  groupHeader: { fontSize: 18, marginBottom: 12 },
  group: { margin: 16, backgroundColor: '#fff', borderRadius: 10, padding: 16, gap: 6 },
  container: { flex: 1, backgroundColor: '#eee' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 },
  small: { fontSize: 11, color: '#555' },
  tile: { width: 72, height: 72, margin: 2, backgroundColor: '#ddd', borderRadius: 6, overflow: 'hidden' as const },
  badge: { position: 'absolute' as const, right: 4, bottom: 2, color: 'white' },
};
