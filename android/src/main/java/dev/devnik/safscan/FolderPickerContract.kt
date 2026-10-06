package dev.devnik.safscan

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import expo.modules.kotlin.activityresult.AppContextActivityResultContract
import expo.modules.kotlin.providers.AppContextProvider
import java.io.Serializable

internal data class FolderPickerInput(val initialUri: String?) : Serializable

/** Opens the system folder picker and keeps read/write access to the chosen folder across restarts. */
internal class FolderPickerContract(
  private val appContextProvider: AppContextProvider,
) : AppContextActivityResultContract<FolderPickerInput, Uri?> {
  override fun createIntent(context: Context, input: FolderPickerInput): Intent =
    Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).apply {
      input.initialUri?.let { putExtra(DocumentsContract.EXTRA_INITIAL_URI, Uri.parse(it)) }
    }

  override fun parseResult(input: FolderPickerInput, resultCode: Int, intent: Intent?): Uri? {
    val uri = intent?.data
    if (resultCode != Activity.RESULT_OK || uri == null) return null
    val flags = intent.flags and (Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
    appContextProvider.appContext.reactContext?.contentResolver?.takePersistableUriPermission(uri, flags)
    return uri
  }
}
