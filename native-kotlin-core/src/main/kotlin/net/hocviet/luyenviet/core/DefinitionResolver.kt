package net.hocviet.luyenviet.core

/**
 * Logic tương đương [renderDefinitionPanel] (main.js), không phụ thuộc UI.
 *
 * @param inputRaw nội dung ô «Chọn chữ»
 * @param detailChar chữ đang xem (currentChar khi luyện/demo nhiều chữ)
 */
fun resolveDefinitionDisplay(
    inputRaw: String,
    detailChar: String,
    definitions: Map<String, CharDefinition>,
    wordDefinitions: Map<String, WordDefinition>,
    drawableSet: Set<String>,
): DefinitionDisplay {
    if (definitions.isEmpty()) {
        return DefinitionDisplay.Empty(
            "Chưa tải được từ điển. Chạy build-definitions rồi đóng gói lại assets.",
        )
    }

    val seq = parseDrawableSequence(inputRaw, drawableSet)
    val compoundKey = seq.joinToString("")

    if (seq.size >= 2) {
        val wd = wordDefinitions[compoundKey]
        if (wd != null) return DefinitionDisplay.Compound(wd)
    }

    val d = definitions[detailChar]
    return if (d != null) {
        DefinitionDisplay.SingleChar(d)
    } else {
        DefinitionDisplay.Empty("Không có mục giải nghĩa cho chữ này trong bộ từ điển đã tải.")
    }
}
