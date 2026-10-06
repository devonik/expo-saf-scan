import { registerWebModule, NativeModule } from 'expo';

// ExpoSafScanModule is not available on the web platform.
class ExpoSafScanModule extends NativeModule<{}> {}

export default registerWebModule(ExpoSafScanModule, 'ExpoSafScanModule');
