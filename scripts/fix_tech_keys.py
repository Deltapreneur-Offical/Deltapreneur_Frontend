#!/usr/bin/env python3
"""Fix technology translation keys to match the techT() function's slug algorithm.

The techT function generates: prefix + text.replace(/[^a-zA-Z0-9]+/g, '_')
So "99.9% Uptime" becomes "techBadge_99_9_Uptime"
"""
import json, os, re

locales_dir = 'src/i18n/locales'

def tech_slugify(text):
    """Replicate the JS regex: text.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')"""
    s = re.sub(r'[^a-zA-Z0-9]+', '_', text)
    s = s.strip('_')
    return s

# All services from the backend seed data
services = [
    {
        "slug": "ai-business-suite",
        "category": "AI",
        "badge": "Popular",
        "short_description": "All-in-one AI platform for content creation, automated customer engagement, and business intelligence.",
        "features": ["AI Content Writer & Editor", "Automated Lead Scoring", "Smart Document Summarizer", "Multi-model LLM Switching", "24/7 AI Customer Copilot"],
    },
    {
        "slug": "website-builder",
        "category": "Business",
        "badge": "Featured",
        "short_description": "Next-gen visual web builder with custom domains, AI layout generator, and built-in SEO.",
        "features": ["Drag-and-Drop Drag Builder", "AI Page Generator", "Free SSL Certificate", "Custom Domain Integration", "Mobile-Optimized Responsive Layouts"],
    },
    {
        "slug": "crm",
        "category": "Business",
        "badge": "Best Seller",
        "short_description": "Streamlined customer relationship management, sales pipeline tracking, and automated client follow-ups.",
        "features": ["Kanban Sales Pipeline", "Automated Email Sequences", "Contact & Lead Activity History", "Task & Reminder Scheduler", "Revenue Forecasting Reports"],
    },
    {
        "slug": "invoice-ai",
        "category": "Productivity",
        "badge": "AI Powered",
        "short_description": "Smart automated invoicing, expense tracking, and GST/Tax report generation.",
        "features": ["Instant Invoice Generation", "Automated Recurring Invoices", "Payment Link Integration", "Tax & GST Ready Summaries", "Client Receipt Portal"],
    },
    {
        "slug": "appointment-booking",
        "category": "Productivity",
        "badge": "Essential",
        "short_description": "Seamless online scheduling calendar with automatic video link generation and SMS reminders.",
        "features": ["Real-time Multi-Calendar Sync", "Automated Zoom/Google Meet Links", "Custom Booking Link & Page", "SMS & Email Reminders", "Buffer Time & Timezone Detection"],
    },
    {
        "slug": "document-signer",
        "category": "Productivity",
        "badge": "Secure",
        "short_description": "Legally binding e-signatures, document audit trails, and contract templates.",
        "features": ["Legally Binding E-Signatures", "Audit Trail & Timestamp Certificates", "Reusable Contract Templates", "Multi-Signer Sequential Workflows", "Secure Cloud Storage"],
    },
    {
        "slug": "cloud-storage",
        "category": "Storage",
        "badge": "High Speed",
        "short_description": "Secure encrypted cloud storage, team file sharing, and version control.",
        "features": ["End-to-End Encrypted Vaults", "Granular Link Sharing & Passwords", "File Versioning & Rollback", "Team Workspace Folders", "High-Speed Global Sync"],
    },
    {
        "slug": "business-phone",
        "category": "Communication",
        "badge": "Virtual VoIP",
        "short_description": "Professional virtual business phone system with call routing, IVR, and voicemail.",
        "features": ["Virtual Phone Numbers", "IVR & Call Routing", "Voicemail to Email", "Call Recording & Analytics", "Team Extension & Transfer"],
    },
    {
        "slug": "email-marketing",
        "category": "Marketing",
        "badge": "Automation",
        "short_description": "Powerful email marketing automation with drag-and-drop editor and advanced analytics.",
        "features": ["Drag-and-Drop Email Editor", "Automated Drip Campaigns", "A/B Testing & Analytics", "Subscriber Segmentation", "GDPR-Compliant Lists"],
    },
    {
        "slug": "seo-tools",
        "category": "Marketing",
        "badge": "Organic",
        "short_description": "All-in-one SEO toolkit with keyword research, site audit, and rank tracking.",
        "features": ["Keyword Research & Tracking", "Technical Site Audit", "Backlink Analysis", "Competitor Monitoring", "Content Optimization Suggestions"],
    },
    {
        "slug": "social-media-manager",
        "category": "Marketing",
        "badge": "Auto Post",
        "short_description": "Schedule, manage, and analyze all social media accounts from one dashboard.",
        "features": ["Multi-platform Scheduling", "Content Calendar", "Engagement Inbox", "Performance Analytics", "AI Caption Generator"],
    },
    {
        "slug": "reputation-management",
        "category": "Marketing",
        "badge": "Reviews",
        "short_description": "Monitor brand reviews, automate feedback collection, and manage online reputation.",
        "features": ["Review Monitoring Dashboard", "Automated Feedback Requests", "Sentiment Analysis", "Response Templates", "Review Widget for Website"],
    },
    {
        "slug": "link-in-bio",
        "category": "Marketing",
        "badge": "Creator",
        "short_description": "Beautiful link-in-bio page with analytics, custom domains, and QR codes.",
        "features": ["Drag-and-Drop Page Builder", "Custom Domain Support", "Click Analytics & Insights", "QR Code Generator", "Social Media Integration"],
    },
    {
        "slug": "smm-growth",
        "category": "Marketing",
        "badge": "Organic",
        "short_description": "Social media growth tools with engagement automation and audience analytics.",
        "features": ["Follower Growth Analytics", "Engagement Automation", "Content Performance Tracking", "Audience Demographics", "Hashtag Research"],
    },
    {
        "slug": "vpn",
        "category": "Security",
        "badge": "Privacy",
        "short_description": "High-speed encrypted VPN network for safe browsing, remote access, and privacy.",
        "features": ["AES-256 WireGuard Encryption", "Zero-Logs Privacy Guarantee", "60+ Global Server Locations", "Split Tunneling Support", "Kill Switch Protection"],
    },
    {
        "slug": "web-hosting",
        "category": "Hosting",
        "badge": "99.9% Uptime",
        "short_description": "High-performance cloud hosting with 99.9% uptime, free SSL, and one-click app installs.",
        "features": ["SSD Cloud Storage", "Free SSL & Domain", "One-Click App Installer", "Daily Backups", "99.9% Uptime SLA"],
    },
    {
        "slug": "esim",
        "category": "Communication",
        "badge": "Global Data",
        "short_description": "Global eSIM data plans for international travel and remote connectivity.",
        "features": ["200+ Country Coverage", "Instant Activation", "No Physical SIM Required", "Flexible Data Plans", "Real-time Usage Dashboard"],
    },
]

# Chinese translations
zh_map = {
    "AI": "人工智能", "Business": "商务", "Productivity": "生产力",
    "Marketing": "营销", "Communication": "通信", "Security": "安全",
    "Hosting": "托管", "Storage": "存储",
    "Popular": "热门", "Featured": "精选", "Best Seller": "畅销",
    "AI Powered": "AI驱动", "Essential": "必备", "Secure": "安全",
    "High Speed": "高速", "Virtual VoIP": "虚拟VoIP",
    "Automation": "自动化", "Organic": "自然", "Auto Post": "自动发布",
    "Reviews": "评价", "Creator": "创作者", "Privacy": "隐私",
    "99.9% Uptime": "99.9%正常运行",
    "All-in-one AI platform for content creation, automated customer engagement, and business intelligence.": "一体化AI平台，用于内容创作、自动化客户互动和商业智能。",
    "Next-gen visual web builder with custom domains, AI layout generator, and built-in SEO.": "新一代可视化网站构建器，支持自定义域名、AI布局生成器和内置SEO。",
    "Streamlined customer relationship management, sales pipeline tracking, and automated client follow-ups.": "简化的客户关系管理、销售管道跟踪和自动化客户跟进。",
    "Smart automated invoicing, expense tracking, and GST/Tax report generation.": "智能自动发票、费用跟踪和GST/税务报告生成。",
    "Seamless online scheduling calendar with automatic video link generation and SMS reminders.": "无缝在线日程安排，自动生成视频链接和短信提醒。",
    "Legally binding e-signatures, document audit trails, and contract templates.": "具有法律约束力的电子签名、文档审计跟踪和合同模板。",
    "Secure encrypted cloud storage, team file sharing, and version control.": "安全加密云存储、团队文件共享和版本控制。",
    "Professional virtual business phone system with call routing, IVR, and voicemail.": "专业虚拟商务电话系统，支持呼叫路由、IVR和语音信箱。",
    "Powerful email marketing automation with drag-and-drop editor and advanced analytics.": "强大的邮件营销自动化，支持拖拽编辑器和高级分析。",
    "All-in-one SEO toolkit with keyword research, site audit, and rank tracking.": "一体化SEO工具包，包含关键词研究、站点审计和排名跟踪。",
    "Schedule, manage, and analyze all social media accounts from one dashboard.": "从一个仪表盘安排、管理和分析所有社交媒体账户。",
    "Monitor brand reviews, automate feedback collection, and manage online reputation.": "监控品牌评价，自动化反馈收集，管理在线声誉。",
    "Beautiful link-in-bio page with analytics, custom domains, and QR codes.": "美观的个人链接页面，支持分析、自定义域名和二维码。",
    "Social media growth tools with engagement automation and audience analytics.": "社交媒体增长工具，包含互动自动化和受众分析。",
    "High-speed encrypted VPN network for safe browsing, remote access, and privacy.": "高速加密VPN网络，用于安全浏览、远程访问和隐私保护。",
    "High-performance cloud hosting with 99.9% uptime, free SSL, and one-click app installs.": "高性能云托管，99.9%正常运行时间、免费SSL和一键应用安装。",
    "Global eSIM data plans for international travel and remote connectivity.": "全球eSIM数据套餐，用于国际旅行和远程连接。",
    "AI Content Writer & Editor": "AI内容写作与编辑",
    "Automated Lead Scoring": "自动化潜在客户评分",
    "Smart Document Summarizer": "智能文档摘要",
    "Multi-model LLM Switching": "多模型LLM切换",
    "24/7 AI Customer Copilot": "24/7 AI客户助手",
    "Drag-and-Drop Drag Builder": "拖拽式构建器",
    "AI Page Generator": "AI页面生成器",
    "Free SSL Certificate": "免费SSL证书",
    "Custom Domain Integration": "自定义域名集成",
    "Mobile-Optimized Responsive Layouts": "移动端优化响应式布局",
    "Kanban Sales Pipeline": "看板销售管道",
    "Automated Email Sequences": "自动化邮件序列",
    "Contact & Lead Activity History": "联系人和潜在客户活动历史",
    "Task & Reminder Scheduler": "任务和提醒调度器",
    "Revenue Forecasting Reports": "收入预测报告",
    "Instant Invoice Generation": "即时发票生成",
    "Automated Recurring Invoices": "自动循环发票",
    "Payment Link Integration": "支付链接集成",
    "Tax & GST Ready Summaries": "税务和GST就绪摘要",
    "Client Receipt Portal": "客户收据门户",
    "Real-time Multi-Calendar Sync": "实时多日历同步",
    "Automated Zoom/Google Meet Links": "自动Zoom/Google Meet链接",
    "Custom Booking Link & Page": "自定义预约链接和页面",
    "SMS & Email Reminders": "短信和邮件提醒",
    "Buffer Time & Timezone Detection": "缓冲时间和时区检测",
    "Legally Binding E-Signatures": "具有法律约束力的电子签名",
    "Audit Trail & Timestamp Certificates": "审计跟踪和时间戳证书",
    "Reusable Contract Templates": "可重用合同模板",
    "Multi-Signer Sequential Workflows": "多方签署顺序工作流",
    "Secure Cloud Storage": "安全云存储",
    "End-to-End Encrypted Vaults": "端到端加密保险库",
    "Granular Link Sharing & Passwords": "精细链接共享和密码保护",
    "File Versioning & Rollback": "文件版本控制和回滚",
    "Team Workspace Folders": "团队工作区文件夹",
    "High-Speed Global Sync": "高速全球同步",
    "Virtual Phone Numbers": "虚拟电话号码",
    "IVR & Call Routing": "IVR和呼叫路由",
    "Voicemail to Email": "语音信箱转邮件",
    "Call Recording & Analytics": "通话录音和分析",
    "Team Extension & Transfer": "团队分机和转接",
    "Drag-and-Drop Email Editor": "拖拽式邮件编辑器",
    "Automated Drip Campaigns": "自动化滴灌营销",
    "A/B Testing & Analytics": "A/B测试和分析",
    "Subscriber Segmentation": "订阅者分组",
    "GDPR-Compliant Lists": "GDPR合规列表",
    "Keyword Research & Tracking": "关键词研究和跟踪",
    "Technical Site Audit": "技术站点审计",
    "Backlink Analysis": "反向链接分析",
    "Competitor Monitoring": "竞争对手监控",
    "Content Optimization Suggestions": "内容优化建议",
    "Multi-platform Scheduling": "多平台排程",
    "Content Calendar": "内容日历",
    "Engagement Inbox": "互动收件箱",
    "Performance Analytics": "绩效分析",
    "AI Caption Generator": "AI标题生成器",
    "Review Monitoring Dashboard": "评价监控仪表盘",
    "Automated Feedback Requests": "自动化反馈请求",
    "Sentiment Analysis": "情感分析",
    "Response Templates": "回复模板",
    "Review Widget for Website": "网站评价小部件",
    "Drag-and-Drop Page Builder": "拖拽式页面构建器",
    "Custom Domain Support": "自定义域名支持",
    "Click Analytics & Insights": "点击分析和洞察",
    "QR Code Generator": "二维码生成器",
    "Social Media Integration": "社交媒体集成",
    "Follower Growth Analytics": "粉丝增长分析",
    "Engagement Automation": "互动自动化",
    "Content Performance Tracking": "内容表现跟踪",
    "Audience Demographics": "受众人口统计",
    "Hashtag Research": "话题标签研究",
    "AES-256 WireGuard Encryption": "AES-256 WireGuard加密",
    "Zero-Logs Privacy Guarantee": "零日志隐私保证",
    "60+ Global Server Locations": "60+全球服务器位置",
    "Split Tunneling Support": "分割隧道支持",
    "Kill Switch Protection": "紧急断开保护",
    "SSD Cloud Storage": "SSD云存储",
    "Free SSL & Domain": "免费SSL和域名",
    "One-Click App Installer": "一键应用安装器",
    "Daily Backups": "每日备份",
    "99.9% Uptime SLA": "99.9%正常运行SLA",
    "200+ Country Coverage": "200+国家覆盖",
    "Instant Activation": "即时激活",
    "No Physical SIM Required": "无需实体SIM卡",
    "Flexible Data Plans": "灵活的数据套餐",
    "Real-time Usage Dashboard": "实时使用仪表盘",
}

# Hindi translations for common items
hi_map = {
    "AI": "AI", "Business": "व्यापार", "Productivity": "उत्पादकता",
    "Marketing": "विपणन", "Communication": "संचार", "Security": "सुरक्षा",
    "Hosting": "होस्टिंग", "Storage": "स्टोरेज",
    "Popular": "लोकप्रिय", "Featured": "विशेष", "Best Seller": "सर्वाधिक बिक्री",
    "AI Powered": "AI संचालित", "Essential": "आवश्यक", "Secure": "सुरक्षित",
    "High Speed": "उच्च गति", "Virtual VoIP": "वर्चुअल VoIP",
    "Automation": "स्वचालन", "Organic": "ऑर्गेनिक", "Auto Post": "ऑटो पोस्ट",
    "Reviews": "समीक्षाएँ", "Creator": "निर्माता", "Privacy": "गोपनीयता",
    "99.9% Uptime": "99.9% अपटाइम",
}

# Build correct keys using tech_slugify
en_keys = {}
zh_keys = {}
hi_keys = {}

for svc in services:
    slug = svc["slug"]
    # Category
    cat_key = f'techCat_{tech_slugify(svc["category"])}'
    en_keys[cat_key] = svc["category"]
    zh_keys[cat_key] = zh_map.get(svc["category"], svc["category"])
    hi_keys[cat_key] = hi_map.get(svc["category"], svc["category"])
    
    # Badge
    badge_key = f'techBadge_{tech_slugify(svc["badge"])}'
    en_keys[badge_key] = svc["badge"]
    zh_keys[badge_key] = zh_map.get(svc["badge"], svc["badge"])
    hi_keys[badge_key] = hi_map.get(svc["badge"], svc["badge"])
    
    # Description
    desc_key = f'techDesc_{slug}_{tech_slugify(svc["short_description"])}'
    en_keys[desc_key] = svc["short_description"]
    zh_keys[desc_key] = zh_map.get(svc["short_description"], svc["short_description"])
    hi_keys[desc_key] = hi_map.get(svc["short_description"], svc["short_description"])
    
    # Features
    for idx, feat in enumerate(svc["features"]):
        feat_key = f'techFeat_{slug}_{idx}_{tech_slugify(feat)}'
        en_keys[feat_key] = feat
        zh_keys[feat_key] = zh_map.get(feat, feat)
        hi_keys[feat_key] = hi_map.get(feat, feat)

# Update locale files
for fname in os.listdir(locales_dir):
    if not fname.endswith('.json'):
        continue
    locale = fname.replace('.json', '')
    path = os.path.join(locales_dir, fname)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    if locale == 'en-IN':
        keys_to_add = en_keys
    elif locale == 'zh':
        keys_to_add = zh_keys
    elif locale == 'hi':
        keys_to_add = hi_keys
    else:
        keys_to_add = en_keys
    
    added = 0
    for k, v in keys_to_add.items():
        if k not in data:
            data[k] = v
            added += 1
    
    # Also remove old incorrectly-keyed entries
    removed = 0
    old_prefixes = ['techDesc_ai_business_suite_', 'techDesc_website_builder_', 'techFeat_ai_business_suite_', 'techFeat_website_builder_', 'techFeat_crm_', 'techFeat_invoice_ai_', 'techFeat_appointment_booking_', 'techFeat_document_signer_', 'techFeat_business_phone_', 'techFeat_email_marketing_', 'techFeat_hosting_', 'techFeat_security_suite_', 'techFeat_seo_tools_', 'techFeat_analytics_dashboard_', 'techFeat_social_media_manager_', 'techFeat_form_builder_', 'techFeat_chat_widget_', 'techFeat_automation_suite_', 'techFeat_easydmarc_', 'techFeat_spamexperts_']
    for k in list(data.keys()):
        for prefix in old_prefixes:
            if k.startswith(prefix):
                del data[k]
                removed += 1
                break
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    
    action = f'added {added}'
    if removed:
        action += f', removed {removed} old'
    print(f'{fname}: {action}')

# Verify
with open('src/i18n/locales/en-IN.json', 'r', encoding='utf-8') as f:
    en = json.load(f)
with open('src/i18n/locales/zh.json', 'r', encoding='utf-8') as f:
    zh = json.load(f)

# Test key generation matches
test_texts = ["AI", "Popular", "99.9% Uptime", "Drag-and-Drop Drag Builder", "All-in-one AI platform for content creation, automated customer engagement, and business intelligence."]
print("\nKey verification:")
for text in test_texts:
    key = f'techBadge_{tech_slugify(text)}' if text in ["Popular", "99.9% Uptime"] else f'techCat_{tech_slugify(text)}' if text == "AI" else f'techFeat_ai_business_suite_0_{tech_slugify(text)}' if "Drag" in text else f'techDesc_ai_business_suite_{tech_slugify(text)}'
    in_en = key in en
    in_zh = key in zh
    print(f'  "{text[:40]}" -> {key} (en={in_en}, zh={in_zh})')

print(f'\nFinal: en-IN={len(en)} keys, zh={len(zh)} keys')
