import re
import sys
import os

def main():
    config_path = "/etc/nginx/sites-available/cobrother"
    backup_path = "/etc/nginx/sites-available/cobrother.save"
    
    # Always read from the clean backup if it exists, to ensure we have a clean source configuration
    source_path = backup_path if os.path.exists(backup_path) else config_path
    
    print(f"Reading configuration source from: {source_path}")
    try:
        with open(source_path, "r") as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading config: {e}")
        sys.exit(1)

    # Normalize line endings to avoid matching failures due to CRLF/LF mismatch
    content = content.replace("\r\n", "\n")

    replacement = """    location / {
        try_files $uri $uri/ @react;
    }

    location @react {
        # Check if bot
        set $is_bot "";
        if ($http_user_agent ~* "facebookexternalhit|WhatsApp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|googlebot|bingbot|opengraph|OpenGraphXYZBot") {
            set $is_bot "Y";
        }
        if ($http_accept !~* "html") {
            set $is_bot "Y";
        }
        
        # Check if listing route
        set $is_listing "";
        if ($uri ~* "^/(ventures|domains|technology|auction|creator-auction|technology/auction|software-auction)/[0-9a-fA-F-]+/?$") {
            set $is_listing "Y";
        }
        if ($uri ~* "^/s/[A-Za-z0-9_-]+/?$") {
            set $is_listing "Y";
        }
        if ($uri ~* "^/ventures/deals/[0-9a-fA-F-]+/?$") {
            set $is_listing "Y";
        }
        if ($uri ~* "^/domains/?$") {
            set $is_listing "Y";
        }
        if ($uri ~* "^/technology/?$") {
            set $is_listing "Y";
        }
        if ($uri ~* "^/auctions/?$") {
            set $is_listing "Y";
        }
        
        set $bot_listing "$is_bot$is_listing";
        if ($bot_listing = "YY") {
            rewrite ^/s/([A-Za-z0-9_-]+)/?$ /api/v1/public/share-preview/s/$1 last;
            rewrite ^/ventures/deals/([0-9a-f-]+)/?$ /api/v1/public/share-preview/deals/$1 last;
            rewrite ^/ventures/([0-9a-f-]+)/?$ /api/v1/public/share-preview/ventures/$1 last;
            rewrite ^/domains/([0-9a-f-]+)/?$ /api/v1/public/share-preview/domains/$1 last;
            rewrite ^/domains/?$ /api/v1/public/share-preview/domains/$arg_id last;
            rewrite ^/technology/([0-9a-f-]+)/?$ /api/v1/public/share-preview/technology/$1 last;
            rewrite ^/technology/?$ /api/v1/public/share-preview/technology/$arg_id last;
            rewrite ^/auction/([0-9a-f-]+)/?$ /api/v1/public/share-preview/auction/$1 last;
            rewrite ^/auctions/?$ /api/v1/public/share-preview/auction/$arg_id last;
            rewrite ^/creator-auction/([0-9a-f-]+)/?$ /api/v1/public/share-preview/creator-auction/$1 last;
            rewrite ^/technology/auction/([0-9a-f-]+)/?$ /api/v1/public/share-preview/technology-auction/$1 last;
            rewrite ^/software-auction/([0-9a-f-]+)/?$ /api/v1/public/share-preview/technology-auction/$1 last;
        }

        rewrite ^ /index.html break;
    }

    location /api/v1/public/share-preview/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }"""

    # Robust regex matching location / block with try_files to index.html
    pattern = r"location\s+/\s*\{[^{}]*try_files[^{}]+/index.html;[^{}]*\}"
    
    if re.search(pattern, content):
        content = re.sub(pattern, replacement, content)
        print("Updated Nginx location block via regex.")
    elif "facebookexternalhit" in content:
        # Config already contains the bot rules from an earlier deploy (the
        # regex target no longer exists). Idempotently inject the /s/{token}
        # share-preview rules so tokenized share links also get the rich OG
        # page — this covers servers patched before the /s/ rule existed.
        print("Config already contains bot rules; injecting /s/ share-preview rules.")
        content = inject_share_s_rules(content)
    else:
        print("Config does not contain target block. Writing unmodified backup.")

    with open(config_path, "w") as f:
        f.write(content)
    print("Nginx config file written successfully.")


def inject_share_s_rules(content: str) -> str:
    """Insert the /s/{token} crawler rules into an already-patched nginx config.

    Idempotent: a no-op when the rules are already present, so running the
    updater repeatedly never duplicates them.
    """
    if "share-preview/s/" in content:
        print("  /s/ share-preview rules already present — skipping.")
        return content

    # 1) is_listing check for /s/{token} (inserted before the bot_listing flag)
    listing_anchor = 'set $bot_listing "$is_bot$is_listing";'
    if listing_anchor not in content:
        print("  WARNING: could not find $bot_listing anchor; /s/ listing check NOT injected.")
    else:
        s_listing = (
            '        if ($uri ~* "^/s/[A-Za-z0-9_-]+/?$") {\n'
            '            set $is_listing "Y";\n'
            '        }\n'
            '        \n'
        )
        content = content.replace(listing_anchor, s_listing + "        " + listing_anchor, 1)

    # 2) rewrite rule inside the bot_listing block
    rewrite_anchor = 'if ($bot_listing = "YY") {'
    if rewrite_anchor not in content:
        print("  WARNING: could not find $bot_listing=YY anchor; /s/ rewrite NOT injected.")
    else:
        s_rewrite = '            rewrite ^/s/([A-Za-z0-9_-]+)/?$ /api/v1/public/share-preview/s/$1 last;\n'
        content = content.replace(rewrite_anchor, rewrite_anchor + "\n" + s_rewrite, 1)

    print("  /s/ share-preview rules injected.")
    return content

if __name__ == "__main__":
    main()
