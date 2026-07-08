import sys

def main():
    config_path = "/etc/nginx/sites-available/cobrother"
    try:
        with open(config_path, "r") as f:
            content = f.read()
            # Normalize line endings to avoid matching failures due to CRLF/LF mismatch
            content = content.replace("\r\n", "\n")
    except Exception as e:
        print(f"Error reading config: {e}")
        sys.exit(1)

    target = """    location / {
        try_files $uri $uri/ /index.html;
    }"""

    replacement = """    location / {
        # Check if bot
        set $is_bot "";
        if ($http_user_agent ~* "facebookexternalhit|WhatsApp|twitterbot|linkedinbot|telegrambot|slackbot|discordbot|googlebot|bingbot") {
            set $is_bot "Y";
        }
        
        # Check if listing route
        set $is_listing "";
        if ($uri ~* "^/(ventures|auction|creator-auction|technology/auction|software-auction)/[0-9a-fA-F-]+$") {
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
            rewrite ^/domains$ /api/v1/public/share-preview/domains/$arg_id last;
            rewrite ^/technology$ /api/v1/public/share-preview/technology/$arg_id last;
            rewrite ^/auction/([0-9a-f-]+)$ /api/v1/public/share-preview/auction/$1 last;
            rewrite ^/auctions$ /api/v1/public/share-preview/auction/$arg_id last;
            rewrite ^/creator-auction/([0-9a-f-]+)$ /api/v1/public/share-preview/creator-auction/$1 last;
            rewrite ^/technology/auction/([0-9a-f-]+)$ /api/v1/public/share-preview/technology-auction/$1 last;
            rewrite ^/software-auction/([0-9a-f-]+)$ /api/v1/public/share-preview/technology-auction/$1 last;
        }

        try_files $uri $uri/ /index.html;
    }"""

    if target in content:
        content = content.replace(target, replacement)
        print("Updated Nginx location block.")
    else:
        # Fallback in case spacing is slightly different
        print("Target location block not found. Trying regex or manual check.")
        if "try_files $uri $uri/ /index.html;" in content and "facebookexternalhit" not in content:
            # Let's replace the try_files line
            old_str = "location / {\n        try_files $uri $uri/ /index.html;\n    }"
            if old_str in content:
                content = content.replace(old_str, replacement)
                print("Updated Nginx location block via fallback spacing 1.")
            else:
                # Replace try_files $uri $uri/ /index.html; directly inside location /
                # Find 'location / {'
                idx = content.find("location / {")
                if idx != -1:
                    # Replace next try_files to index.html with replacement
                    end_idx = content.find("}", idx)
                    if end_idx != -1:
                        block = content[idx:end_idx+1]
                        content = content.replace(block, replacement)
                        print("Updated Nginx location block via fallback spacing 2.")

    with open(config_path, "w") as f:
        f.write(content)
    print("Nginx config file written successfully.")

if __name__ == "__main__":
    main()
