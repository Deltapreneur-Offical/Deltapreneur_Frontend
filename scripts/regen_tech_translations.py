#!/usr/bin/env python3
"""Regenerate tech translation keys from DEFAULT_SERVICES_SEED and add Chinese translations."""
import json, re, sys

SEED = [
    {"slug": "ai-business-suite", "name": "AI Business Suite", "category": "AI", "badge": "Popular",
     "short_description": "All-in-one AI platform for content creation, automated customer engagement, and business intelligence.",
     "features": ["AI Content Writer & Editor", "Automated Lead Scoring", "Smart Document Summarizer", "Multi-model LLM Switching", "24/7 AI Customer Copilot"]},
    {"slug": "website-builder", "name": "Website Builder", "category": "Business", "badge": "Featured",
     "short_description": "Next-gen visual web builder with custom domains, AI layout generator, and built-in SEO.",
     "features": ["Drag-and-Drop Drag Builder", "AI Page Generator", "Free SSL Certificate", "Custom Domain Integration", "Mobile-Optimized Responsive Layouts"]},
    {"slug": "crm", "name": "CRM", "category": "Business", "badge": "Best Seller",
     "short_description": "Streamlined customer relationship management, sales pipeline tracking, and automated client follow-ups.",
     "features": ["Kanban Sales Pipeline", "Automated Email Sequences", "Contact & Lead Activity History", "Task & Reminder Scheduler", "Revenue Forecasting Reports"]},
    {"slug": "invoice-ai", "name": "Invoice AI", "category": "Productivity", "badge": "AI Powered",
     "short_description": "Smart automated invoicing, expense tracking, and GST/Tax report generation.",
     "features": ["Instant Invoice Generation", "Automated Recurring Invoices", "Payment Link Integration", "Tax & GST Ready Summaries", "Client Receipt Portal"]},
    {"slug": "appointment-booking", "name": "Appointment Booking", "category": "Productivity", "badge": "Essential",
     "short_description": "Seamless online scheduling calendar with automatic video link generation and SMS reminders.",
     "features": ["Real-time Multi-Calendar Sync", "Automated Zoom/Google Meet Links", "Custom Booking Link & Page", "SMS & Email Reminders", "Buffer Time & Timezone Detection"]},
    {"slug": "document-signer", "name": "Document Signer", "category": "Productivity", "badge": "Secure",
     "short_description": "Legally binding e-signatures, document audit trails, and contract templates.",
     "features": ["Legally Binding E-Signatures", "Audit Trail & Timestamp Certificates", "Reusable Contract Templates", "Multi-Signer Sequential Workflows", "Secure Cloud Storage"]},
    {"slug": "cloud-storage", "name": "Cloud Storage", "category": "Storage", "badge": "High Speed",
     "short_description": "Secure encrypted cloud storage, team file sharing, and version control.",
     "features": ["End-to-End Encrypted Vaults", "Granular Link Sharing & Passwords", "File Versioning & Rollback", "Team Workspace Folders", "High-Speed Global Sync"]},
    {"slug": "business-phone", "name": "Business Phone", "category": "Communication", "badge": "Virtual VoIP",
     "short_description": "Cloud business VoIP phone system with IVR menus, call routing, and voicemail transcriptions.",
     "features": ["Global Virtual Numbers", "Interactive Voice Response (IVR)", "Mobile & Desktop Softphone", "Voicemail-to-Text Transcripts", "Call Recording & Analytics"]},
    {"slug": "vpn", "name": "VPN", "category": "Security", "badge": "Privacy",
     "short_description": "High-speed encrypted VPN network for safe browsing, remote access, and IP protection.",
     "features": ["AES-256 WireGuard Encryption", "Zero-Logs Privacy Guarantee", "60+ Global Server Locations", "Automatic Network Kill Switch", "Multi-Device Support"]},
    {"slug": "email-marketing", "name": "Email Marketing", "category": "Marketing", "badge": "Automation",
     "short_description": "Automated email newsletters, drip campaigns, contact segmentation, and broadcast analytics.",
     "features": ["Drag-and-Drop Email Builder", "Automated Drip Workflows", "Contact Tagging & Segmentation", "Real-Time Open & Click Tracking", "High Deliverability Infrastructure"]},
    {"slug": "social-media-automation", "name": "Social Media Automation", "category": "Marketing", "badge": "Auto Post",
     "short_description": "Schedule posts, generate hashtags, and track performance across X, LinkedIn, Instagram, and Facebook.",
     "features": ["Multi-Channel Content Scheduler", "AI Hashtag & Caption Generator", "Visual Social Feed Planner", "Cross-Platform Auto-Posting", "Engagement Analytics Dashboard"]},
    {"slug": "reputation-management", "name": "Reputation Management", "category": "Marketing", "badge": "Reviews",
     "short_description": "Monitor brand reviews, automate feedback collection, and manage online sentiment.",
     "features": ["Multi-Platform Review Aggregator", "Automated SMS/Email Feedback Requests", "Custom Website Review Widgets", "Sentiment Analysis Reports", "Review Response Templates"]},
    {"slug": "link-in-bio", "name": "Link in Bio", "category": "Marketing", "badge": "Creator",
     "short_description": "Customizable landing link page for social media bios with custom domains and analytics.",
     "features": ["Drag-and-Drop Link Builder", "Custom Domain Landing Page", "Click & Conversion Analytics", "QR Code Generator", "Email & SMS Collection Forms"]},
    {"slug": "smm-growth", "name": "SMM Growth", "category": "Marketing", "badge": "Organic",
     "short_description": "Data-driven organic social media growth toolkit, hashtag research, and competitor benchmarking.",
     "features": ["AI Growth Strategy Generator", "Competitor Benchmarking Tools", "Hashtag Research Engine", "Content Performance Predictor", "Audience Growth Analytics"]},
    {"slug": "esim", "name": "eSIM", "category": "Communication", "badge": "Global Data",
     "short_description": "Instant global mobile data eSIM profiles for 150+ countries with instant QR activation.",
     "features": ["150+ Country Coverage", "Instant QR Activation", "No Physical SIM Required", "Multi-Country Data Bundles", "Real-Time Usage Dashboard"]},
    {"slug": "web-hosting", "name": "Web Hosting", "category": "Hosting", "badge": "99.9% Uptime",
     "short_description": "Ultra-fast NVMe cloud web hosting with free SSL, automated daily backups, and cPanel.",
     "features": ["99.9% Uptime SLA", "Free SSL Certificate", "Automated Daily Backups", "cPanel & Softaculous", "One-Click WordPress Install"]},
]

# Chinese translations
ZH_DESC = {
    "ai-business-suite": "\u4e00\u4f53\u5316AI\u5e73\u53f0\uff0c\u652f\u6301\u5185\u5bb9\u521b\u4f5c\u3001\u81ea\u52a8\u5316\u5ba2\u6237\u4ea4\u4e92\u548c\u5546\u4e1a\u667a\u80fd\u3002",
    "website-builder": "\u65b0\u4e00\u4ee3\u53ef\u89c6\u5316\u7f51\u9875\u6784\u5efa\u5668\uff0c\u652f\u6301\u81ea\u5b9a\u4e49\u57df\u540d\u3001AI\u5e03\u5c40\u751f\u6210\u5668\u548c\u5185\u7f6eSEO\u3002",
    "crm": "\u7cbe\u7b80\u5ba2\u6237\u5173\u7cfb\u7ba1\u7406\uff0c\u9500\u552e\u7ba1\u9053\u8ddf\u8e2a\u548c\u81ea\u52a8\u5316\u5ba2\u6237\u56de\u8bbf\u3002",
    "invoice-ai": "\u667a\u80fd\u81ea\u52a8\u5316\u5f00\u53d1\u7968\u3001\u8d39\u7528\u8ddf\u8e2a\u548cGST/\u7a0e\u52a1\u62a5\u544a\u751f\u6210\u3002",
    "appointment-booking": "\u65e0\u7f1d\u5728\u7ebf\u65e5\u7a0b\u5b89\u6392\uff0c\u81ea\u52a8\u751f\u6210\u89c6\u9891\u94fe\u63a5\u548c\u77ed\u4fe1\u63d0\u9192\u3002",
    "document-signer": "\u6cd5\u5f8b\u7ea6\u675f\u529b\u7535\u5b50\u7b7e\u540d\u3001\u6587\u6863\u5ba1\u8ba1\u8ddf\u8e2a\u548c\u5408\u540c\u6a21\u677f\u3002",
    "cloud-storage": "\u5b89\u5168\u52a0\u5bc6\u4e91\u5b58\u50a8\u3001\u56e2\u961f\u6587\u4ef6\u5171\u4eab\u548c\u7248\u672c\u63a7\u5236\u3002",
    "business-phone": "\u4e91\u7aef\u5546\u52a1VoIP\u7535\u8bdd\u7cfb\u7edf\uff0c\u652f\u6301IVR\u83dc\u5355\u3001\u901a\u8bdd\u8def\u7531\u548c\u8bed\u97f3\u8f6c\u5f55\u3002",
    "vpn": "\u9ad8\u901f\u52a0\u5bc6VPN\u7f51\u7edc\uff0c\u4fdd\u62a4\u5b89\u5168\u6d4f\u89c8\u3001\u8fdc\u7a0b\u8bbf\u95ee\u548cIP\u3002",
    "email-marketing": "\u81ea\u52a8\u5316\u7535\u5b50\u90ae\u4ef6\u8425\u9500\u3001\u6eda\u5c3d\u5f0f\u6d3b\u52a8\u3001\u8054\u7cfb\u4eba\u7ec6\u5206\u548c\u5e7f\u64ad\u5206\u6790\u3002",
    "social-media-automation": "\u5b89\u6392\u5e16\u5b50\u3001\u751f\u6210\u6807\u7b7e\u5e76\u8ddf\u8e2aX\u3001LinkedIn\u3001Instagram\u548cFacebook\u7684\u8868\u73b0\u3002",
    "reputation-management": "\u76d1\u63a7\u54c1\u724c\u8bc4\u8bba\u3001\u81ea\u52a8\u5316\u53cd\u9988\u6536\u96c6\u548c\u7ba1\u7406\u5728\u7ebf\u58f0\u8a89\u3002",
    "link-in-bio": "\u53ef\u81ea\u5b9a\u4e49\u7684\u793e\u4ea4\u5a92\u4f53\u751f\u7269\u94fe\u63a5\u7740\u9646\u9875\u9762\uff0c\u652f\u6301\u81ea\u5b9a\u4e49\u57df\u540d\u548c\u5206\u6790\u3002",
    "smm-growth": "\u6570\u636e\u9a71\u52a8\u7684\u6709\u673a\u793e\u4ea4\u5a92\u4f53\u589e\u957f\u5de5\u5177\u5957\u3001\u6807\u7b7e\u7814\u7a76\u548c\u7ade\u4e89\u5bf9\u624b\u57fa\u51c6\u6d4b\u3002",
    "esim": "\u5168\u7403\u79fb\u52a8\u6570\u636eeSIM\u914d\u7f6e\uff0c\u8986\u76d6150+\u56fd\u5bb6\uff0c\u5373\u65f6QR\u6fc0\u6d3b\u3002",
    "web-hosting": "\u8d85\u5febNVMe\u4e91\u7f51\u7edc\u4e3b\u673a\u6258\u7ba1\uff0c\u514d\u8d39SSL\u3001\u81ea\u52a8\u6bcf\u65e5\u5907\u4efd\u548ccPanel\u3002",
}

ZH_FEATURES = {
    "ai-business-suite": ["AI\u5185\u5bb9\u5199\u624b\u4e0e\u7f16\u8f91\u5668", "\u81ea\u52a8\u5316\u6f5c\u5728\u5ba2\u6237\u8bc4\u5206", "\u667a\u80fd\u6587\u6863\u6458\u8981\u5668", "\u591a\u6a21\u578bLLM\u5207\u6362", "24/7 AI\u5ba2\u6237\u52a9\u624b"],
    "website-builder": ["\u62d6\u653e\u5f0f\u62d6\u62fd\u6784\u5efa\u5668", "AI\u9875\u9762\u751f\u6210\u5668", "\u514d\u8d39SSL\u8bc1\u4e66", "\u81ea\u5b9a\u4e49\u57df\u540d\u96c6\u6210", "\u79fb\u52a8\u7aef\u54cd\u5e94\u5f0f\u5e03\u5c40"],
    "crm": ["\u770b\u677f\u5f0f\u9500\u552e\u7ba1\u9053", "\u81ea\u52a8\u5316\u90ae\u4ef6\u5e8f\u5217", "\u8054\u7cfb\u4eba\u4e0e\u6f5c\u5728\u5ba2\u6237\u6d3b\u52a8\u5386\u53f2", "\u4efb\u52a1\u4e0e\u63d0\u9192\u8c03\u5ea6\u5668", "\u6536\u5165\u9884\u6d4b\u62a5\u544a"],
    "invoice-ai": ["\u5373\u65f6\u53d1\u7968\u751f\u6210", "\u81ea\u52a8\u5316\u5faa\u73af\u53d1\u7968", "\u652f\u4ed8\u94fe\u63a5\u96c6\u6210", "\u7a0e\u52a1\u4e0eGST\u5c31\u7eea\u6458\u8981", "\u5ba2\u6237\u6536\u636e\u95e8\u6237"],
    "appointment-booking": ["\u5b9e\u65f6\u591a\u65e5\u5386\u540c\u6b65", "\u81ea\u52a8Zoom/Google Meet\u94fe\u63a5", "\u81ea\u5b9a\u4e49\u9884\u7ea6\u94fe\u63a5\u548c\u9875\u9762", "\u77ed\u4fe1\u548c\u90ae\u4ef6\u63d0\u9192", "\u7f13\u51b2\u65f6\u95f4\u548c\u65f6\u533a\u68c0\u6d4b"],
    "document-signer": ["\u5177\u6709\u6cd5\u5f8b\u7ea6\u675f\u529b\u7684\u7535\u5b50\u7b7e\u540d", "\u5ba1\u8ba1\u8ddf\u8e2a\u548c\u65f6\u95f4\u6233\u8bc1\u4e66", "\u53ef\u91cd\u7528\u5408\u540c\u6a21\u677f", "\u591a\u65b9\u7b7e\u540d\u4e8b\u52a1\u5de5\u4f5c\u6d41", "\u5b89\u5168\u4e91\u5b58\u50a8"],
    "cloud-storage": ["\u7aef\u5230\u7aef\u52a0\u5bc6\u4fdd\u5b58\u5e93", "\u7cbe\u7ec6\u94fe\u63a5\u5171\u4eab\u548c\u5bc6\u7801\u4fdd\u62a4", "\u6587\u4ef6\u7248\u672c\u63a7\u5236\u548c\u56de\u6eda", "\u56e2\u961f\u5de5\u4f5c\u533a\u6587\u4ef6\u5939", "\u9ad8\u901f\u5168\u7403\u540c\u6b65"],
    "business-phone": ["\u5168\u7403\u865a\u62df\u53f7\u7801", "\u4ea4\u4e92\u5f0f\u8bed\u97f3\u5e94\u7b54(IVR)", "\u79fb\u52a8\u684c\u9762\u8f6f\u7535\u8bdd", "\u8bed\u97f3\u90ae\u4ef6\u8f6c\u6587\u672c", "\u901a\u8bdd\u5f55\u97f3\u548c\u5206\u6790"],
    "vpn": ["AES-256 WireGuard\u52a0\u5bc6", "\u96f6\u65e5\u5fd7\u9690\u79c1\u4fdd\u8bc1", "60+\u5168\u7403\u670d\u52a1\u5668\u4f4d\u7f6e", "\u81ea\u52a8\u7f51\u7edc\u6740\u5b50\u5f00\u5173", "\u591a\u8bbe\u5907\u652f\u6301"],
    "email-marketing": ["\u62d6\u653e\u5f0f\u90ae\u4ef6\u6784\u5efa\u5668", "\u81ea\u52a8\u5316\u6eda\u5c3d\u5f0f\u5de5\u4f5c\u6d41", "\u8054\u7cfb\u4eba\u6807\u8bb0\u4e0e\u7ec6\u5206", "\u5b9e\u65f6\u6253\u5f00\u548c\u70b9\u51fb\u8ddf\u8e2a", "\u9ad8\u6295\u9012\u7387\u57fa\u7840\u8bbe\u65bd"],
    "social-media-automation": ["\u591a\u6e20\u9053\u5185\u5bb9\u8c03\u5ea6\u5668", "AI\u6807\u7b7e\u548c\u9648\u8ff0\u751f\u6210\u5668", "\u53ef\u89c6\u5316\u793e\u4ea4\u4fe1\u606f\u6d41\u89c8\u5217\u5668", "\u8de8\u5e73\u53f0\u81ea\u52a8\u53d1\u5e03", "\u4e92\u52a8\u5206\u6790\u4eea\u8868\u76d8"],
    "reputation-management": ["\u591a\u5e73\u53f0\u8bc4\u8bba\u805a\u5408\u5668", "\u81ea\u52a8\u5316\u77ed\u4fe1/\u90ae\u4ef6\u53cd\u9988\u8bf7\u6c42", "\u81ea\u5b9a\u4e49\u7f51\u7ad9\u8bc4\u8bba\u5c0f\u90e8\u4ef6", "\u60c5\u611f\u5206\u6790\u62a5\u544a", "\u8bc4\u8bba\u56de\u590d\u6a21\u677f"],
    "link-in-bio": ["\u62d6\u653e\u5f0f\u94fe\u63a5\u6784\u5efa\u5668", "\u81ea\u5b9a\u4e49\u57df\u540d\u7740\u9646\u9875\u9762", "\u70b9\u51fb\u548c\u8f6c\u5316\u5206\u6790", "QR\u7801\u751f\u6210\u5668", "\u90ae\u4ef6\u548c\u77ed\u4fe1\u6536\u96c6\u8868\u5355"],
    "smm-growth": ["AI\u589e\u957f\u7b56\u7565\u751f\u6210\u5668", "\u7ade\u4e89\u5bf9\u624b\u57fa\u51c6\u6d4b\u5de5\u5177", "\u6807\u7b7e\u7814\u7a76\u5f15\u64ce", "\u5185\u5bb9\u8868\u73b0\u9884\u6d4b\u5668", "\u53d7\u4f17\u589e\u957f\u5206\u6790"],
    "esim": ["150+\u56fd\u5bb6\u8986\u76d6", "\u5373\u65f6QR\u6fc0\u6d3b", "\u65e0\u9700\u7269\u7406SIM\u5361", "\u591a\u56fd\u6570\u636e\u5957\u9910", "\u5b9e\u65f6\u7528\u91cf\u4eea\u8868\u76d8"],
    "web-hosting": ["99.9%\u6b63\u5e38\u8fd0\u884cSLA", "\u514d\u8d39SSL\u8bc1\u4e66", "\u81ea\u52a8\u6bcf\u65e5\u5907\u4efd", "cPanel\u548cSoftaculous", "\u4e00\u952e\u5b89\u88c5WordPress"],
}

CATEGORIES_ZH = {
    "AI": "\u4eba\u5de5\u667a\u80fd",
    "Business": "\u5546\u4e1a",
    "Marketing": "\u8425\u9500",
    "Productivity": "\u6548\u7387",
    "Communication": "\u901a\u4fe1",
    "Hosting": "\u6258\u7ba1",
    "Security": "\u5b89\u5168",
    "Storage": "\u5b58\u50a8",
}

BADGES_ZH = {
    "Popular": "\u70ed\u95e8",
    "Featured": "\u7cbe\u9009",
    "Best Seller": "\u7545\u9500",
    "AI Powered": "AI\u9a71\u52a8",
    "Essential": "\u5fc5\u5907",
    "Secure": "\u5b89\u5168",
    "High Speed": "\u9ad8\u901f",
    "Virtual VoIP": "\u865a\u62dfVoIP",
    "Privacy": "\u9690\u79c1",
    "Automation": "\u81ea\u52a8\u5316",
    "Auto Post": "\u81ea\u52a8\u53d1\u5e03",
    "Reviews": "\u8bc4\u4ef7",
    "Creator": "\u521b\u4f5c\u8005",
    "Organic": "\u81ea\u7136",
    "Global Data": "\u5168\u7403\u6570\u636e",
    "99.9% Uptime": "99.9%\u6b63\u5e38\u8fd0\u884c",
}

def slugify(text):
    return re.sub(r'[^a-zA-Z0-9]+', '_', text).strip('_')

# Generate all keys
keys_zh = {}

# Categories
for cat, zh in CATEGORIES_ZH.items():
    keys_zh[f"techCat_{cat}"] = zh

# Badges
for badge, zh in BADGES_ZH.items():
    keys_zh[f"techBadge_{badge}"] = zh

# Descriptions and features
for svc in SEED:
    slug = svc["slug"]
    keys_zh[f"techDesc_{slug}_short"] = ZH_DESC.get(slug, svc["short_description"])
    for i, feat in enumerate(svc["features"]):
        key = f"techFeat_{slug}_{i}_{slugify(feat)}"
        keys_zh[key] = ZH_FEATURES.get(slug, [])[i] if i < len(ZH_FEATURES.get(slug, [])) else feat

# Load and update zh.json
with open('src/i18n/locales/zh.json', 'r', encoding='utf-8') as f:
    zh = json.load(f)

added = 0
updated = 0
for k, v in keys_zh.items():
    if k not in zh:
        zh[k] = v
        added += 1
    elif zh[k] != v:
        # Only update if it looks like English (no Chinese chars)
        if not any('\u4e00' <= c <= '\u9fff' for c in zh[k]):
            zh[k] = v
            updated += 1

with open('src/i18n/locales/zh.json', 'w', encoding='utf-8') as f:
    json.dump(zh, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'Added {added} new keys, updated {updated} English-only keys')
print(f'zh.json now has {len(zh)} total keys')
print(f'Total tech keys generated: {len(keys_zh)}')
