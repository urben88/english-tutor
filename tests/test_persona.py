import pytest

from backend.core.persona import Persona, available_personas, load_persona


def test_loads_persona_from_dir(tmp_path):
    (tmp_path / "bob.yaml").write_text(
        "name: Bob\nvoice: F1\nsystem_prompt: Be brief.\n", encoding="utf-8")
    p = load_persona("bob", tmp_path)
    assert p == Persona(stem="bob", name="Bob", voice="F1", system_prompt="Be brief.")


def test_unknown_persona_lists_available(tmp_path):
    (tmp_path / "bob.yaml").write_text("name: B\nvoice: M1\nsystem_prompt: x\n", encoding="utf-8")
    (tmp_path / "amy.yaml").write_text("name: A\nvoice: M1\nsystem_prompt: x\n", encoding="utf-8")
    with pytest.raises(ValueError) as e:
        load_persona("nope", tmp_path)
    assert "nope" in str(e.value) and "amy, bob" in str(e.value)
    assert available_personas(tmp_path) == ["amy", "bob"]


def test_missing_field_is_clear_error(tmp_path):
    (tmp_path / "bad.yaml").write_text("name: B\nvoice: M1\n", encoding="utf-8")
    with pytest.raises(ValueError, match="system_prompt"):
        load_persona("bad", tmp_path)


def test_default_persona_file_meets_spec():
    p = load_persona("emma")
    assert p.voice == "M1" and p.name and p.system_prompt.strip()
    low = p.system_prompt.lower()
    assert "markdown" in low and "emoji" in low
