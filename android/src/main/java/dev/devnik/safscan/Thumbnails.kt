package dev.devnik.safscan

import android.content.ContentResolver
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.OpenableColumns
import android.util.Size
import java.io.File
import java.security.MessageDigest

/**
 * Small pictures of photos and videos for list tiles, for documents in a
 * picked folder and media library URIs alike. Asks Android for the thumbnail
 * it usually keeps already (the gallery made it), which is far cheaper than
 * decoding a 50 MP photo or opening a video; otherwise decodes at a fraction
 * of the size. Never reads a whole file into memory.
 */
internal class Thumbnails(private val context: Context) {
  private val resolver: ContentResolver
    get() = context.contentResolver

  /** File URI of a cached JPEG, at most `maxSize` px on the longer side; null if the media can't be read. */
  fun thumbnail(uri: Uri, maxSize: Int): String? {
    // The byte size is part of the key: a photo still being written by the
    // camera would otherwise keep its half-decoded thumbnail.
    val bytes = byteSize(uri) ?: return null
    val folder = File(context.cacheDir, "expo-saf-scan-thumbnails").apply { mkdirs() }
    val key = MessageDigest.getInstance("SHA-1")
      .digest("$uri@$maxSize@$bytes".toByteArray())
      .joinToString("") { "%02x".format(it) }
    val file = File(folder, "$key.jpg")
    if (file.exists()) return Uri.fromFile(file).toString()

    val bitmap = systemThumbnail(uri, maxSize) ?: decode(uri, maxSize) ?: return null
    return try {
      file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 85, it) }
      Uri.fromFile(file).toString()
    } catch (e: Exception) {
      file.delete()
      null
    } finally {
      bitmap.recycle()
    }
  }

  private fun byteSize(uri: Uri): Long? =
    try {
      resolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { cursor ->
        if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getLong(0) else 0L
      }
    } catch (e: Exception) {
      null
    }

  /**
   * The thumbnail Android keeps for the media, already rotated. Skipped when
   * it is much smaller than asked for, so a larger view doesn't get a blurry one.
   */
  private fun systemThumbnail(uri: Uri, maxSize: Int): Bitmap? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return null
    return try {
      val bitmap = resolver.loadThumbnail(uri, Size(maxSize, maxSize), null)
      if (maxOf(bitmap.width, bitmap.height) * 2 >= maxSize) bitmap else bitmap.recycle().let { null }
    } catch (e: Exception) {
      null
    }
  }

  private fun decode(uri: Uri, maxSize: Int): Bitmap? {
    val type = resolver.getType(uri) ?: ""
    return if (type.startsWith("video/")) videoFrame(uri, maxSize) else scaledImage(uri, maxSize)
  }

  /** First frame; never loads the whole video into memory. */
  private fun videoFrame(uri: Uri, maxSize: Int): Bitmap? {
    val retriever = MediaMetadataRetriever()
    return try {
      retriever.setDataSource(context, uri)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        retriever.getScaledFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC, maxSize, maxSize)
      } else {
        retriever.getFrameAtTime(0, MediaMetadataRetriever.OPTION_CLOSEST_SYNC)?.let { scaleDown(it, maxSize) }
      }
    } catch (e: Exception) {
      null
    } finally {
      retriever.release()
    }
  }

  /** Decodes at a fraction of the full size, then turns it upright per EXIF. */
  private fun scaledImage(uri: Uri, maxSize: Int): Bitmap? =
    try {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
      var sample = 1
      while (maxOf(bounds.outWidth, bounds.outHeight) / (sample * 2) >= maxSize) sample *= 2
      val options = BitmapFactory.Options().apply { inSampleSize = sample }
      val bitmap = resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, options) }
      bitmap?.let { rotate(scaleDown(it, maxSize), exifRotation(uri)) }
    } catch (e: Exception) {
      null
    }

  private fun exifRotation(uri: Uri): Int =
    try {
      resolver.openInputStream(uri)?.use { stream ->
        when (ExifInterface(stream).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
          ExifInterface.ORIENTATION_ROTATE_90 -> 90
          ExifInterface.ORIENTATION_ROTATE_180 -> 180
          ExifInterface.ORIENTATION_ROTATE_270 -> 270
          else -> 0
        }
      } ?: 0
    } catch (e: Exception) {
      0
    }

  private fun rotate(bitmap: Bitmap, degrees: Int): Bitmap {
    if (degrees == 0) return bitmap
    val matrix = Matrix().apply { postRotate(degrees.toFloat()) }
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
      .also { if (it !== bitmap) bitmap.recycle() }
  }

  private fun scaleDown(bitmap: Bitmap, maxSize: Int): Bitmap {
    val scale = maxSize.toFloat() / maxOf(bitmap.width, bitmap.height)
    if (scale >= 1f) return bitmap
    return Bitmap.createScaledBitmap(bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true)
      .also { if (it !== bitmap) bitmap.recycle() }
  }
}
