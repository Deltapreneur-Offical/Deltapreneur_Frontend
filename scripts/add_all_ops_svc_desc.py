#!/usr/bin/env python3
"""Add translation keys for ALL Operations service descriptions — both seed and admin-added."""
import json, re

def slugify(text):
    return re.sub(r'[^a-zA-Z0-9]+', '_', text).strip('_')

# Comprehensive mapping: service_name -> { en, zh }
# Covers seed services + common admin-added services
SERVICE_DESCS = {
    # === SEED SERVICES ===
    "GST Registration": {
        "en": "End-to-end GST registration support for your business.",
        "zh": "\u4e3a\u60a8\u7684\u4f01\u4e1a\u63d0\u4f9b\u7aef\u5230\u7aef\u7684GST\u6ce8\u518c\u652f\u6301\u3002"
    },
    "Trademark Registration": {
        "en": "Protect your brand with trademark registration assistance.",
        "zh": "\u901a\u8fc7\u5546\u6807\u6ce8\u518c\u5e2e\u52a9\u4fdd\u62a4\u60a8\u7684\u54c1\u724c\u3002"
    },
    "Company / LLP / Proprietorship Registration": {
        "en": "Company, LLP, or proprietorship incorporation support.",
        "zh": "\u516c\u53f8\u3001LLP\u6216\u4e2a\u4f53\u5de5\u5546\u6ce8\u518c\u652f\u6301\u3002"
    },
    "Udyam Registration": {
        "en": "MSME Udyam registration for government benefits and recognition.",
        "zh": "\u7533\u8bf7MSME\u4f26\u676f\u6ce8\u518c\uff0c\u83b7\u53d6\u653f\u5e9c\u4f18\u60e0\u548c\u8ba4\u53ef\u3002"
    },
    "Website Development": {
        "en": "Professional website development for your business presence.",
        "zh": "\u4e3a\u60a8\u7684\u4f01\u4e1a\u63d0\u4f9b\u4e13\u4e1a\u7f51\u7ad9\u5f00\u53d1\u670d\u52a1\u3002"
    },
    "Import Export Code (IEC) Registration": {
        "en": "Import Export Code registration for international trade.",
        "zh": "\u8fdb\u51fa\u53e3\u7ecf\u8425\u6743\u7533\u8bf7\uff0c\u652f\u6301\u56fd\u9645\u8d38\u6613\u3002"
    },
    "Digital Signature Certificate": {
        "en": "Digital Signature Certificate for secure online filings.",
        "zh": "\u7535\u5b50\u7b7e\u540d\u8bc1\u4e66\uff0c\u7528\u4e8e\u5b89\u5168\u7684\u7ebf\u4e0a\u7533\u62a5\u3002"
    },
    "Professional Tax Registration": {
        "en": "Professional tax registration and compliance support.",
        "zh": "\u4e13\u4e1a\u7a0e\u6ce8\u518c\u548c\u5408\u89c4\u652f\u6301\u3002"
    },
    "Startup India Registration": {
        "en": "Startup India recognition and registration assistance.",
        "zh": "Startup India\u8ba4\u8bc1\u548c\u6ce8\u518c\u534f\u52a9\u3002"
    },
    # === COMMON ADMIN-ADDED SERVICES ===
    "ISP Licence": {
        "en": "Assistance with ISP licence application, documentation, regulatory requirements and compliance.",
        "zh": "\u534f\u52a9\u529e\u7406ISP\u8bb8\u53ef\u8bc1\u7533\u8bf7\u3001\u6587\u4ef6\u3001\u76d1\u7ba1\u8981\u6c42\u548c\u5408\u89c4\u3002"
    },
    "Telecom Operating Licence": {
        "en": "Assistance with applicable telecom operating licence applications, documentation, regulatory compliance.",
        "zh": "\u534f\u52a9\u529e\u7406\u7535\u4fe1\u8fd0\u8425\u8bb8\u53ef\u8bc1\u7533\u8bf7\u3001\u6587\u4ef6\u548c\u76d1\u7ba1\u5408\u89c4\u3002"
    },
    "Vehicle Dealer Registration": {
        "en": "Assistance with vehicle dealer registration, applicable documentation, application preparation and follow-up.",
        "zh": "\u534f\u52a9\u529e\u7406\u8f66\u8f86\u7ecf\u9500\u5546\u6ce8\u518c\u3001\u76f8\u5173\u6587\u4ef6\u548c\u7533\u8bf7\u3002"
    },
    "TAN Registration": {
        "en": "Assistance with Tax Deduction Account Number (TAN) registration for businesses.",
        "zh": "\u534f\u52a9\u529e\u7406\u4f01\u4e1a\u7684\u7a0e\u52a1\u6263\u9664\u8d26\u6237\u53f7(TAN)\u6ce8\u518c\u3002"
    },
    "GST Amendment": {
        "en": "Assistance with GST amendment, modification of registration details, and related compliance.",
        "zh": "\u534f\u52a9\u529e\u7406GST\u4fee\u6539\u3001\u6ce8\u518c\u4fe1\u606f\u53d8\u66f4\u53ca\u76f8\u5173\u5408\u89c4\u3002"
    },
    "GST Cancellation": {
        "en": "Assistance with voluntary or mandatory GST registration cancellation and final return filing.",
        "zh": "\u534f\u52a9\u529e\u7406\u81ea\u613f\u6216\u5f3a\u5236GST\u6ce8\u518c\u64a4\u9500\u53ca\u6700\u7ec8\u7533\u62a5\u3002"
    },
    "Health Trade Licence": {
        "en": "Assistance with health trade licence applications for food, pharmaceutical and healthcare businesses.",
        "zh": "\u534f\u52a9\u529e\u7406\u98df\u54c1\u3001\u533b\u836f\u548c\u533b\u7597\u4f01\u4e1a\u7684\u5065\u5eb7\u8d38\u6613\u8bb8\u53ef\u8bc1\u7533\u8bf7\u3002"
    },
    "Fire-related Local Permissions": {
        "en": "Assistance with fire safety NOCs, local municipal fire permissions and compliance certificates.",
        "zh": "\u534f\u52a9\u529e\u7406\u6d88\u9632\u5b89\u5168NOC\u3001\u5730\u65b9\u5e02\u653f\u6d88\u9632\u8bb8\u53ef\u548c\u5408\u89c4\u8bc1\u4e66\u3002"
    },
    "Trade Licence": {
        "en": "Assistance with trade licence applications from local municipal authorities.",
        "zh": "\u534f\u52a9\u529e\u7406\u5730\u65b9\u5e02\u653f\u5f53\u5c40\u7684\u8d38\u6613\u8bb8\u53ef\u8bc1\u7533\u8bf7\u3002"
    },
    "Municipal Licence": {
        "en": "Assistance with municipal trade licence and local body permission applications.",
        "zh": "\u534f\u52a9\u529e\u7406\u5e02\u653f\u8d38\u6613\u8bb8\u53ef\u8bc1\u548c\u5730\u65b9\u673a\u6784\u8bb8\u53ef\u7533\u8bf7\u3002"
    },
    "Local Business Permits": {
        "en": "Assistance with local business permits, shop establishment licences and trade permissions.",
        "zh": "\u534f\u52a9\u529e\u7406\u5730\u65b9\u5546\u4e1a\u8bb8\u53ef\u3001\u5546\u5e97\u8bbe\u7acb\u8bb8\u53ef\u8bc1\u548c\u8d38\u6613\u6743\u9650\u3002"
    },
    "Signboard Licence": {
        "en": "Assistance with signboard and advertisement licence applications from local authorities.",
        "zh": "\u534f\u52a9\u529e\u7406\u5f53\u5730\u5f53\u5c40\u7684\u62db\u724c\u548c\u5e7f\u544a\u8bb8\u53ef\u8bc1\u7533\u8bf7\u3002"
    },
    "FSSAI Registration": {
        "en": "FSSAI food safety registration and licensing for food businesses.",
        "zh": "\u98df\u54c1\u4f01\u4e1a\u7684FSSAI\u98df\u54c1\u5b89\u5168\u6ce8\u518c\u548c\u8bb8\u53ef\u3002"
    },
    "EPFO Registration": {
        "en": "EPFO employer registration for employee provident fund compliance.",
        "zh": "EPFO\u96c7\u4e3b\u6ce8\u518c\uff0c\u7528\u4e8e\u5458\u5de5\u516c\u79ef\u91d1\u5408\u89c4\u3002"
    },
    "ESIC Registration": {
        "en": "ESIC employer registration for employee state insurance compliance.",
        "zh": "ESIC\u96c7\u4e3b\u6ce8\u518c\uff0c\u7528\u4e8e\u5458\u5de5\u56fd\u5bb6\u4fdd\u9669\u5408\u89c4\u3002"
    },
    "PAN Card Registration": {
        "en": "Assistance with PAN card application and modification for businesses.",
        "zh": "\u534f\u52a9\u529e\u7406\u4f01\u4e1aPAN\u5361\u7533\u8bf7\u548c\u4fee\u6539\u3002"
    },
    "Factory Licence": {
        "en": "Factory licence registration and compliance for manufacturing units.",
        "zh": "\u5236\u9020\u5355\u4f4d\u7684\u5de5\u5382\u8bb8\u53ef\u8bc1\u6ce8\u518c\u548c\u5408\u89c4\u3002"
    },
    "Auto Component Certification": {
        "en": "Assistance with automotive component type approval and certification.",
        "zh": "\u534f\u52a9\u529e\u7406\u6c7d\u8f66\u96f6\u90e8\u4ef6\u578b\u5f0f\u6838\u51c6\u548c\u8ba4\u8bc1\u3002"
    },
    "Pollution Consent": {
        "en": "Assistance with pollution control board consent and environmental clearances.",
        "zh": "\u534f\u52a9\u529e\u7406\u6c61\u67d3\u63a7\u5236\u59d4\u5458\u4f1a\u8bb8\u548c\u73af\u5883\u6e05\u67d3\u3002"
    },
    "Other Entity Registration Services": {
        "en": "Assistance with other entity registration requirements based on your organization type.",
        "zh": "\u6839\u636e\u60a8\u7684\u7ec4\u7ec7\u7c7b\u578b\u534f\u52a9\u529e\u7406\u5176\u4ed6\u5b9e\u4f53\u6ce8\u518c\u8981\u6c42\u3002"
    },
}

def update_locale(path, lang):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    added = 0
    for name, translations in SERVICE_DESCS.items():
        key = f"opsSvcDesc_{slugify(name)}"
        if key not in data:
            data[key] = translations[lang]
            added += 1
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{path}: added {added} keys ({len(data)} total)')

update_locale('src/i18n/locales/zh.json', 'zh')
update_locale('src/i18n/locales/en-IN.json', 'en')
update_locale('src/i18n/locales/hi.json', 'en')  # English fallback for Hindi
