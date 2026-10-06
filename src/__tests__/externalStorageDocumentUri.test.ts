import { externalStorageDocumentUri } from '..';

describe('externalStorageDocumentUri', () => {
  it('builds a document URI on the primary storage', () => {
    expect(externalStorageDocumentUri('Android/media/com.whatsapp/WhatsApp')).toBe(
      'content://com.android.externalstorage.documents/document/primary%3AAndroid%2Fmedia%2Fcom.whatsapp%2FWhatsApp'
    );
  });

  it('ignores leading and trailing slashes', () => {
    expect(externalStorageDocumentUri('/DCIM/Camera/')).toBe(
      'content://com.android.externalstorage.documents/document/primary%3ADCIM%2FCamera'
    );
  });
});
