import pytest

from backend.adapters import registry
from backend.core.config import AdapterSelection, AppConfig, load_config, parse_config


class Dummy:
    def __init__(self, **params):
        self.params = params


@pytest.fixture
def dummy():
    registry.register("llm", "dummy", Dummy)
    yield
    registry.unregister("llm", "dummy")


def test_builds_selected_adapter_with_params(dummy):
    obj = registry.build("llm", AdapterSelection("dummy", {"model": "x"}))
    assert isinstance(obj, Dummy) and obj.params == {"model": "x"}


def test_unknown_adapter_names_valid_options():
    with pytest.raises(ValueError) as e:
        registry.build("tts", AdapterSelection("nope"))
    assert "nope" in str(e.value) and "supertonic" in str(e.value)


def test_unknown_port():
    with pytest.raises(ValueError, match="Valid ports"):
        registry.build("video", AdapterSelection("x"))


def test_parse_config_requires_adapter():
    with pytest.raises(ValueError, match="stt"):
        parse_config({"llm": {"adapter": "a"}, "tts": {"adapter": "b"}})


def test_parse_config_and_build(dummy):
    cfg = parse_config({p: {"adapter": "dummy", "params": {"k": 1}} for p in ("stt", "llm", "tts")})
    assert isinstance(cfg, AppConfig)
    assert registry.build_llm(cfg).params == {"k": 1}


def test_repo_config_yaml_parses():
    cfg = load_config("config.yaml")
    assert (cfg.stt.adapter, cfg.llm.adapter, cfg.tts.adapter) == (
        "whisper_cpp", "ollama", "supertonic")
