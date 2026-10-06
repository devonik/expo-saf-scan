import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoSafScanModule extends NativeModule<{}> {
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<ExpoSafScanModule>('ExpoSafScan');
