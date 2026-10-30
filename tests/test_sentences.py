from backend.core.sentences import iter_sentences


def test_first_sentence_is_emitted_even_when_shorter_than_min_chars():
    chunks = ["Hi. ", "This is a longer second sentence that goes past sixty characters easily."]
    out = list(iter_sentences(chunks))
    assert out[0] == "Hi."
    assert out[1].startswith("This is a longer second sentence")


def test_later_sentences_group_until_min_chars():
    chunks = ["Hi. ", "Short one. ", "Another short one. ",
              "And here is one more sentence that crosses the limit."]
    out = list(iter_sentences(chunks))
    assert out[0] == "Hi."
    assert out[1] == ("Short one. Another short one. "
                      "And here is one more sentence that crosses the limit.")


def test_decimal_point_is_not_a_boundary():
    chunks = ["It costs 3.5 dollars. ", "Then a second sentence long enough to stand alone here."]
    out = list(iter_sentences(chunks))
    assert out[0] == "It costs 3.5 dollars."


def test_decimal_split_across_chunks_stays_whole():
    assert list(iter_sentences(["It costs 3.", "5 dollars."])) == ["It costs 3.5 dollars."]


def test_newline_is_a_boundary():
    assert list(iter_sentences(["Line one\nLine two ending here."])) == [
        "Line one", "Line two ending here."]


def test_long_piece_without_boundary_is_cut_at_a_space():
    text = "word " * 60
    out = list(iter_sentences([text], min_chars=10, max_chars=50))
    assert len(out) > 1
    assert all(len(piece) <= 50 for piece in out)
    assert "".join(out).replace(" ", "") == text.replace(" ", "")


def test_remainder_is_flushed_at_the_end():
    assert list(iter_sentences(["no terminator at all"])) == ["no terminator at all"]
    assert list(iter_sentences([])) == []


def test_empty_chunks_are_ignored():
    assert list(iter_sentences(["", "Hi. ", ""])) == ["Hi."]
