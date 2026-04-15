package net.hocviet.luyenviet.core

/** Khớp JSON char-definitions / word-definitions (app web). */
data class CharDefinition(
    val chu: String,
    val hanViet: String,
    val nghia: String,
    val vidu: String,
    val pinyin: String? = null,
)

data class WordDefinition(
    val chu: String,
    val hanViet: String,
    val nghia: String,
    val vidu: String,
    val pinyin: String? = null,
    val source: String? = null,
)

/** Kết quả hiển thị một khối «Giải nghĩa» (tương đương renderDefinitionPanel). */
sealed class DefinitionDisplay {
    data class Compound(val def: WordDefinition) : DefinitionDisplay()
    data class SingleChar(val def: CharDefinition) : DefinitionDisplay()
    data class Empty(val message: String) : DefinitionDisplay()
}
