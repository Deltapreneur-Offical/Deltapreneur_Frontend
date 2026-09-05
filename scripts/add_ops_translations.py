#!/usr/bin/env python3
"""Add translation keys for Operations hub registrar category labels."""
import json

CATEGORY_KEYS = {
    'operationsCategoryBusinessEntity': {'en': 'Business / Entity Registration', 'zh': '\u4f01\u4e1a/\u5b9e\u4f53\u6ce8\u518c'},
    'operationsCategoryTaxIdentity': {'en': 'Tax and Identity', 'zh': '\u7a0e\u52a1\u548c\u8eab\u4efd'},
    'operationsCategoryLocalLicences': {'en': 'Local Licences', 'zh': '\u5730\u65b9\u8bb8\u53ef\u8bc1'},
    'operationsCategoryMsmeUdyam': {'en': 'MSME / Udyam', 'zh': 'MSME / \u4f26\u676f'},
    'operationsCategoryStartupDpiit': {'en': 'Startup / DPIIT Recognition', 'zh': '\u521d\u521b\u4f01\u4e1a/DPIIT\u8ba4\u8bc1'},
    'operationsCategoryFoodFssai': {'en': 'Food and FSSAI', 'zh': '\u98df\u54c1\u548cFSSAI'},
    'operationsCategoryImportExport': {'en': 'Import / Export', 'zh': '\u8fdb\u51fa\u53e3'},
    'operationsCategoryManufacturing': {'en': 'Manufacturing', 'zh': '\u5236\u9020\u4e1a'},
    'operationsCategoryTechnologySaas': {'en': 'Technology / SaaS / IT', 'zh': '\u6280\u672f/SaaS/IT'},
    'operationsCategoryEcommerce': {'en': 'E-commerce', 'zh': '\u7535\u5b50\u5546\u52a1'},
    'operationsCategoryFintech': {'en': 'Financial / FinTech', 'zh': '\u91d1\u878d/Fintech'},
    'operationsCategoryAviation': {'en': 'Aviation', 'zh': '\u822a\u7a7a'},
    'operationsCategoryConstruction': {'en': 'Construction / Real Estate', 'zh': '\u5efa\u7b51/\u623f\u5730\u4ea7'},
    'operationsCategoryHealthcare': {'en': 'Healthcare', 'zh': '\u533b\u7597\u5065\u5eb7'},
    'operationsCategoryEducation': {'en': 'Education', 'zh': '\u6559\u80b2'},
    'operationsCategoryProfessionalServices': {'en': 'Professional Services', 'zh': '\u4e13\u4e1a\u670d\u52a1'},
    'operationsCategoryTelecom': {'en': 'Telecom / Communications', 'zh': '\u7535\u4fe1/\u901a\u4fe1'},
    'operationsCategoryPharmaChemical': {'en': 'Pharmaceutical / Chemical', 'zh': '\u533b\u836f/\u5316\u5de5'},
    'operationsCategoryAutomotive': {'en': 'Automotive', 'zh': '\u6c7d\u8f66'},
    'operationsCategoryAgriculture': {'en': 'Agriculture', 'zh': '\u519c\u4e1a'},
    'operationsCategoryLogistics': {'en': 'Logistics / Transport', 'zh': '\u7269\u6d41/\u8fd0\u8f93'},
    'operationsCategoryTourism': {'en': 'Tourism / Hospitality', 'zh': '\u65c5\u6e38/\u65c5\u9986\u4e1a'},
    'operationsCategoryEntertainment': {'en': 'Entertainment / Media', 'zh': '\u5a31\u4e50/\u5a92\u4f53'},
    'operationsCategoryEnergy': {'en': 'Energy / Solar / Power', 'zh': '\u80fd\u6e90/\u592a\u9633\u80fd/\u7535\u529b'},
    'operationsCategoryDefence': {'en': 'Defence / Aerospace', 'zh': '\u56fd\u9632/\u822a\u5929'},
    'operationsCategoryIntellectualProperty': {'en': 'Intellectual Property', 'zh': '\u77e5\u8bc6\u4ea7\u6743'},
    'operationsCategoryEmployerLabour': {'en': 'Employer / Labour', 'zh': '\u96c7\u4e3b/\u52b3\u52a8'},
    'operationsCategoryEnvironmental': {'en': 'Environmental', 'zh': '\u73af\u5883'},
    'operationsCategoryDigitalServices': {'en': 'Digital Services', 'zh': '\u6570\u5b57\u670d\u52a1'},
    'operationsCategoryOther': {'en': 'Other', 'zh': '\u5176\u4ed6'},
    'operationsCategoryHubRegistrar': {'en': 'DELTA REGISTRAR', 'zh': 'DELTA REGISTRAR'},
    'operationsCategoryMarketing': {'en': 'Marketing', 'zh': '\u8425\u9500'},
    'operationsCategoryTechnology': {'en': 'Developers', 'zh': '\u5f00\u53d1\u8005'},
    'operationsCategorySales': {'en': 'Sales', 'zh': '\u9500\u552e'},
    'operationsCategoryFinance': {'en': 'Finance', 'zh': '\u8d22\u52a1'},
    'operationsCategoryPeopleHr': {'en': 'People & HR', 'zh': '\u4eba\u4e8b&HR'},
    'operationsCategorySupport': {'en': 'Support', 'zh': '\u652f\u6301'},
    'operationsCategoryCreative': {'en': 'Creative', 'zh': '\u521b\u610f'},
    'operationsCategoryGrowth': {'en': 'Growth', 'zh': '\u589e\u957f'},
    'operationsCategoryOperations': {'en': 'Operations', 'zh': '\u8fd0\u8425'},
}

# Also add descriptions for the seed services
SVC_DESC_KEYS = {
    'opsSvcDesc_GST_Registration': {'en': 'End-to-end GST registration support for your business.', 'zh': '\u4e3a\u60a8\u7684\u4f01\u4e1a\u63d0\u4f9b\u7aef\u5230\u7aef\u7684GST\u6ce8\u518c\u652f\u6301\u3002'},
    'opsSvcDesc_Trademark_Registration': {'en': 'Protect your brand with trademark registration assistance.', 'zh': '\u901a\u8fc7\u5546\u6807\u6ce8\u518c\u5e2e\u52a9\u4fdd\u62a4\u60a8\u7684\u54c1\u724c\u3002'},
    'opsSvcDesc_Company_Registration': {'en': 'Company, LLP, or proprietorship incorporation support.', 'zh': '\u516c\u53f8\u3001LLP\u6216\u4e2a\u4f53\u5de5\u5546\u6ce8\u518c\u652f\u6301\u3002'},
    'opsSvcDesc_Udyam_Registration': {'en': 'MSME Udyam registration for government benefits and recognition.', 'zh': '\u7533\u8bf7MSME\u4f26\u676f\u6ce8\u518c\uff0c\u83b7\u53d6\u653f\u5e9c\u4f18\u60e0\u548c\u8ba4\u53ef\u3002'},
    'opsSvcDesc_Website_Development': {'en': 'Professional website development for your business presence.', 'zh': '\u4e3a\u60a8\u7684\u4f01\u4e1a\u63d0\u4f9b\u4e13\u4e1a\u7f51\u7ad9\u5f00\u53d1\u670d\u52a1\u3002'},
    'opsSvcDesc_IEC_Registration': {'en': 'Import Export Code registration for international trade.', 'zh': '\u8fdb\u51fa\u53e3\u7ecf\u8425\u6743\u7533\u8bf7\uff0c\u652f\u6301\u56fd\u9645\u8d38\u6613\u3002'},
    'opsSvcDesc_DSC_Registration': {'en': 'Digital Signature Certificate for secure online filings.', 'zh': '\u7535\u5b50\u7b7e\u540d\u8bc1\u4e66\uff0c\u7528\u4e8e\u5b89\u5168\u7684\u7ebf\u4e0a\u7533\u62a5\u3002'},
    'opsSvcDesc_Professional_Tax': {'en': 'Professional tax registration and compliance support.', 'zh': '\u4e13\u4e1a\u7a0e\u6ce8\u518c\u548c\u5408\u89c4\u652f\u6301\u3002'},
    'opsSvcDesc_Startup_India': {'en': 'Startup India recognition and registration assistance.', 'zh': 'Startup India\u8ba4\u8bc1\u548c\u6ce8\u518c\u534f\u52a9\u3002'},
}

def update_locale(locale_path, updates, lang_code):
    with open(locale_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    added = 0
    for key, values in updates.items():
        if key not in data:
            data[key] = values[lang_code]
            added += 1
    with open(locale_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f'{locale_path}: added {added} keys ({len(data)} total)')

all_keys = {**CATEGORY_KEYS, **SVC_DESC_KEYS}
update_locale('src/i18n/locales/zh.json', all_keys, 'zh')
update_locale('src/i18n/locales/en-IN.json', all_keys, 'en')

# Also add to hi.json
HINDI = {}
for k, v in all_keys.items():
    HINDI[k] = v['en']  # Use English as placeholder for Hindi
update_locale('src/i18n/locales/hi.json', HINDI, 'en')
