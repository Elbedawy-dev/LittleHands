export const verifyEmail = {
  key: 'verify-email',
  subject: {
    ar: 'رمز تأكيد البريد الإلكتروني — أيدي صغيرة',
    en: 'Email Verification Code — Little Hands',
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
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #FFF5EA 0%, #FFEEDD 100%); border-bottom: 2px solid #FFD8BA;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="{{align}}" style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-left: 12px; padding-right: 12px;">
                          <div style="width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, #FF8A3D 0%, #FFD23F 100%); color: #ffffff; font-size: 22px; font-weight: bold; text-align: center; line-height: 44px;">
                            ص
                          </div>
                        </td>
                        <td style="vertical-align: middle;">
                          <div style="font-size: 20px; font-weight: 800; color: #9A4600; line-height: 1.2;">أيدي صغيرة</div>
                          <div style="font-size: 11px; color: #6E5C53; margin-top: 2px;">تأكيد الحساب</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="{{oppositeAlign}}" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 6px 14px; background-color: rgba(255, 138, 61, 0.15); color: #9A4600; border-radius: 9999px; font-size: 11px; font-weight: bold;">
                      رمز التأكيد
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 16px 32px;">
              <div style="font-size: 18px; font-weight: 800; color: #2D2522; margin-bottom: 8px;">
                أهلاً بكِ {{name}} 🌸
              </div>
              <p style="font-size: 14px; line-height: 1.8; color: #564338; margin: 0 0 16px 0;">
                شكراً لانضمامكِ لمنصة <strong>«أيدي صغيرة»</strong> للوسائل التعليمية اليدوية. يرجى استخدام رمز التأكيد التالي لتفعيل بريدكِ الإلكتروني:
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px;" align="center">
              <div style="display: inline-block; padding: 18px 40px; background-color: #FFF5EA; border-radius: 16px; border: 2px dashed #FF8A3D; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #9A4600; font-family: monospace;">
                {{code}}
              </div>
              <p style="font-size: 12px; color: #8A776D; margin-top: 12px;">
                صلاحية هذا الرمز هي 10 دقائق فقط. لا تشاركي هذا الرمز مع أي شخص.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #FAF6F0; border-top: 1px solid #EFE6D8; text-align: center;">
              {{#if hasSupport}}
              <p style="font-size: 12px; color: #6E5C53; margin: 0 0 8px 0;">
                لأي مساعدة، تواصلوا معنا:
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
  text: `رمز تأكيد البريد الإلكتروني — أيدي صغيرة

أهلاً بكِ {{name}}،
رمز تأكيد بريدكِ الإلكتروني هو:
{{code}}

صلاحية هذا الرمز هي 10 دقائق فقط.

أيدي صغيرة — وسائل تعليمية يدوية لرياض الأطفال والحضانات`,
}

export default verifyEmail
