"""Generate narration audio — pure speech only; silence added in assemble.ps1."""
import asyncio
import json
import subprocess
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "edge-tts", "-q"])
    import edge_tts

ROOT = Path(__file__).parent
OUT = ROOT / "output" / "audio"
VOICE = "en-IN-NeerjaNeural"


async def generate_scene(scene: dict) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    out_mp3 = OUT / f"{scene['id']}.mp3"
    communicate = edge_tts.Communicate(scene["narration"], VOICE, rate="-5%")
    await communicate.save(str(out_mp3))
    lead = scene.get("videoLeadInMs", scene.get("audioLeadInMs", 0))
    print(f"  Audio: {out_mp3} (narration only; {lead}ms lead-in applied at assemble)")
    return out_mp3


async def main():
    config = json.loads((ROOT / "scenes.json").read_text(encoding="utf-8"))
    scenes = config["scenes"]
    only = sys.argv[1] if len(sys.argv) > 1 else None
    if only:
        scenes = [s for s in scenes if s["id"] == only or s["id"].startswith(only)]

    print(f"Generating voice for {len(scenes)} scenes...")
    for scene in scenes:
        await generate_scene(scene)
    print("Voice generation complete.")


if __name__ == "__main__":
    asyncio.run(main())
