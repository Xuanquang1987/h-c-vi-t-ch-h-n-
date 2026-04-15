package net.hocviet.luyenviet.core

/**
 * Giống [parseDrawableSequence] trong main.js:
 * chỉ giữ ký tự có trong tập chữ có dữ liệu nét.
 */
fun parseDrawableSequence(raw: String, drawableSet: Set<String>): List<String> {
    val out = ArrayList<String>()
    for (g in raw.trim()) {
        val s = g.toString()
        if (drawableSet.contains(s)) out.add(s)
    }
    return out
}
