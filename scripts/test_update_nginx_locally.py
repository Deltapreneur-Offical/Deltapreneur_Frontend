"""Local-only simulation of update_nginx.py — never touches real /etc paths.

Covers the deploy-path bug fix: the config nginx loads (sites-enabled) may be
a separate physical file, so the updater must sync the patched content there
too. Scenarios:
  A. Clean backup exists, both files clean          -> full replacement, both synced
  B. Real production state: cfg has /s/, act stale  -> act synced, cfg untouched
  C. Re-run after B                                  -> idempotent (no dupes)
  D. act is a symlink to cfg                         -> never clobbered
  E. Already-patched without /s/ (pre-fix state)     -> inject path, both synced
"""
import os
import subprocess
import sys
import tempfile

tmp = tempfile.mkdtemp()
cfg = os.path.join(tmp, "cobrother").replace("\\", "/")
bak = os.path.join(tmp, "cobrother.save").replace("\\", "/")
act = os.path.join(tmp, "cobrother.enabled").replace("\\", "/")

src = open(os.path.join(os.path.dirname(__file__), "update_nginx.py")).read()
# Replace longest/most specific paths first so shorter prefixes don't collide.
src = src.replace("/etc/nginx/sites-available/cobrother.save", bak)
src = src.replace("/etc/nginx/sites-enabled/cobrother", act)
src = src.replace("/etc/nginx/sites-available/cobrother", cfg)
test_script = os.path.join(tmp, "update_nginx_test.py")
with open(test_script, "w") as f:
    f.write(src)


def run(script):
    return subprocess.run([sys.executable, script], capture_output=True, text=True)


S_RULE = "rewrite ^/s/([A-Za-z0-9_-]+)/?$ /api/v1/public/share-preview/s/$1 last;"

clean = """server {
    listen 80;
    server_name cobrother.com www.cobrother.com;
    root /opt/cobrother/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
"""

old_without_s = """server {
    listen 80;
    server_name cobrother.com www.cobrother.com;
    root /opt/cobrother/frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ @react;
    }
    location @react {
        set $is_bot "";
        if ($http_user_agent ~* "facebookexternalhit|WhatsApp|twitterbot|linkedinbot") {
            set $is_bot "Y";
        }
        if ($http_accept !~* "html") {
            set $is_bot "Y";
        }
        set $is_listing "";
        if ($uri ~* "^/(ventures|domains|technology|auction|creator-auction|technology/auction|software-auction)/[0-9a-fA-F-]+/?$") {
            set $is_listing "Y";
        }
        set $bot_listing "$is_bot$is_listing";
        if ($bot_listing = "YY") {
            rewrite ^/ventures/deals/([0-9a-f-]+)/?$ /api/v1/public/share-preview/deals/$1 last;
        }
        rewrite ^ /index.html break;
    }
}
"""

patched_with_s = old_without_s.replace(
    '        set $bot_listing "$is_bot$is_listing";',
    '        if ($uri ~* "^/s/[A-Za-z0-9_-]+/?$") {\n'
    '            set $is_listing "Y";\n'
    '        }\n'
    '        set $bot_listing "$is_bot$is_listing";',
).replace(
    'if ($bot_listing = "YY") {',
    'if ($bot_listing = "YY") {\n'
    '            ' + S_RULE,
)


def assert_s_rule(path, label, expected_count):
    out = open(path).read()
    assert out.count("share-preview/s/") == expected_count, (
        f"FAIL {label}: expected {expected_count} share-preview/s/ in {path}, got {out.count('share-preview/s/')}"
    )
    assert out.count(S_RULE) == expected_count, f"FAIL {label}: rewrite rule count mismatch in {path}"


# --- Scenario A: clean backup exists; both cfg and act are clean -------------
with open(bak, "w") as f:
    f.write(clean)
with open(cfg, "w") as f:
    f.write(clean)
with open(act, "w") as f:
    f.write(clean)
r = run(test_script)
assert_s_rule(cfg, "A/cfg", 1)
assert_s_rule(act, "A/act", 1)
assert "Active config updated" in r.stdout, "FAIL A: active not synced\n" + r.stdout + r.stderr
print("--- Scenario A (clean -> full replacement, both files synced) OK ---")

# --- Scenario B: real production state --------------------------------------
# No backup. cfg already has /s/ (deployed earlier); act is a separate physical
# file WITHOUT /s/ (what nginx actually loads).
os.remove(bak)
with open(cfg, "w") as f:
    f.write(patched_with_s)
with open(act, "w") as f:
    f.write(old_without_s)
r = run(test_script)
assert_s_rule(cfg, "B/cfg", 1)
assert_s_rule(act, "B/act", 1)
print("--- Scenario B (prod state: cfg has /s/, stale act synced) OK ---")

# --- Scenario C: idempotent re-run -------------------------------------------
r = run(test_script)
assert_s_rule(cfg, "C/cfg", 1)
assert_s_rule(act, "C/act", 1)
print("--- Scenario C (idempotent re-run, no dupes) OK ---")

# --- Scenario D: act is a symlink to cfg -> never clobbered -------------------
os.remove(act)
symlink_ok = True
try:
    os.symlink(cfg, act)
except OSError as e:
    symlink_ok = False
    print(f"--- Scenario D skipped (cannot create symlink on this OS): {e} ---")
if symlink_ok:
    r = run(test_script)
    assert os.path.islink(act), "FAIL D: active should still be a symlink"
    assert os.path.realpath(act) == os.path.realpath(cfg), "FAIL D: symlink target changed"
    assert_s_rule(cfg, "D/cfg", 1)
    print("--- Scenario D (symlink preserved, never clobbered) OK ---")

# --- Scenario E: already-patched WITHOUT /s/ (pre-fix state) -> inject path ---
if os.path.islink(act):
    os.remove(act)
with open(cfg, "w") as f:
    f.write(old_without_s)
with open(act, "w") as f:
    f.write(old_without_s)
r = run(test_script)
assert_s_rule(cfg, "E/cfg", 1)
assert_s_rule(act, "E/act", 1)
print("--- Scenario E (already-patched no /s/ -> inject, both synced) OK ---")

# --- Scenario F: idempotent after inject path --------------------------------
r = run(test_script)
assert_s_rule(cfg, "F/cfg", 1)
assert_s_rule(act, "F/act", 1)
print("--- Scenario F (inject path idempotent) OK ---")

print("ALL end-to-end scenarios pass")
