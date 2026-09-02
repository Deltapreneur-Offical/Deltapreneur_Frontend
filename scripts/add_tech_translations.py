#!/usr/bin/env python3
"""Add technology service translation keys to all locale files."""
import json, os

locales_dir = 'src/i18n/locales'

en_keys = {
    # UI strings
    'commonStartingAt': 'Starting at',
    'commonMo': 'mo',
    'commonExploreService': 'Explore Service',
    # Categories
    'techCat_AI': 'AI',
    'techCat_Business': 'Business',
    'techCat_Productivity': 'Productivity',
    'techCat_Marketing': 'Marketing',
    'techCat_Communication': 'Communication',
    'techCat_Analytics': 'Analytics',
    'techCat_Support': 'Support',
    'techCat_Security': 'Security',
    # Badges
    'techBadge_Popular': 'Popular',
    'techBadge_Featured': 'Featured',
    'techBadge_BestSeller': 'Best Seller',
    'techBadge_AIPowered': 'AI Powered',
    'techBadge_Essential': 'Essential',
    'techBadge_Secure': 'Secure',
    'techBadge_New': 'New',
    'techBadge_Trending': 'Trending',
    'techBadge_TopRated': 'Top Rated',
    'techBadge_BudgetFriendly': 'Budget Friendly',
    'techBadge_Pro': 'Pro',
    'techBadge_Enterprise': 'Enterprise',
    'techBadge_Starter': 'Starter',
    # AI Business Suite
    'techDesc_ai_business_suite_short': 'All-in-one AI platform for content creation, automated customer engagement, and business intelligence.',
    'techFeat_ai_business_suite_0': 'AI Content Writer & Editor',
    'techFeat_ai_business_suite_1': 'Automated Lead Scoring',
    'techFeat_ai_business_suite_2': 'Smart Document Summarizer',
    'techFeat_ai_business_suite_3': 'Multi-model LLM Switching',
    'techFeat_ai_business_suite_4': '24/7 AI Customer Copilot',
    # Website Builder
    'techDesc_website_builder_short': 'Next-gen visual web builder with custom domains, AI layout generator, and built-in SEO.',
    'techFeat_website_builder_0': 'Drag-and-Drop Builder',
    'techFeat_website_builder_1': 'AI Page Generator',
    'techFeat_website_builder_2': 'Free SSL Certificate',
    'techFeat_website_builder_3': 'Custom Domain Integration',
    'techFeat_website_builder_4': 'Mobile-Optimized Responsive Layouts',
    # CRM
    'techDesc_crm_short': 'Streamlined customer relationship management, sales pipeline tracking, and automated client follow-ups.',
    'techFeat_crm_0': 'Kanban Sales Pipeline',
    'techFeat_crm_1': 'Automated Email Sequences',
    'techFeat_crm_2': 'Contact & Lead Activity History',
    'techFeat_crm_3': 'Task & Reminder Scheduler',
    'techFeat_crm_4': 'Revenue Forecasting Reports',
    # Invoice AI
    'techDesc_invoice_ai_short': 'Smart automated invoicing, expense tracking, and GST/Tax report generation.',
    'techFeat_invoice_ai_0': 'Instant Invoice Generation',
    'techFeat_invoice_ai_1': 'Automated Recurring Invoices',
    'techFeat_invoice_ai_2': 'Payment Link Integration',
    'techFeat_invoice_ai_3': 'Tax & GST Ready Summaries',
    'techFeat_invoice_ai_4': 'Client Receipt Portal',
    # Appointment Booking
    'techDesc_appointment_booking_short': 'Seamless online scheduling calendar with automatic video link generation and SMS reminders.',
    'techFeat_appointment_booking_0': 'Real-time Multi-Calendar Sync',
    'techFeat_appointment_booking_1': 'Automated Zoom/Google Meet Links',
    'techFeat_appointment_booking_2': 'Custom Booking Link & Page',
    'techFeat_appointment_booking_3': 'SMS & Email Reminders',
    'techFeat_appointment_booking_4': 'Buffer Time & Timezone Detection',
    # Document Signer
    'techDesc_document_signer_short': 'Secure digital document signing with legally binding e-signatures and audit trails.',
    'techFeat_document_signer_0': 'Legally Binding E-Signatures',
    'techFeat_document_signer_1': 'Multi-party Signing Workflows',
    'techFeat_document_signer_2': 'Document Templates Library',
    'techFeat_document_signer_3': 'Audit Trail & Compliance',
    'techFeat_document_signer_4': 'Cloud Storage Integration',
    # Business Phone
    'techDesc_business_phone_short': 'Professional virtual business phone system with call routing, IVR, and voicemail.',
    'techFeat_business_phone_0': 'Virtual Phone Numbers',
    'techFeat_business_phone_1': 'IVR & Call Routing',
    'techFeat_business_phone_2': 'Voicemail to Email',
    'techFeat_business_phone_3': 'Call Recording & Analytics',
    'techFeat_business_phone_4': 'Team Extension & Transfer',
    # Email Marketing
    'techDesc_email_marketing_short': 'Powerful email marketing automation with drag-and-drop editor and advanced analytics.',
    'techFeat_email_marketing_0': 'Drag-and-Drop Email Editor',
    'techFeat_email_marketing_1': 'Automated Drip Campaigns',
    'techFeat_email_marketing_2': 'A/B Testing & Analytics',
    'techFeat_email_marketing_3': 'Subscriber Segmentation',
    'techFeat_email_marketing_4': 'GDPR-Compliant Lists',
    # Hosting
    'techDesc_hosting_short': 'High-performance cloud hosting with 99.9% uptime, free SSL, and one-click app installs.',
    'techFeat_hosting_0': 'SSD Cloud Storage',
    'techFeat_hosting_1': 'Free SSL & Domain',
    'techFeat_hosting_2': 'One-Click App Installer',
    'techFeat_hosting_3': 'Daily Backups',
    'techFeat_hosting_4': '99.9% Uptime SLA',
    # Security Suite
    'techDesc_security_suite_short': 'Comprehensive website security with malware scanning, firewall, and DDoS protection.',
    'techFeat_security_suite_0': 'Real-time Malware Scanning',
    'techFeat_security_suite_1': 'Web Application Firewall',
    'techFeat_security_suite_2': 'DDoS Protection',
    'techFeat_security_suite_3': 'Security Alerts & Reports',
    'techFeat_security_suite_4': 'One-Click Hardening',
    # SEO Tools
    'techDesc_seo_tools_short': 'All-in-one SEO toolkit with keyword research, site audit, and rank tracking.',
    'techFeat_seo_tools_0': 'Keyword Research & Tracking',
    'techFeat_seo_tools_1': 'Technical Site Audit',
    'techFeat_seo_tools_2': 'Backlink Analysis',
    'techFeat_seo_tools_3': 'Competitor Monitoring',
    'techFeat_seo_tools_4': 'Content Optimization Suggestions',
    # Analytics Dashboard
    'techDesc_analytics_dashboard_short': 'Unified analytics dashboard combining website, marketing, and sales metrics.',
    'techFeat_analytics_dashboard_0': 'Real-time Traffic Analytics',
    'techFeat_analytics_dashboard_1': 'Conversion Funnel Tracking',
    'techFeat_analytics_dashboard_2': 'Custom Report Builder',
    'techFeat_analytics_dashboard_3': 'Multi-channel Attribution',
    'techFeat_analytics_dashboard_4': 'Export & API Access',
    # Social Media Manager
    'techDesc_social_media_manager_short': 'Schedule, manage, and analyze all social media accounts from one dashboard.',
    'techFeat_social_media_manager_0': 'Multi-platform Scheduling',
    'techFeat_social_media_manager_1': 'Content Calendar',
    'techFeat_social_media_manager_2': 'Engagement Inbox',
    'techFeat_social_media_manager_3': 'Performance Analytics',
    'techFeat_social_media_manager_4': 'AI Caption Generator',
    # Form Builder
    'techDesc_form_builder_short': 'Drag-and-drop form builder with payment collection, logic jumps, and integrations.',
    'techFeat_form_builder_0': 'Drag-and-Drop Builder',
    'techFeat_form_builder_1': 'Conditional Logic',
    'techFeat_form_builder_2': 'Payment Collection',
    'techFeat_form_builder_3': 'File Upload Support',
    'techFeat_form_builder_4': 'Webhook & API Integrations',
    # Chat Widget
    'techDesc_chat_widget_short': 'Live chat widget with AI chatbot, ticketing, and visitor tracking.',
    'techFeat_chat_widget_0': 'Live Chat & Messaging',
    'techFeat_chat_widget_1': 'AI Chatbot Responses',
    'techFeat_chat_widget_2': 'Visitor Tracking & Analytics',
    'techFeat_chat_widget_3': 'Ticketing System',
    'techFeat_chat_widget_4': 'Custom Branding',
    # Automation Suite
    'techDesc_automation_suite_short': 'Workflow automation connecting 100+ apps with triggers, actions, and conditional logic.',
    'techFeat_automation_suite_0': 'Visual Workflow Builder',
    'techFeat_automation_suite_1': '100+ App Integrations',
    'techFeat_automation_suite_2': 'Conditional Logic & Branching',
    'techFeat_automation_suite_3': 'Error Handling & Retries',
    'techFeat_automation_suite_4': 'Execution History & Logs',
    # EasyDMARC
    'techDesc_easydmarc_short': 'DMARC, DKIM, and SPF configuration with guided setup and compliance reporting.',
    'techFeat_easydmarc_0': 'DMARC Policy Management',
    'techFeat_easydmarc_1': 'DKIM Key Configuration',
    'techFeat_easydmarc_2': 'SPF Record Validation',
    'techFeat_easydmarc_3': 'Aggregate & Forensic Reports',
    'techFeat_easydmarc_4': 'Brand Indicators (BIMI)',
    # SpamExperts
    'techDesc_spamexperts_short': 'Advanced email spam and malware filtering for incoming and outgoing mail.',
    'techFeat_spamexperts_0': 'Incoming Mail Filtering',
    'techFeat_spamexperts_1': 'Outgoing Mail Filtering',
    'techFeat_spamexperts_2': 'Virus & Malware Scanning',
    'techFeat_spamexperts_3': 'Quarantine Management',
    'techFeat_spamexperts_4': 'Reporting & Dashboards',
    # Detail page
    'techDetailTimeout': 'Request timed out while loading technology service details.',
    'techDetailMissingId': 'Technology service identifier is missing.',
    'techDetailNotFound': 'Technology service not found.',
    'techDetailPhoneAreaCode': 'Please enter the area code for your Business Phone number.',
    'techDetailDomainRequired': 'Please enter the primary domain for your hosting account.',
    'techDetailCartFailed': 'Failed to add to cart. Please try again.',
    'techDetailUnavailable': 'The requested technology service does not exist or is currently unavailable.',
    'techDetailProvisioning': 'Provisioning...',
    'techDetailConfirmPay': 'Confirm & Pay',
}

zh_keys = {
    'commonStartingAt': '起步价',
    'commonMo': '月',
    'commonExploreService': '探索服务',
    'techCat_AI': '人工智能',
    'techCat_Business': '商务',
    'techCat_Productivity': '生产力',
    'techCat_Marketing': '营销',
    'techCat_Communication': '通信',
    'techCat_Analytics': '数据分析',
    'techCat_Support': '支持',
    'techCat_Security': '安全',
    'techBadge_Popular': '热门',
    'techBadge_Featured': '精选',
    'techBadge_BestSeller': '畅销',
    'techBadge_AIPowered': 'AI驱动',
    'techBadge_Essential': '必备',
    'techBadge_Secure': '安全',
    'techBadge_New': '新品',
    'techBadge_Trending': '趋势',
    'techBadge_TopRated': '高评分',
    'techBadge_BudgetFriendly': '经济实惠',
    'techBadge_Pro': '专业版',
    'techBadge_Enterprise': '企业版',
    'techBadge_Starter': '入门版',
    'techDesc_ai_business_suite_short': '一体化AI平台，用于内容创作、自动化客户互动和商业智能。',
    'techFeat_ai_business_suite_0': 'AI内容写作与编辑',
    'techFeat_ai_business_suite_1': '自动化潜在客户评分',
    'techFeat_ai_business_suite_2': '智能文档摘要',
    'techFeat_ai_business_suite_3': '多模型LLM切换',
    'techFeat_ai_business_suite_4': '24/7 AI客户助手',
    'techDesc_website_builder_short': '新一代可视化网站构建器，支持自定义域名、AI布局生成器和内置SEO。',
    'techFeat_website_builder_0': '拖拽式构建器',
    'techFeat_website_builder_1': 'AI页面生成器',
    'techFeat_website_builder_2': '免费SSL证书',
    'techFeat_website_builder_3': '自定义域名集成',
    'techFeat_website_builder_4': '移动端优化响应式布局',
    'techDesc_crm_short': '简化的客户关系管理、销售管道跟踪和自动化客户跟进。',
    'techFeat_crm_0': '看板销售管道',
    'techFeat_crm_1': '自动化邮件序列',
    'techFeat_crm_2': '联系人和潜在客户活动历史',
    'techFeat_crm_3': '任务和提醒调度器',
    'techFeat_crm_4': '收入预测报告',
    'techDesc_invoice_ai_short': '智能自动发票、费用跟踪和GST/税务报告生成。',
    'techFeat_invoice_ai_0': '即时发票生成',
    'techFeat_invoice_ai_1': '自动循环发票',
    'techFeat_invoice_ai_2': '支付链接集成',
    'techFeat_invoice_ai_3': '税务和GST就绪摘要',
    'techFeat_invoice_ai_4': '客户收据门户',
    'techDesc_appointment_booking_short': '无缝在线日程安排，自动生成视频链接和短信提醒。',
    'techFeat_appointment_booking_0': '实时多日历同步',
    'techFeat_appointment_booking_1': '自动Zoom/Google Meet链接',
    'techFeat_appointment_booking_2': '自定义预约链接和页面',
    'techFeat_appointment_booking_3': '短信和邮件提醒',
    'techFeat_appointment_booking_4': '缓冲时间和时区检测',
    'techDetailTimeout': '加载技术服务详情时请求超时。',
    'techDetailMissingId': '技术服务标识符缺失。',
    'techDetailNotFound': '未找到技术服务。',
    'techDetailPhoneAreaCode': '请输入商务电话号码的区号。',
    'techDetailDomainRequired': '请输入托管账户的主域名。',
    'techDetailCartFailed': '添加到购物车失败。请重试。',
    'techDetailUnavailable': '所请求的技术服务不存在或当前不可用。',
    'techDetailProvisioning': '配置中...',
    'techDetailConfirmPay': '确认并支付',
}

hi_keys = {
    'commonStartingAt': 'शुरू कीमत',
    'commonMo': 'माह',
    'commonExploreService': 'सेवा देखें',
    'techCat_AI': 'AI',
    'techCat_Business': 'व्यापार',
    'techCat_Productivity': 'उत्पादकता',
    'techCat_Marketing': 'विपणन',
    'techCat_Communication': 'संचार',
    'techCat_Analytics': 'विश्लेषण',
    'techCat_Support': 'सहायता',
    'techCat_Security': 'सुरक्षा',
    'techBadge_Popular': 'लोकप्रिय',
    'techBadge_Featured': 'विशेष',
    'techBadge_BestSeller': 'सर्वाधिक बिक्री',
    'techBadge_AIPowered': 'AI संचालित',
    'techBadge_Essential': 'आवश्यक',
    'techBadge_Secure': 'सुरक्षित',
    'techBadge_New': 'नया',
    'techBadge_Trending': 'ट्रेंडिंग',
    'techBadge_TopRated': 'शीर्ष रेटेड',
    'techBadge_BudgetFriendly': 'बजट फ्रेंडली',
    'techBadge_Pro': 'प्रो',
    'techBadge_Enterprise': 'एंटरप्राइज',
    'techBadge_Starter': 'स्टार्टर',
    'techDesc_ai_business_suite_short': 'सामग्री निर्माण, स्वचालित ग्राहक संलग्नता और व्यापार बुद्धिमत्ता के लिए ऑल-इन-वन AI प्लेटफॉर्म।',
    'techFeat_ai_business_suite_0': 'AI सामग्री लेखक और संपादक',
    'techFeat_ai_business_suite_1': 'स्वचालित लीड स्कोरिंग',
    'techFeat_ai_business_suite_2': 'स्मार्ट दस्तावेज़ सारांश',
    'techFeat_ai_business_suite_3': 'मल्टी-मॉडल LLM स्विचिंग',
    'techFeat_ai_business_suite_4': '24/7 AI ग्राहक कोपाइलट',
    'techDesc_website_builder_short': 'कस्टम डोमेन, AI लेआउट जनरेटर और बिल्ट-इन SEO के साथ नेक्स्ट-जेन विजुअल वेब बिल्डर।',
    'techFeat_website_builder_0': 'ड्रैग-एंड-ड्रॉप बिल्डर',
    'techFeat_website_builder_1': 'AI पेज जनरेटर',
    'techFeat_website_builder_2': 'मुफ़्त SSL प्रमाणपत्र',
    'techFeat_website_builder_3': 'कस्टम डोमेन एकीकरण',
    'techFeat_website_builder_4': 'मोबाइल-अनुकूलित रिस्पॉन्सिव लेआउट',
    'techDesc_crm_short': 'सुव्यवस्थित ग्राहक संबंध प्रबंधन, बिक्री पाइपलाइन ट्रैकिंग और स्वचालित ग्राहक फॉलो-अप।',
    'techFeat_crm_0': 'कैनबन बिक्री पाइपलाइन',
    'techFeat_crm_1': 'स्वचालित ईमेल सीक्वेंस',
    'techFeat_crm_2': 'संपर्क और लीड गतिविधि इतिहास',
    'techFeat_crm_3': 'कार्य और रिमाइंडर शेड्यूलर',
    'techFeat_crm_4': 'राजस्व पूर्वानुमान रिपोर्ट',
    'techDesc_invoice_ai_short': 'स्मार्ट स्वचालित चालान, व्यय ट्रैकिंग और GST/कर रिपोर्ट जनरेशन।',
    'techFeat_invoice_ai_0': 'तत्काल चालान जनरेशन',
    'techFeat_invoice_ai_1': 'स्वचालित पुनरावर्ती चालान',
    'techFeat_invoice_ai_2': 'भुगतान लिंक एकीकरण',
    'techFeat_invoice_ai_3': 'कर और GST रेडी सारांश',
    'techFeat_invoice_ai_4': 'ग्राहक रसीद पोर्टल',
    'techDesc_appointment_booking_short': 'स्वचालित वीडियो लिंक जनरेशन और SMS रिमाइंडर के साथ निर्बाध ऑनलाइन शेड्यूलिंग कैलेंडर।',
    'techFeat_appointment_booking_0': 'रीयल-टाइम मल्टी-कैलेंडर सिंक',
    'techFeat_appointment_booking_1': 'स्वचालित Zoom/Google Meet लिंक',
    'techFeat_appointment_booking_2': 'कस्टम बुकिंग लिंक और पेज',
    'techFeat_appointment_booking_3': 'SMS और ईमेल रिमाइंडर',
    'techFeat_appointment_booking_4': 'बफर टाइम और टाइमज़ोन डिटेक्शन',
    'techDetailTimeout': 'तकनीकी सेवा विवरण लोड करते समय अनुरोध समय समाप्त हुआ।',
    'techDetailMissingId': 'तकनीकी सेवा पहचानकर्ता गायब है।',
    'techDetailNotFound': 'तकनीकी सेवा नहीं मिली।',
    'techDetailPhoneAreaCode': 'कृपया अपने व्यवसाय फ़ोन नंबर का क्षेत्र कोड दर्ज करें।',
    'techDetailDomainRequired': 'कृपया अपने होस्टिंग खाते का प्राथमिक डोमेन दर्ज करें।',
    'techDetailCartFailed': 'कार्ट में जोड़ने में विफल। कृपया पुनः प्रयास करें।',
    'techDetailUnavailable': 'अनुरोधित तकनीकी सेवा मौजूद नहीं है या वर्तमान में उपलब्ध नहीं है।',
    'techDetailProvisioning': 'प्रावधान...',
    'techDetailConfirmPay': 'पुष्टि करें और भुगतान करें',
}

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
    
    if added > 0:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f'{fname}: added {added} keys')
    else:
        print(f'{fname}: all keys present')

# Final
with open('src/i18n/locales/en-IN.json', 'r', encoding='utf-8') as f:
    en = json.load(f)
with open('src/i18n/locales/zh.json', 'r', encoding='utf-8') as f:
    zh = json.load(f)
print(f'\nFinal: en-IN={len(en)} keys, zh={len(zh)} keys')
