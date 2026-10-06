package dev.devnik.safscan

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoSafScanModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoSafScan")

    Function("hello") {
      "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { value: String ->
    }
  }
}
