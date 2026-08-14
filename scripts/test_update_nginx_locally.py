"""Local-only simulation of update_nginx.py — never touches real /etc paths."""
import os
import subprocess
import sys
import tempfile

tmp = tempfile.mkdtemp()
cfg = os.path.join(tmp, "cobrother").replace("\\", "/")
bak = os.path.join(tmp, "cobrother.save").replace("\\", "/")

src = open(os.path.join(os.path.dirname(__file__), "update_nginx.py")).read()
src = src.replace("/etc/nginx/sites-available/cobrother.save", bak)
src = src.replace("/etc/nginx/sites-available/cobrother", cfg)
test_script = os.path.join(tmp, "update_nginx_test.py")
with open(test_script, "w") as f:
    f.write(src)


def run(script):
    return subprocess.run([sys.executable, script], capture_output=True, text=True)


# Scenario A: backup (clean original) exists -> full replacement path
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
with open(bak, "w") as f:
    f.write(clean)
with open(cfg, "w") as f:
    f.write(clean)
r = run(test_script)
out = open(cfg).read()
assert "rewrite ^/s/([A-Za-z0-9_-]+)/?$ /api/v1/public/share-preview/s/$1 last;" in out, (
    "FAIL A: /s/ missing\n" + r.stdout + r.stderr
)
assert out.count("share-preview/s/") == 1, "FAIL A: dup"
print("--- Scenario A (clean backup -> full replacement) OK ---")

# Scenario B: no backup, config already has old bot rules (no /s/)
os.remove(bak)
patched = """server {
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
with open(cfg, "w") as f:
    f.write(patched)
r = run(test_script)
out2 = open(cfg).read()
assert "rewrite ^/s/([A-Za-z0-9_-]+)/?$ /api/v1/public/share-preview/s/$1 last;" in out2, (
    "FAIL B: /s/ missing\n" + r.stdout + r.stderr
)
assert "^/s/[A-Za-z0-9_-]+/?$" in out2, "FAIL B: is_listing missing"
assert out2.count("share-preview/s/") == 1, "FAIL B: dup"
print("--- Scenario B (already-patched -> inject path) OK ---")

# Scenario C: idempotent re-run
r = run(test_script)
out3 = open(cfg).read()
assert out3.count("share-preview/s/") == 1, "FAIL C: not idempotent"
print("--- Scenario C (idempotent) OK ---")
print("ALL end-to-end scenarios pass")
