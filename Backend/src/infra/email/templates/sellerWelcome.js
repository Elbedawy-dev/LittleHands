export const sellerWelcome = {
  key: 'seller-welcome',
  subject: {
    ar: 'مرحباً بكِ كبائعة حرفية في منصة أيدي صغيرة',
    en: 'Welcome as an artisan seller to Little Hands',
  },
  html: `<!DOCTYPE html>
<html dir="{{dir}}" lang="{{lang}}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF8F0; font-family: 'Cairo', Tahoma, Arial, sans-serif; direction: {{dir}}; text-align: {{align}}; color: #2D2522;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF8F0; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #FFE8D6; box-shadow: 0 4px 16px rgba(154, 70, 0, 0.06);">
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border-bottom: 2px solid #FED7AA;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="{{align}}" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px; padding-right: 12px;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #EA580C 0%, #F97316 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            ✨
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #9A3412; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #C2410C; margin-top: 2px;">انضمام بائعة حرفية جديدة</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: #EA580C; color: #ffffff; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      أهلاً بكِ معنا
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #9A3412; margin-bottom: 8px;">
                أهلاً بكِ يا {{name}} في عائلة «أيدي صغيرة» 🌸
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                يسعدنا جداً انضمامكِ كإحدى البائعات والحرفيات المتميزات في منصتنا المتخصصة في نشر الوسائل التعليمية اليدوية لرياض الأطفال والحضانات. تم إنشاء حسابكِ بنجاح، وبيانات تسجيل الدخول المؤقتة هي:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #FAF6F0; border-radius: 14px; overflow: hidden;">
                <tbody>
                  <tr style="border-bottom: 1px solid #E8E1DA;">
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">البريد الإلكتروني:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #2D2522;">{{email}}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 13px; color: #564338;">كلمة المرور المؤقتة:</td>
                    <td align="{{oppositeAlign}}" style="padding: 12px 16px; font-size: 14px; font-family: monospace; font-weight: bold; color: #9A3412;">{{tempPassword}}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <div style="background-color: #FFF7ED; border-radius: 12px; border: 1px solid #FED7AA; padding: 14px; font-size: 12px; color: #9A3412; line-height: 1.8;">
                ⚠️ لأمان حسابكِ، يرجى تسجيل الدخول وتغيير كلمة المرور المؤقتة فوراً من إعدادات الملف الشخصي.
              </div>
            </td>
          </tr>
          {{#if loginUrl}}
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="{{loginUrl}}" style="display: inline-block; padding: 14px 36px; background-color: #EA580C; color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: bold;">
                تسجيل الدخول إلى لوحة البائعة
              </a>
            </td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              {{#if hasSupport}}
              <p style="font-size: 12px; color: #6E5C53; margin: 0 0 8px 0;">
                لأي استفسار أو مساعدة، تواصلوا معنا:
                {{#if supportPhone}}<strong dir="ltr" style="unicode-bidi: isolate; color: #9A4600;">{{supportPhone}}</strong>{{/if}}
                {{#if supportEmail}}أو البريد: <strong style="color: #9A4600;">{{supportEmail}}</strong>{{/if}}
              </p>
              {{/if}}
              <p style="font-size: 11px; color: #8A776D; margin: 0;">
                أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  text: `مرحباً بكِ كبائعة حرفية في منصة أيدي صغيرة

أهلاً بكِ يا {{name}}،
تم إنشاء حساب البائعة الخاص بكِ بنجاح.

البريد الإلكتروني: {{email}}
كلمة المرور المؤقتة: {{tempPassword}}

يرجى تسجيل الدخول وتغيير كلمة المرور المؤقتة فوراً:
{{loginUrl}}

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default sellerWelcome
