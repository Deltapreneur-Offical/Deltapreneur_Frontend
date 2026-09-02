#!/usr/bin/env python3
"""Add operations service description translation keys."""
import json, os, re

locales_dir = 'src/i18n/locales'

services = {
    "GST Registration": "End-to-end GST registration support for your business.",
    "Trademark Registration": "Protect your brand with trademark registration assistance.",
    "Company / LLP / Proprietorship Registration": "Company, LLP, or proprietorship incorporation support.",
    "Udyam Registration": "MSME Udyam registration for government benefits and recognition.",
    "Website Development": "Professional website development for your business presence.",
    "Import Export Code (IEC) Registration": "Import Export Code registration for international trade.",
    "Digital Signature Certificate": "Digital Signature Certificate for secure online filings.",
    "Professional Tax Registration": "Professional tax registration and compliance support.",
    "Startup India Registration": "Startup India recognition and registration assistance.",
    "FSSAI Registration": "FSSAI food safety registration and licensing for food businesses.",
    "PAN Card Registration": "PAN card application and correction services.",
    "TAN Registration": "TAN registration for tax deduction at source compliance.",
    "Trade Licence": "Local trade licence registration for your business.",
    "Municipal Licence": "Municipal corporation licence for commercial operations.",
    "Local Business Permits": "Local business permits and NOC requirements.",
    "Signboard Licence": "Signboard and advertisement licence from local authorities.",
    "Pollution Consent": "Pollution control board consent and clearance.",
    "Factory Licence": "Factory licence registration under the Factories Act.",
    "Shops & Establishment Registration": "Shops and Establishment Act registration for commercial premises.",
    "EPFO Registration": "Employees Provident Fund Organisation registration.",
    "ESIC Registration": "Employees State Insurance Corporation registration.",
    "Professional Services": "Practice setup for CAs, lawyers, doctors, architects, and consultants.",
    "Other Entity Registration Services": "Assistance with other entity registration requirements based on your organization type and needs.",
}

def slugify_name(name):
    s = name.replace(' ', '_').replace('/', '_').replace('&', 'and').replace('(', '').replace(')', '').replace(',', '')
    s = re.sub(r'_+', '_', s).strip('_')
    return s

zh_map = {
    "End-to-end GST registration support for your business.": "为您的企业提供端到端的GST注册支持。",
    "Protect your brand with trademark registration assistance.": "通过商标注册协助保护您的品牌。",
    "Company, LLP, or proprietorship incorporation support.": "公司、有限责任合伙或独资企业注册支持。",
    "MSME Udyam registration for government benefits and recognition.": "中小微企业Udyam注册，获取政府福利和认可。",
    "Professional website development for your business presence.": "为您的企业打造专业网站。",
    "Import Export Code registration for international trade.": "进出口代码注册，用于国际贸易。",
    "Digital Signature Certificate for secure online filings.": "用于安全在线申报的数字签名证书。",
    "Professional tax registration and compliance support.": "专业税注册和合规支持。",
    "Startup India recognition and registration assistance.": "Startup India认证和注册协助。",
    "FSSAI food safety registration and licensing for food businesses.": "食品企业FSSAI食品安全注册和许可。",
    "PAN card application and correction services.": "PAN卡申请和更正服务。",
    "TAN registration for tax deduction at source compliance.": "TAN注册，用于源头扣税合规。",
    "Local trade licence registration for your business.": "您的企业本地贸易许可证注册。",
    "Municipal corporation licence for commercial operations.": "市政公司商业运营许可证。",
    "Local business permits and NOC requirements.": "本地商业许可证和NOC要求。",
    "Signboard and advertisement licence from local authorities.": "从当地当局获取招牌和广告许可证。",
    "Pollution control board consent and clearance.": "污染控制委员会同意和清关。",
    "Factory licence registration under the Factories Act.": "根据工厂法进行工厂许可证注册。",
    "Shops and Establishment Act registration for commercial premises.": "商业场所的商店和建立法登记。",
    "Employees Provident Fund Organisation registration.": "雇员公积金组织注册。",
    "Employees State Insurance Corporation registration.": "雇员国家保险公司注册。",
    "Practice setup for CAs, lawyers, doctors, architects, and consultants.": "为注册会计师、律师、医生、建筑师和顾问提供执业设立服务。",
    "Assistance with other entity registration requirements based on your organization type and needs.": "根据您的组织类型和需求，提供其他实体注册要求的协助。",
}

hi_map = {
    "End-to-end GST registration support for your business.": "आपके व्यवसाय के लिए एंड-टू-एंड GST पंजीकरण सहायता।",
    "Protect your brand with trademark registration assistance.": "ट्रेडमार्क पंजीकरण सहायता से अपने ब्रांड की रक्षा करें।",
    "Company, LLP, or proprietorship incorporation support.": "कंपनी, LLP, या स्वामित्व निगमन समर्थन।",
    "MSME Udyam registration for government benefits and recognition.": "सरकारी लाभ और मान्यता के लिए MSME Udyam पंजीकरण।",
    "Professional website development for your business presence.": "आपके व्यवसाय की उपस्थिति के लिए पेशेवर वेबसाइट विकास।",
    "Import Export Code registration for international trade.": "अंतर्राष्ट्रीय व्यापार के लिए आयात निर्यात कोड पंजीकरण।",
    "Digital Signature Certificate for secure online filings.": "सुरक्षित ऑनलाइन फाइलिंग के लिए डिजिटल सिग्नेचर प्रमाणपत्र।",
    "Professional tax registration and compliance support.": "पेशेवर कर पंजीकरण और अनुपालन सहायता।",
    "Startup India recognition and registration assistance.": "Startup India मान्यता और पंजीकरण सहायता।",
    "Assistance with other entity registration requirements based on your organization type and needs.": "आपके संगठन के प्रकार और आवश्यकताओं के आधार पर अन्य संस्था पंजीकरण आवश्यकताओं में सहायता।",
}

en_keys = {}
zh_keys = {}
hi_keys = {}
for name, desc in services.items():
    slug = slugify_name(name)
    key = f'opsSvcDesc_{slug}'
    en_keys[key] = desc
    zh_keys[key] = zh_map.get(desc, desc)
    hi_keys[key] = hi_map.get(desc, desc)

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

with open('src/i18n/locales/en-IN.json', 'r', encoding='utf-8') as f:
    en = json.load(f)
print(f'\nFinal en-IN: {len(en)} keys')
