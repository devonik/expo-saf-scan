package dev.devnik.safscan

import android.content.ContentResolver
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.DocumentsContract
import android.provider.DocumentsContract.Document
import expo.modules.kotlin.activityresult.AppContextActivityResultLauncher
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import java.io.File
import java.security.MessageDigest

class ListOptions : Record {
  /** Folder to list, as a document ID inside the tree; the tree's root when null. */
  @Field val documentId: String? = null

  /** Also list subfolders, all levels down. */
  @Field val recursive: Boolean = false

  /** Include names starting with a dot, like `.nomedia`. */
  @Field val includeHidden: Boolean = false
}

/**
 * Reads folders picked with the Storage Access Framework. Listing asks the
 * document provider once per folder for name, type, size and date of every
 * child; listing through a document-file wrapper costs several queries per file.
 */
class ExpoSafScanModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val resolver: ContentResolver
    get() = context.contentResolver

  override fun definition() = ModuleDefinition {
    Name("ExpoSafScan")

    lateinit var pickerLauncher: AppContextActivityResultLauncher<FolderPickerInput, Uri?>

    RegisterActivityContracts {
      pickerLauncher = registerForActivityResult(FolderPickerContract(this@ExpoSafScanModule))
    }

    AsyncFunction("pickFolderAsync") Coroutine { initialUri: String? ->
      pickerLauncher.launch(FolderPickerInput(initialUri))?.toString()
    }

    Function("hasAccess") { treeUri: String ->
      val uri = Uri.parse(treeUri)
      resolver.persistedUriPermissions.any { it.uri == uri && it.isReadPermission && it.isWritePermission }
    }

    // On the IO dispatcher: async functions otherwise run one after another on the module's queue.
    AsyncFunction("listAsync") Coroutine { treeUri: String, options: ListOptions ->
      withContext(Dispatchers.IO) {
        val tree = Uri.parse(treeUri)
        val rootId = options.documentId ?: DocumentsContract.getTreeDocumentId(tree)
        list(tree, rootId, "", options)
      }
    }

    AsyncFunction("videoThumbnailAsync") Coroutine { uri: String, maxSize: Int ->
      withContext(Dispatchers.IO) { videoThumbnail(uri, maxSize) }
    }

    AsyncFunction("deleteAsync") Coroutine { uris: List<String> ->
      withContext(Dispatchers.IO) {
        uris.filter { uri ->
          try {
            DocumentsContract.deleteDocument(resolver, Uri.parse(uri))
          } catch (e: java.io.FileNotFoundException) {
            true // Already gone.
          } catch (e: Exception) {
            false
          }
        }
      }
    }

    Function("getInstallTime") { packageName: String ->
      try {
        context.packageManager.getPackageInfo(packageName, 0).firstInstallTime.toDouble()
      } catch (e: PackageManager.NameNotFoundException) {
        null
      }
    }
  }

  private suspend fun list(tree: Uri, documentId: String, path: String, options: ListOptions): List<Map<String, Any?>> =
    coroutineScope {
      val children = queryChildren(tree, documentId, path, options.includeHidden)
      if (!options.recursive) return@coroutineScope children
      // Subfolders in parallel: a provider query mostly waits on the file system.
      val nested = children
        .filter { it["isDirectory"] == true }
        .map { folder ->
          async { list(tree, folder["documentId"] as String, folder["path"] as String, options) }
        }
        .awaitAll()
      children + nested.flatten()
    }

  private fun queryChildren(tree: Uri, documentId: String, path: String, includeHidden: Boolean): List<Map<String, Any?>> {
    val children = DocumentsContract.buildChildDocumentsUriUsingTree(tree, documentId)
    val projection = arrayOf(
      Document.COLUMN_DOCUMENT_ID,
      Document.COLUMN_DISPLAY_NAME,
      Document.COLUMN_MIME_TYPE,
      Document.COLUMN_SIZE,
      Document.COLUMN_LAST_MODIFIED,
    )
    val entries = mutableListOf<Map<String, Any?>>()
    resolver.query(children, projection, null, null, null)?.use { cursor ->
      while (cursor.moveToNext()) {
        val name = cursor.getString(1) ?: continue
        if (!includeHidden && name.startsWith(".")) continue
        val id = cursor.getString(0)
        val mimeType = cursor.getString(2)
        val isDirectory = mimeType == Document.MIME_TYPE_DIR
        entries.add(
          mapOf(
            "documentId" to id,
            "uri" to DocumentsContract.buildDocumentUriUsingTree(tree, id).toString(),
            "name" to name,
            "path" to if (path.isEmpty()) name else "$path/$name",
            "isDirectory" to isDirectory,
            "mimeType" to if (isDirectory) null else mimeType,
            "size" to if (cursor.isNull(3)) 0.0 else cursor.getLong(3).toDouble(),
            "lastModified" to if (cursor.isNull(4)) null else cursor.getLong(4).toDouble(),
          )
        )
      }
    }
    return entries
  }

  private fun scaledFrame(retriever: MediaMetadataRetriever, maxSize: Int): Bitmap? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      return retriever.getScaledFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, maxSize, maxSize)
    }
    val frame = retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC) ?: return null
    val scale = maxSize.toFloat() / maxOf(frame.width, frame.height)
    if (scale >= 1f) return frame
    return Bitmap.createScaledBitmap(frame, (frame.width * scale).toInt(), (frame.height * scale).toInt(), true)
      .also { frame.recycle() }
  }

  /** First frame as a cached JPEG; never loads the whole video into memory. */
  private fun videoThumbnail(uri: String, maxSize: Int): String? {
    val folder = File(context.cacheDir, "expo-saf-scan-thumbnails").apply { mkdirs() }
    val key = MessageDigest.getInstance("SHA-1")
      .digest("$uri@$maxSize".toByteArray())
      .joinToString("") { "%02x".format(it) }
    val file = File(folder, "$key.jpg")
    if (file.exists()) return Uri.fromFile(file).toString()

    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(context, Uri.parse(uri))
      val frame = scaledFrame(retriever, maxSize) ?: return null
      file.outputStream().use { frame.compress(Bitmap.CompressFormat.JPEG, 80, it) }
      frame.recycle()
      Uri.fromFile(file).toString()
    } catch (e: Exception) {
      null
    } finally {
      retriever.release()
    }
  }
}
