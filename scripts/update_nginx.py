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
        
        # Check if listing route
        set $is_listing "";
        if ($uri ~* "^/(ventures|domains|technology|auction|creator-auction|technology/auction|software-auction)/[0-9a-fA-F-]+$") {
            set $is_listing "Y";
        }
        if ($uri ~* "^/ventures/deals/[0-9a-fA-F-]+$") {
            set $is_listing "Y";
        }
        if ($uri = "/domains") {
            set $is_listing "Y";
        }
        if ($uri = "/technology") {
            set $is_listing "Y";
        }
        if ($uri = "/auctions") {
            set $is_listing "Y";
        }
        
        set $bot_listing "$is_bot$is_listing";
        if ($bot_listing = "YY") {
            rewrite ^/ventures/deals/([0-9a-f-]+)$ /api/v1/public/share-preview/deals/$1 last;
            rewrite ^/ventures/([0-9a-f-]+)$ /api/v1/public/share-preview/ventures/$1 last;
            rewrite ^/domains/([0-9a-f-]+)$ /api/v1/public/share-preview/domains/$1 last;
            rewrite ^/domains$ /api/v1/public/share-preview/domains/$arg_id last;
            rewrite ^/technology/([0-9a-f-]+)$ /api/v1/public/share-preview/technology/$1 last;
            rewrite ^/technology$ /api/v1/public/share-preview/technology/$arg_id last;
            rewrite ^/auction/([0-9a-f-]+)$ /api/v1/public/share-preview/auction/$1 last;
            rewrite ^/auctions$ /api/v1/public/share-preview/auction/$arg_id last;
            rewrite ^/creator-auction/([0-9a-f-]+)$ /api/v1/public/share-preview/creator-auction/$1 last;
            rewrite ^/technology/auction/([0-9a-f-]+)$ /api/v1/public/share-preview/technology-auction/$1 last;
            rewrite ^/software-auction/([0-9a-f-]+)$ /api/v1/public/share-preview/technology-auction/$1 last;
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
    else:
        print("Target location block not found via regex.")
        if "facebookexternalhit" in content:
            print("Config already contains bot rules.")
        else:
            print("Config does not contain target block. Writing unmodified backup.")

    with open(config_path, "w") as f:
        f.write(content)
    print("Nginx config file written successfully.")

if __name__ == "__main__":
    main()
