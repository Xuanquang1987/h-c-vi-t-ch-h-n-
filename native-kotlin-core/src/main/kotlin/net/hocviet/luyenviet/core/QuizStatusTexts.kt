package net.hocviet.luyenviet.core

/**
 * Chuỗi trạng thái giống setStatus trong main.js (để đồng bộ copy UI).
 */
object QuizStatusTexts {
    const val NEED_STROKE_DATA = "Nhập ít nhất một chữ Hán có dữ liệu nét trong bộ."
    const val NO_CHAR_FOR_DEMO = "Không có chữ nào trong ô có dữ liệu nét để xem mẫu."
    const val NO_CHAR_FOR_QUIZ = "Không có chữ nào trong ô có dữ liệu nét để luyện."
    const val LOAD_STROKE_FAIL = "Không tải được dữ liệu nét."

    fun mistakeStroke(strokeNumZeroBased: Int) =
        "Chưa đúng nét thứ ${strokeNumZeroBased + 1} — viết lại đúng nét này (đúng thứ tự) rồi mới sang nét sau."

    fun demoProgress(i: Int, len: Int, ch: String) = "Bắt đầu ${i + 1}/$len: «$ch»"
    fun quizProgress(index: Int, len: Int, ch: String) = "Luyện ${index + 1}/$len: «$ch»"

    fun quizDoneChar(ch: String, mistakes: Int) =
        if (mistakes > 0) "«$ch» xong · sai $mistakes lần" else "«$ch» xong"

    fun quizNext() = " — sang chữ tiếp…"
    fun quizEndChain() = " — hết chuỗi."
    fun singleDone(mistakes: Int) =
        if (mistakes > 0) "Xong · sai $mistakes lần" else "Xong"
}
