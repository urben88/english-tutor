from backend.core.context import ContextBudget, build_context
from backend.core.models import StoredMessage, Summary


def count(text: str) -> int:
    return len(text.split())


def msgs(*texts: str) -> list[StoredMessage]:
    return [StoredMessage(i + 1, 1, "user" if i % 2 == 0 else "assistant", t)
            for i, t in enumerate(texts)]


BIG = ContextBudget(num_ctx=1000, num_predict=100, margin=100)


def test_budget_formula():
    assert BIG.available == 800
    b = ContextBudget.from_params({"num_ctx": 4096, "num_predict": 256}, margin=256)
    assert b.available == 4096 - 256 - 256


def test_budget_defaults_when_params_missing():
    assert ContextBudget.from_params({}, margin=100).available == 4096 - 256 - 100


def test_system_user_always_present_and_order():
    plan = build_context("SYS", Summary(), msgs("a b", "c d"), "now", count, BIG)
    assert [(m.role, m.content) for m in plan.messages] == [
        ("system", "SYS"), ("user", "a b"), ("assistant", "c d"), ("user", "now")]
    assert plan.fold == []


def test_system_and_user_kept_even_if_over_budget():
    tiny = ContextBudget(num_ctx=10, num_predict=5, margin=4)
    plan = build_context("one two three", Summary(), msgs("old turn"), "four five six", count, tiny)
    assert plan.messages[0].content == "one two three"
    assert plan.messages[-1].content == "four five six"
    assert len(plan.messages) == 2 and [m.id for m in plan.fold] == [1]


def test_trims_oldest_to_budget_and_marks_fold():
    # available = 20; fixed = 1 (sys) + 1 (user) = 2; each turn costs 6 -> 3 fit
    b = ContextBudget(num_ctx=30, num_predict=5, margin=5)
    hist = msgs(*[f"t{i} a b c d e" for i in range(5)])
    plan = build_context("S", Summary(), hist, "u", count, b)
    kept = [m.content for m in plan.messages[1:-1]]
    assert kept == [h.content for h in hist[-3:]]
    assert [m.id for m in plan.fold] == [1, 2]


def test_summary_included_when_present_and_costs_budget():
    plan = build_context("S", Summary("we talked", 4), msgs("a"), "u", count, BIG)
    assert plan.messages[1].role == "system" and "we talked" in plan.messages[1].content
    assert build_context("S", Summary(), [], "u", count, BIG).messages[1].content == "u"


def test_no_fold_within_budget():
    assert build_context("S", Summary("x", 1), msgs("a", "b"), "u", count, BIG).fold == []
